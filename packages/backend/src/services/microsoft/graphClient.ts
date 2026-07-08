/**
 * Microsoft Graph API client.
 * Handles authenticated calls to Graph API for Office 365 and OneDrive operations.
 */
import { createLogger } from '../../utils/logger.js';

const log = createLogger('graph-client');
const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

export interface GraphRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  responseType?: 'json' | 'blob' | 'text';
}

export class GraphClient {
  constructor(private accessToken: string) {}

  async request<T = unknown>(endpoint: string, options: GraphRequestOptions = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${GRAPH_BASE_URL}${endpoint}`;
    const { method = 'GET', headers = {}, body, responseType = 'json' } = options;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error(`Graph API error: ${response.status} ${endpoint}`, errorText);
      throw new GraphApiError(response.status, errorText, endpoint);
    }

    if (response.status === 204) return undefined as T;

    if (responseType === 'text') return (await response.text()) as T;
    if (responseType === 'blob') return (await response.arrayBuffer()) as T;
    return (await response.json()) as T;
  }

  /**
   * Upload binary content (e.g., file upload to OneDrive).
   */
  async uploadContent(endpoint: string, content: Buffer | ArrayBuffer, contentType: string): Promise<unknown> {
    const url = endpoint.startsWith('http') ? endpoint : `${GRAPH_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': contentType,
      },
      body: content,
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error(`Graph API upload error: ${response.status}`, errorText);
      throw new GraphApiError(response.status, errorText, endpoint);
    }

    return response.json();
  }

  /**
   * Download binary content from Graph API.
   */
  async downloadContent(endpoint: string): Promise<ArrayBuffer> {
    const url = endpoint.startsWith('http') ? endpoint : `${GRAPH_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new GraphApiError(response.status, errorText, endpoint);
    }

    return response.arrayBuffer();
  }
}

export class GraphApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly details: string,
    public readonly endpoint: string,
  ) {
    super(`Graph API error ${statusCode} on ${endpoint}`);
    this.name = 'GraphApiError';
  }
}
