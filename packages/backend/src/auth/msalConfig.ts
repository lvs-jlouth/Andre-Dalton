/**
 * Microsoft Entra ID (Azure AD) configuration for the backend.
 * Uses MSAL Node for Confidential Client flows (token validation, OBO).
 */
import { ConfidentialClientApplication, Configuration, LogLevel } from '@azure/msal-node';
import { getEnv } from '../utils/env.js';

let _msalInstance: ConfidentialClientApplication | null = null;

export function getMsalConfig(): Configuration {
  const env = getEnv();

  return {
    auth: {
      clientId: env.ENTRA_CLIENT_ID!,
      authority: `https://login.microsoftonline.com/${env.ENTRA_TENANT_ID}`,
      clientSecret: env.ENTRA_CLIENT_SECRET,
    },
    system: {
      loggerOptions: {
        loggerCallback: (_level, message) => {
          if (env.DEBUG_MODE) {
            console.log('[MSAL]', message);
          }
        },
        logLevel: LogLevel.Warning,
        piiLoggingEnabled: false,
      },
    },
  };
}

export function getMsalInstance(): ConfidentialClientApplication {
  if (!_msalInstance) {
    _msalInstance = new ConfidentialClientApplication(getMsalConfig());
  }
  return _msalInstance;
}

/** Microsoft Graph API scopes required by J.A.R.G.I.I.N. */
export const GRAPH_SCOPES = {
  /** Basic user profile */
  USER_READ: 'User.Read',
  /** OneDrive file access */
  FILES_READ_WRITE: 'Files.ReadWrite',
  /** Office document operations */
  FILES_READ_WRITE_ALL: 'Files.ReadWrite.All',
  /** Mail read/send */
  MAIL_READ_WRITE: 'Mail.ReadWrite',
  MAIL_SEND: 'Mail.Send',
  /** Calendar */
  CALENDARS_READ_WRITE: 'Calendars.ReadWrite',
  /** Teams presence and messaging */
  CHAT_READ_WRITE: 'Chat.ReadWrite',
  PRESENCE_READ: 'Presence.Read',
  /** Offline access (refresh tokens) */
  OFFLINE_ACCESS: 'offline_access',
} as const;

/** Default scopes requested at login */
export const DEFAULT_LOGIN_SCOPES = [
  GRAPH_SCOPES.USER_READ,
  GRAPH_SCOPES.FILES_READ_WRITE,
  GRAPH_SCOPES.OFFLINE_ACCESS,
];

/** All scopes for full Office 365 integration */
export const FULL_INTEGRATION_SCOPES = [
  ...DEFAULT_LOGIN_SCOPES,
  GRAPH_SCOPES.FILES_READ_WRITE_ALL,
  GRAPH_SCOPES.MAIL_READ_WRITE,
  GRAPH_SCOPES.MAIL_SEND,
  GRAPH_SCOPES.CALENDARS_READ_WRITE,
  GRAPH_SCOPES.CHAT_READ_WRITE,
  GRAPH_SCOPES.PRESENCE_READ,
];
