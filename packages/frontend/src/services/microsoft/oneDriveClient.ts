/**
 * OneDrive client for the frontend.
 * Handles file operations against the backend storage API.
 */
import { useAuthStore } from '../../store/authStore.js';

const API_BASE = '/api/storage';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await useAuthStore.getState().getAccessToken();
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export const oneDriveClient = {
  /**
   * Initialize the app folder in OneDrive.
   */
  async initStorage(): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/init`, {
      method: 'POST',
      headers: await authHeaders(),
    });
    return res.json();
  },

  /**
   * List files in a relative path.
   */
  async listFiles(path = ''): Promise<unknown[]> {
    const params = path ? `?path=${encodeURIComponent(path)}` : '';
    const res = await fetch(`${API_BASE}/files${params}`, {
      headers: await authHeaders(),
    });
    const data = await res.json();
    return data.items;
  },

  /**
   * Read a JSON file.
   */
  async readFile<T = unknown>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}/file?path=${encodeURIComponent(path)}`, {
      headers: await authHeaders(),
    });
    const data = await res.json();
    return data.data as T;
  },

  /**
   * Write a JSON file.
   */
  async writeFile(path: string, data: unknown): Promise<void> {
    await fetch(`${API_BASE}/file`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify({ path, data }),
    });
  },

  /**
   * Delete a file.
   */
  async deleteFile(path: string): Promise<void> {
    await fetch(`${API_BASE}/file?path=${encodeURIComponent(path)}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
  },

  /**
   * Sync settings to OneDrive.
   */
  async syncSettings(settings: Record<string, unknown>): Promise<void> {
    await fetch(`${API_BASE}/sync-settings`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(settings),
    });
  },

  /**
   * Load settings from OneDrive.
   */
  async loadSettings(): Promise<Record<string, unknown> | null> {
    const res = await fetch(`${API_BASE}/load-settings`, {
      headers: await authHeaders(),
    });
    const data = await res.json();
    return data.settings;
  },

  /**
   * Save conversation to OneDrive.
   */
  async saveConversation(id: string, data: unknown): Promise<void> {
    await fetch(`${API_BASE}/conversations/${id}`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
  },

  /**
   * Load conversation from OneDrive.
   */
  async loadConversation(id: string): Promise<unknown | null> {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      headers: await authHeaders(),
    });
    const data = await res.json();
    return data.data;
  },
};
