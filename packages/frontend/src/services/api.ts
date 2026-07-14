/**
 * Frontend API client.
 * All LLM calls are proxied through the backend so API keys stay server-side.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const err = await res.json() as { error?: string };
      if (err.error) message = err.error;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ── Health ────────────────────────────────────────────────────────────────────

export function checkHealth() {
  return request<{ status: string; timestamp: string }>('/health');
}

// ── Providers ─────────────────────────────────────────────────────────────────

import type { ProviderInfo, AssistantRequest, AssistantResponse } from '../types/provider.js';

export function getProviders() {
  return request<{ providers: ProviderInfo[] }>('/providers');
}

export function testProvider(providerId: string) {
  return request<{ providerId: string; health: { status: string; latencyMs?: number } }>(
    '/providers/test',
    { method: 'POST', body: JSON.stringify({ providerId }) },
  );
}

// ── Assistant ─────────────────────────────────────────────────────────────────

export function sendMessage(req: AssistantRequest): Promise<AssistantResponse> {
  return request<AssistantResponse>('/assistant/message', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export function synthesizeSpeech(req: {
  text: string;
  voiceId?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}) {
  return request<{
    status: 'ok' | 'browser_tts';
    audioBase64?: string;
    mimeType?: string;
    message?: string;
  }>('/speech/speak', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

// ── Speech profile ────────────────────────────────────────────────────────────

import type { SpeechProfile } from '../types/speech.js';

export function getSpeechProfile() {
  return request<{ profile: SpeechProfile }>('/profile/speech');
}

export function updateSpeechProfile(profile: Partial<SpeechProfile>) {
  return request<{ profile: SpeechProfile; saved: boolean }>('/profile/speech', {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
}

// ── Accessibility settings ────────────────────────────────────────────────────

import type { AccessibilitySettings, UserConfigPayload } from '../types/settings.js';

export function getAccessibilitySettings() {
  return request<{ accessibility: AccessibilitySettings }>('/settings/accessibility');
}

export function updateAccessibilitySettings(settings: Partial<AccessibilitySettings>) {
  return request<{ accessibility: AccessibilitySettings }>('/settings/accessibility', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export function getUserConfig() {
  return request<UserConfigPayload>('/settings/user-config');
}

export function saveUserConfig(config: UserConfigPayload) {
  return request<{ saved: boolean } & UserConfigPayload>('/settings/user-config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

// ── M365 context ─────────────────────────────────────────────────────────────

export interface M365Context {
  upcomingEvents: { subject: string; start: string; end: string; location?: string; isOnline: boolean }[];
  recentEmails: { subject: string; from: string; receivedDateTime: string; bodyPreview: string; isRead: boolean }[];
  generatedAt: string;
}

export function getM365Context() {
  return request<{ available: boolean; context?: M365Context; reason?: string }>('/m365/context');
}

export function getM365Status() {
  return request<{ clientCredentials: boolean; blobStorage: boolean; note: string }>('/m365/status');
}
