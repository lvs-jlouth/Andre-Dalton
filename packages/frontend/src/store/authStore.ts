/**
 * Auth store — manages Entra ID authentication state with Zustand.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../services/auth/authService.js';
import {
  login as msalLogin,
  logout as msalLogout,
  getActiveAccount,
  accountToUser,
  getGraphToken,
} from '../services/auth/authService.js';
import { isEntraConfigured } from '../services/auth/msalConfig.js';

export interface AuthState {
  /** Whether Entra ID is configured via environment variables */
  isConfigured: boolean;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether auth is being processed */
  isLoading: boolean;
  /** The authenticated user */
  user: AuthUser | null;
  /** Error from last auth operation */
  error: string | null;

  /** Initialize auth state (check for existing session) */
  initialize: () => Promise<void>;
  /** Sign in with Entra ID */
  signIn: (usePopup?: boolean) => Promise<void>;
  /** Sign out */
  signOut: () => Promise<void>;
  /** Get a fresh access token for API calls */
  getAccessToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isConfigured: isEntraConfigured(),
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,

      initialize: async () => {
        if (!get().isConfigured) return;

        set({ isLoading: true, error: null });
        try {
          const account = await getActiveAccount();
          if (account) {
            set({
              isAuthenticated: true,
              user: accountToUser(account),
              isLoading: false,
            });
          } else {
            set({ isAuthenticated: false, user: null, isLoading: false });
          }
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Auth initialization failed',
          });
        }
      },

      signIn: async (usePopup = true) => {
        set({ isLoading: true, error: null });
        try {
          const result = await msalLogin(usePopup);
          if (result?.account) {
            set({
              isAuthenticated: true,
              user: accountToUser(result.account),
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Sign-in failed',
          });
        }
      },

      signOut: async () => {
        set({ isLoading: true });
        try {
          await msalLogout();
          set({ isAuthenticated: false, user: null, isLoading: false, error: null });
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Sign-out failed',
          });
        }
      },

      getAccessToken: async () => {
        try {
          return await getGraphToken();
        } catch {
          return null;
        }
      },
    }),
    {
      name: 'jargiin-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    },
  ),
);
