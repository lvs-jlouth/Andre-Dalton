/**
 * OneDrive storage service — uses Microsoft Graph to provide
 * portable, secure cloud storage for J.A.R.G.I.I.N. application data.
 *
 * All app data is stored in the user's OneDrive under /Apps/JARGIIN/
 * which is accessible from any device.
 */
import { GraphClient } from './graphClient.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('onedrive');
const APP_FOLDER = 'Apps/JARGIIN';

export interface OneDriveItem {
  id: string;
  name: string;
  size: number;
  lastModifiedDateTime: string;
  file?: { mimeType: string };
  folder?: { childCount: number };
  webUrl: string;
  parentReference?: { path: string };
}

export interface OneDriveListResponse {
  value: OneDriveItem[];
  '@odata.nextLink'?: string;
}

export class OneDriveService {
  private graph: GraphClient;

  constructor(accessToken: string) {
    this.graph = new GraphClient(accessToken);
  }

  /**
   * Ensure the app folder exists in the user's OneDrive.
   */
  async ensureAppFolder(): Promise<OneDriveItem> {
    try {
      return await this.graph.request<OneDriveItem>(
        `/me/drive/root:/${APP_FOLDER}`,
      );
    } catch {
      // Folder doesn't exist — create it
      log.info('Creating J.A.R.G.I.I.N. app folder in OneDrive');
      await this.graph.request('/me/drive/root/children', {
        method: 'POST',
        body: { name: 'Apps', folder: {}, '@microsoft.graph.conflictBehavior': 'fail' },
      }).catch(() => { /* Apps may already exist */ });

      return await this.graph.request<OneDriveItem>('/me/drive/root:/Apps:/children', {
        method: 'POST',
        body: { name: 'JARGIIN', folder: {}, '@microsoft.graph.conflictBehavior': 'fail' },
      });
    }
  }

  /**
   * List items in a path relative to the app folder.
   */
  async listItems(relativePath = ''): Promise<OneDriveItem[]> {
    const path = relativePath
      ? `${APP_FOLDER}/${relativePath}`
      : APP_FOLDER;

    const response = await this.graph.request<OneDriveListResponse>(
      `/me/drive/root:/${path}:/children`,
    );
    return response.value;
  }

  /**
   * Read a JSON file from the app folder.
   */
  async readJson<T = unknown>(relativePath: string): Promise<T> {
    const content = await this.graph.downloadContent(
      `/me/drive/root:/${APP_FOLDER}/${relativePath}:/content`,
    );
    const text = new TextDecoder().decode(content);
    return JSON.parse(text) as T;
  }

  /**
   * Write a JSON file to the app folder.
   */
  async writeJson(relativePath: string, data: unknown): Promise<OneDriveItem> {
    const content = Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
    return await this.graph.uploadContent(
      `/me/drive/root:/${APP_FOLDER}/${relativePath}:/content`,
      content,
      'application/json',
    ) as OneDriveItem;
  }

  /**
   * Upload a file to the app folder.
   */
  async uploadFile(
    relativePath: string,
    content: Buffer | ArrayBuffer,
    contentType: string,
  ): Promise<OneDriveItem> {
    return await this.graph.uploadContent(
      `/me/drive/root:/${APP_FOLDER}/${relativePath}:/content`,
      content,
      contentType,
    ) as OneDriveItem;
  }

  /**
   * Download a file from the app folder.
   */
  async downloadFile(relativePath: string): Promise<ArrayBuffer> {
    return await this.graph.downloadContent(
      `/me/drive/root:/${APP_FOLDER}/${relativePath}:/content`,
    );
  }

  /**
   * Delete an item from the app folder.
   */
  async deleteItem(relativePath: string): Promise<void> {
    await this.graph.request(`/me/drive/root:/${APP_FOLDER}/${relativePath}`, {
      method: 'DELETE',
    });
  }

  /**
   * Sync settings — write local settings to OneDrive for cross-device access.
   */
  async syncSettings(settings: Record<string, unknown>): Promise<void> {
    await this.writeJson('settings/app-settings.json', {
      ...settings,
      _syncedAt: new Date().toISOString(),
      _version: '1.0.0',
    });
    log.info('Settings synced to OneDrive');
  }

  /**
   * Load settings from OneDrive.
   */
  async loadSettings(): Promise<Record<string, unknown> | null> {
    try {
      return await this.readJson<Record<string, unknown>>('settings/app-settings.json');
    } catch {
      return null;
    }
  }

  /**
   * Save conversation history to OneDrive.
   */
  async saveConversation(conversationId: string, data: unknown): Promise<void> {
    await this.writeJson(`conversations/${conversationId}.json`, data);
  }

  /**
   * Load conversation history from OneDrive.
   */
  async loadConversation(conversationId: string): Promise<unknown | null> {
    try {
      return await this.readJson(`conversations/${conversationId}.json`);
    } catch {
      return null;
    }
  }
}
