/**
 * Office 365 client for the frontend.
 * Provides access to Mail, Calendar, Teams, and Documents via the backend API.
 */
import { useAuthStore } from '../../store/authStore.js';

const API_BASE = '/api/office';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await useAuthStore.getState().getAccessToken();
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ─── Mail ─────────────────────────────────────────────────────────────────────

export const mailClient = {
  async listMail(top = 10, folder = 'inbox') {
    const res = await fetch(`${API_BASE}/mail?top=${top}&folder=${folder}`, {
      headers: await authHeaders(),
    });
    return (await res.json()).messages;
  },

  async sendMail(message: {
    subject: string;
    body: string;
    to: string[];
    cc?: string[];
    isHtml?: boolean;
  }) {
    const formatted = {
      message: {
        subject: message.subject,
        body: { contentType: message.isHtml ? 'HTML' : 'Text', content: message.body },
        toRecipients: message.to.map((addr) => ({ emailAddress: { address: addr } })),
        ccRecipients: message.cc?.map((addr) => ({ emailAddress: { address: addr } })),
      },
    };
    const res = await fetch(`${API_BASE}/mail/send`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(formatted),
    });
    return res.json();
  },

  async searchMail(query: string, top = 10) {
    const res = await fetch(`${API_BASE}/mail/search?q=${encodeURIComponent(query)}&top=${top}`, {
      headers: await authHeaders(),
    });
    return (await res.json()).messages;
  },
};

// ─── Calendar ─────────────────────────────────────────────────────────────────

export const calendarClient = {
  async listEvents(startDate: string, endDate: string) {
    const res = await fetch(`${API_BASE}/calendar?start=${startDate}&end=${endDate}`, {
      headers: await authHeaders(),
    });
    return (await res.json()).events;
  },

  async createEvent(event: {
    subject: string;
    start: string;
    end: string;
    timeZone?: string;
    location?: string;
    attendees?: string[];
    body?: string;
  }) {
    const formatted = {
      subject: event.subject,
      start: { dateTime: event.start, timeZone: event.timeZone ?? 'UTC' },
      end: { dateTime: event.end, timeZone: event.timeZone ?? 'UTC' },
      location: event.location ? { displayName: event.location } : undefined,
      attendees: event.attendees?.map((addr) => ({
        emailAddress: { address: addr },
        type: 'required',
      })),
      body: event.body ? { contentType: 'HTML', content: event.body } : undefined,
    };
    const res = await fetch(`${API_BASE}/calendar`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(formatted),
    });
    return (await res.json()).event;
  },
};

// ─── Teams ────────────────────────────────────────────────────────────────────

export const teamsClient = {
  async listChats(top = 20) {
    const res = await fetch(`${API_BASE}/teams/chats?top=${top}`, {
      headers: await authHeaders(),
    });
    return (await res.json()).chats;
  },

  async sendMessage(chatId: string, content: string, isHtml = false) {
    const res = await fetch(`${API_BASE}/teams/chats/${chatId}/messages`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ content, contentType: isHtml ? 'html' : 'text' }),
    });
    return (await res.json()).message;
  },

  async getPresence() {
    const res = await fetch(`${API_BASE}/teams/presence`, {
      headers: await authHeaders(),
    });
    return (await res.json()).presence;
  },
};

// ─── Documents ────────────────────────────────────────────────────────────────

export const documentsClient = {
  async createWordDocument(fileName: string, content: string) {
    const res = await fetch(`${API_BASE}/documents/word`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ fileName, content }),
    });
    return (await res.json()).document;
  },

  async readExcelRange(itemId: string, worksheet: string, range: string) {
    const params = `worksheet=${encodeURIComponent(worksheet)}&range=${encodeURIComponent(range)}`;
    const res = await fetch(`${API_BASE}/documents/excel/${itemId}/range?${params}`, {
      headers: await authHeaders(),
    });
    return (await res.json()).values;
  },

  async writeExcelRange(itemId: string, worksheet: string, range: string, values: unknown[][]) {
    const res = await fetch(`${API_BASE}/documents/excel/${itemId}/range`, {
      method: 'PATCH',
      headers: await authHeaders(),
      body: JSON.stringify({ worksheet, range, values }),
    });
    return res.json();
  },
};
