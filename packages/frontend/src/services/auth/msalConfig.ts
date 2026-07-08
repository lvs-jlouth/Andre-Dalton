/**
 * MSAL Browser configuration for Entra ID authentication.
 * Handles login, token acquisition, and silent refresh on the frontend.
 */
import { PublicClientApplication, Configuration, LogLevel } from '@azure/msal-browser';

// These are injected via environment variables at build time (Vite)
const ENTRA_CLIENT_ID = import.meta.env.VITE_ENTRA_CLIENT_ID ?? '';
const ENTRA_TENANT_ID = import.meta.env.VITE_ENTRA_TENANT_ID ?? '';
const ENTRA_REDIRECT_URI = import.meta.env.VITE_ENTRA_REDIRECT_URI ?? 'http://localhost:5173/auth/callback';

export const msalConfig: Configuration = {
  auth: {
    clientId: ENTRA_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${ENTRA_TENANT_ID}`,
    redirectUri: ENTRA_REDIRECT_URI,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
  },
  system: {
    loggerOptions: {
      loggerCallback: (_level, message) => {
        if (import.meta.env.DEV) {
          console.debug('[MSAL]', message);
        }
      },
      logLevel: LogLevel.Warning,
      piiLoggingEnabled: false,
    },
  },
};

/** Microsoft Graph API scopes for J.A.R.G.I.I.N. */
export const LOGIN_SCOPES = {
  /** Basic profile access */
  basic: ['User.Read', 'openid', 'profile', 'email', 'offline_access'],
  /** OneDrive file access */
  files: ['Files.ReadWrite', 'Files.ReadWrite.All'],
  /** Mail access */
  mail: ['Mail.ReadWrite', 'Mail.Send'],
  /** Calendar access */
  calendar: ['Calendars.ReadWrite'],
  /** Teams access */
  teams: ['Chat.ReadWrite', 'Presence.Read'],
};

/** Combined scopes for full integration */
export const ALL_SCOPES = [
  ...LOGIN_SCOPES.basic,
  ...LOGIN_SCOPES.files,
  ...LOGIN_SCOPES.mail,
  ...LOGIN_SCOPES.calendar,
  ...LOGIN_SCOPES.teams,
];

let _msalInstance: PublicClientApplication | null = null;

/**
 * Get the singleton MSAL instance. Initializes on first call.
 */
export async function getMsalInstance(): Promise<PublicClientApplication> {
  if (!_msalInstance) {
    _msalInstance = new PublicClientApplication(msalConfig);
    await _msalInstance.initialize();
    // Handle redirect response if returning from login
    await _msalInstance.handleRedirectPromise();
  }
  return _msalInstance;
}

/**
 * Check if Entra ID is configured (environment variables are set).
 */
export function isEntraConfigured(): boolean {
  return !!(ENTRA_CLIENT_ID && ENTRA_TENANT_ID);
}
