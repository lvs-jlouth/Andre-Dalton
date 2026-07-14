import { getDefaultSpeechProfile, parseSpeechProfile, type SpeechProfile } from './speechProfile.js';
import { getEnv } from '../utils/env.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('service:user-settings-store');

export interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  fontScale: number;
  captions: boolean;
  onHandedLayout: 'none' | 'left' | 'right';
  keyboardNavigation: boolean;
  largeHitTargets: boolean;
}

export interface PrivacySettings {
  persistTranscripts: boolean;
  consentSpeechImprovement: boolean;
  debugMode: boolean;
  m365ContextEnabled: boolean;
}

export interface UserSettingsDocument {
  speechProfile: SpeechProfile;
  accessibility: AccessibilitySettings;
  privacy: PrivacySettings;
  updatedAt: string;
}

const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  reducedMotion: false,
  highContrast: false,
  largeText: false,
  fontScale: 1.0,
  captions: true,
  onHandedLayout: 'none',
  keyboardNavigation: true,
  largeHitTargets: true,
};

const DEFAULT_PRIVACY: PrivacySettings = {
  persistTranscripts: false,
  consentSpeechImprovement: false,
  debugMode: false,
  m365ContextEnabled: false,
};

function defaultDocument(): UserSettingsDocument {
  return {
    speechProfile: getDefaultSpeechProfile(),
    accessibility: { ...DEFAULT_ACCESSIBILITY },
    privacy: { ...DEFAULT_PRIVACY },
    updatedAt: new Date().toISOString(),
  };
}

function normalizeUserKey(userKey: string): string {
  return userKey.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 128) || 'unknown-user';
}

function mergeDocument(raw: Partial<UserSettingsDocument> | undefined): UserSettingsDocument {
  const base = defaultDocument();
  return {
    speechProfile: parseSpeechProfile(raw?.speechProfile ?? base.speechProfile),
    accessibility: {
      ...base.accessibility,
      ...(raw?.accessibility ?? {}),
    },
    privacy: {
      ...base.privacy,
      ...(raw?.privacy ?? {}),
    },
    updatedAt: raw?.updatedAt ?? new Date().toISOString(),
  };
}

// ─── Azure Blob Storage backend ──────────────────────────────────────────────

async function getBlobClient(userKey: string) {
  const env = getEnv();
  if (!env.AZURE_STORAGE_ACCOUNT_NAME) {
    throw new Error('AZURE_STORAGE_ACCOUNT_NAME is not configured');
  }

  // Lazy import so the package is only loaded when blob storage is actually used
  const { BlobServiceClient } = await import('@azure/storage-blob');
  const { ManagedIdentityCredential, DefaultAzureCredential } = await import('@azure/identity');

  const accountName = env.AZURE_STORAGE_ACCOUNT_NAME;
  const url = `https://${accountName}.blob.core.windows.net`;

  // Use user-assigned managed identity when AZURE_CLIENT_ID is set (Azure App Service),
  // otherwise fall back to DefaultAzureCredential (local dev via az login).
  const credential = process.env['AZURE_CLIENT_ID']
    ? new ManagedIdentityCredential(process.env['AZURE_CLIENT_ID'])
    : new DefaultAzureCredential();

  const blobService = new BlobServiceClient(url, credential);
  const containerClient = blobService.getContainerClient('user-settings');
  const safeName = normalizeUserKey(userKey);
  return containerClient.getBlockBlobClient(`${safeName}.json`);
}

async function loadFromBlob(userKey: string): Promise<UserSettingsDocument> {
  const blobClient = await getBlobClient(userKey);
  const exists = await blobClient.exists();
  if (!exists) return defaultDocument();

  const download = await blobClient.downloadToBuffer();
  const json = JSON.parse(download.toString('utf-8')) as Partial<UserSettingsDocument>;
  return mergeDocument(json);
}

async function saveToBlob(userKey: string, doc: UserSettingsDocument): Promise<void> {
  const blobClient = await getBlobClient(userKey);
  const content = JSON.stringify(doc);
  await blobClient.upload(content, Buffer.byteLength(content), {
    blobHTTPHeaders: { blobContentType: 'application/json' },
  });
}

// ─── Legacy SharePoint / Graph backend (fallback when blob not configured) ────

async function getGraphToken(): Promise<string> {
  const env = getEnv();
  if (!env.GRAPH_TENANT_ID || !env.GRAPH_CLIENT_ID || !env.GRAPH_CLIENT_SECRET) {
    throw new Error('Neither blob storage nor Graph app credentials are configured');
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.GRAPH_CLIENT_ID,
    client_secret: env.GRAPH_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
  });

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${env.GRAPH_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10000),
    },
  );

  if (!tokenRes.ok) throw new Error(`Graph token request failed: ${tokenRes.status}`);
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) throw new Error('Graph token response missing access_token');
  return tokenJson.access_token;
}

function graphContentUrl(userKey: string): string {
  const env = getEnv();
  if (!env.SHAREPOINT_SITE_ID) throw new Error('SHAREPOINT_SITE_ID is not configured');
  const safeUser = normalizeUserKey(userKey);
  const safeFolder = env.SHAREPOINT_SETTINGS_FOLDER.replace(/^\/*/, '').replace(/\/*$/, '');
  return `https://graph.microsoft.com/v1.0/sites/${env.SHAREPOINT_SITE_ID}/drive/root:/${safeFolder}/${safeUser}.json:/content`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function loadUserSettings(userKey: string): Promise<UserSettingsDocument> {
  const env = getEnv();
  try {
    if (env.AZURE_STORAGE_ACCOUNT_NAME) {
      return await loadFromBlob(userKey);
    }
    // Legacy SharePoint fallback
    const token = await getGraphToken();
    const url = graphContentUrl(userKey);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 404) return defaultDocument();
    if (!res.ok) throw new Error(`Graph read failed: ${res.status}`);
    const json = (await res.json()) as Partial<UserSettingsDocument>;
    return mergeDocument(json);
  } catch (err) {
    log.warn('Falling back to defaults for user settings load', err);
    return defaultDocument();
  }
}

export async function saveUserSettings(
  userKey: string,
  doc: UserSettingsDocument,
): Promise<UserSettingsDocument> {
  const env = getEnv();
  const merged = mergeDocument({ ...doc, updatedAt: new Date().toISOString() });

  if (env.AZURE_STORAGE_ACCOUNT_NAME) {
    await saveToBlob(userKey, merged);
    return merged;
  }

  // Legacy SharePoint fallback
  const token = await getGraphToken();
  const url = graphContentUrl(userKey);
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(merged),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Graph write failed: ${res.status}`);
  return merged;
}

export function getDefaultUserSettings(): UserSettingsDocument {
  return defaultDocument();
}
