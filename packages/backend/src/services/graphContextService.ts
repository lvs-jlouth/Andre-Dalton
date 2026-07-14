/**
 * Microsoft Graph context service — reads the authenticated user's M365 data
 * (calendar, email, files) to inject as context into the AI system prompt.
 *
 * Two auth modes:
 *   1. Delegated token  — when `x-ms-token-aad-access-token` is forwarded by the SWA
 *                         (requires the SWA app reg to have Graph delegated permissions)
 *   2. Client credentials — when M365_TENANT_ID / M365_CLIENT_ID / M365_CLIENT_SECRET
 *                           are set AND Graph application permissions have been admin-consented
 *
 * Both modes fall back gracefully — if neither is available, returns null.
 */
import { createLogger } from '../utils/logger.js';
import { getEnv } from '../utils/env.js';

const log = createLogger('service:graph-context');

export interface CalendarEvent {
  subject: string;
  start: string;
  end: string;
  location?: string;
  isOnline: boolean;
}

export interface MailMessage {
  subject: string;
  from: string;
  receivedDateTime: string;
  bodyPreview: string;
  isRead: boolean;
}

export interface M365Context {
  upcomingEvents: CalendarEvent[];
  recentEmails: MailMessage[];
  generatedAt: string;
}

// ─── Token acquisition ────────────────────────────────────────────────────────

async function getClientCredentialsToken(): Promise<string | null> {
  const env = getEnv();
  if (!env.M365_TENANT_ID || !env.M365_CLIENT_ID || !env.M365_CLIENT_SECRET) return null;

  try {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.M365_CLIENT_ID,
      client_secret: env.M365_CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
    });

    const res = await fetch(
      `https://login.microsoftonline.com/${env.M365_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { access_token?: string };
    return json.access_token ?? null;
  } catch {
    return null;
  }
}

// ─── Graph API helpers ────────────────────────────────────────────────────────

async function graphGet<T>(path: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ─── Data fetchers ─────────────────────────────────────────────────────────────

async function fetchCalendarEvents(
  token: string,
  userIdOrMe: string,
): Promise<CalendarEvent[]> {
  const now = new Date().toISOString();
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const path =
    `/${userIdOrMe}/calendarView` +
    `?startDateTime=${encodeURIComponent(now)}` +
    `&endDateTime=${encodeURIComponent(future)}` +
    `&$top=10&$orderby=start/dateTime` +
    `&$select=subject,start,end,location,isOnlineMeeting`;

  const data = await graphGet<{ value?: RawEvent[] }>(path, token);
  if (!data?.value) return [];

  return data.value.map((e) => ({
    subject: e.subject ?? '(No subject)',
    start: e.start?.dateTime ?? '',
    end: e.end?.dateTime ?? '',
    location: e.location?.displayName,
    isOnline: e.isOnlineMeeting ?? false,
  }));
}

async function fetchRecentEmails(
  token: string,
  userIdOrMe: string,
): Promise<MailMessage[]> {
  const path =
    `/${userIdOrMe}/messages` +
    `?$top=5&$orderby=receivedDateTime desc` +
    `&$filter=isDraft eq false` +
    `&$select=subject,from,receivedDateTime,bodyPreview,isRead`;

  const data = await graphGet<{ value?: RawMessage[] }>(path, token);
  if (!data?.value) return [];

  return data.value.map((m) => ({
    subject: m.subject ?? '(No subject)',
    from: m.from?.emailAddress?.name ?? m.from?.emailAddress?.address ?? 'Unknown',
    receivedDateTime: m.receivedDateTime ?? '',
    bodyPreview: (m.bodyPreview ?? '').slice(0, 200),
    isRead: m.isRead ?? true,
  }));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch M365 context for a user.
 *
 * @param delegatedToken  - access token from `x-ms-token-aad-access-token` header (preferred)
 * @param userObjectId    - Entra user OID, used when falling back to client credentials
 */
export async function fetchM365Context(
  delegatedToken: string | null,
  userObjectId: string | null,
): Promise<M365Context | null> {
  let token = delegatedToken;
  let userPath = 'me';

  if (!token) {
    // Attempt client credentials fallback (requires Application permissions + admin consent)
    token = await getClientCredentialsToken();
    if (!token || !userObjectId) return null;
    userPath = `users/${userObjectId}`;
  }

  try {
    const [events, emails] = await Promise.all([
      fetchCalendarEvents(token, userPath),
      fetchRecentEmails(token, userPath),
    ]);

    if (events.length === 0 && emails.length === 0) return null;

    return {
      upcomingEvents: events,
      recentEmails: emails,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    log.warn('Failed to fetch M365 context', err);
    return null;
  }
}

/**
 * Format M365 context into a concise system-prompt injection string.
 */
export function formatM365ContextForPrompt(ctx: M365Context): string {
  const lines: string[] = ['[M365 Context — today\'s snapshot for your reference]'];

  if (ctx.upcomingEvents.length > 0) {
    lines.push('\nUpcoming calendar events (next 7 days):');
    for (const evt of ctx.upcomingEvents) {
      const start = new Date(evt.start).toLocaleString('en-CA', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      const loc = evt.isOnline ? '(online)' : evt.location ? `@ ${evt.location}` : '';
      lines.push(`  • ${evt.subject} — ${start} ${loc}`.trimEnd());
    }
  }

  if (ctx.recentEmails.length > 0) {
    lines.push('\nRecent emails (unread first):');
    for (const msg of ctx.recentEmails) {
      const when = new Date(msg.receivedDateTime).toLocaleString('en-CA', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      const flag = msg.isRead ? '' : '● ';
      lines.push(`  • ${flag}From ${msg.from}: "${msg.subject}" (${when})`);
      if (msg.bodyPreview) lines.push(`    ${msg.bodyPreview}`);
    }
  }

  return lines.join('\n');
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface RawEvent {
  subject?: string;
  start?: { dateTime?: string };
  end?: { dateTime?: string };
  location?: { displayName?: string };
  isOnlineMeeting?: boolean;
}

interface RawMessage {
  subject?: string;
  from?: { emailAddress?: { name?: string; address?: string } };
  receivedDateTime?: string;
  bodyPreview?: string;
  isRead?: boolean;
}
