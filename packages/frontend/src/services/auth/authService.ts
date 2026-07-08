/**
 * Authentication service — handles Entra ID login/logout and token management.
 */
import type { AccountInfo, AuthenticationResult, SilentRequest } from '@azure/msal-browser';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { getMsalInstance, ALL_SCOPES, LOGIN_SCOPES } from './msalConfig.js';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  tenantId: string;
}

/**
 * Initiate interactive login with Entra ID.
 * Uses popup by default; falls back to redirect on mobile/restricted browsers.
 */
export async function login(usePopup = true): Promise<AuthenticationResult | null> {
  const msalInstance = await getMsalInstance();
  const loginRequest = { scopes: ALL_SCOPES };

  try {
    if (usePopup) {
      return await msalInstance.loginPopup(loginRequest);
    } else {
      await msalInstance.loginRedirect(loginRequest);
      return null; // Redirect will reload the page
    }
  } catch (error) {
    console.error('[Auth] Login failed:', error);
    throw error;
  }
}

/**
 * Log out the current user.
 */
export async function logout(): Promise<void> {
  const msalInstance = await getMsalInstance();
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    await msalInstance.logoutPopup({ account: accounts[0] });
  }
}

/**
 * Get the currently signed-in account, if any.
 */
export async function getActiveAccount(): Promise<AccountInfo | null> {
  const msalInstance = await getMsalInstance();
  const accounts = msalInstance.getAllAccounts();
  return accounts[0] ?? null;
}

/**
 * Acquire an access token silently (from cache or refresh).
 * Falls back to interactive if silent fails.
 */
export async function acquireToken(scopes?: string[]): Promise<string | null> {
  const msalInstance = await getMsalInstance();
  const account = await getActiveAccount();

  if (!account) return null;

  const request: SilentRequest = {
    scopes: scopes ?? LOGIN_SCOPES.basic,
    account,
  };

  try {
    const result = await msalInstance.acquireTokenSilent(request);
    return result.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      // Token expired or consent needed — trigger interactive
      const result = await msalInstance.acquireTokenPopup({ scopes: request.scopes });
      return result.accessToken;
    }
    console.error('[Auth] Token acquisition failed:', error);
    return null;
  }
}

/**
 * Get an access token for Microsoft Graph API operations.
 */
export async function getGraphToken(): Promise<string | null> {
  return acquireToken(ALL_SCOPES);
}

/**
 * Convert MSAL AccountInfo to our simplified AuthUser interface.
 */
export function accountToUser(account: AccountInfo): AuthUser {
  return {
    id: account.localAccountId,
    name: account.name ?? 'Unknown',
    email: account.username,
    tenantId: account.tenantId,
  };
}
