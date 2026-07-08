/**
 * Microsoft Graph API client.
 * Handles authenticated calls to Graph API for Office 365 and OneDrive operations.
 */
import { createLogger } from '../../utils/logger.js';

const log = createLogger('graph-client');
const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

/** Allowed hostnames for Graph API requests (prevents SSRF) */
const ALLOWED_HOSTS = new Set([
  'graph.microsoft.com',
  'graph.microsoft-ppe.com',
]);

/**
 * Validate that a URL targets only allowed Microsoft Graph endpoints.
 * Throws if the URL would route to an untrusted host.
 */
function validateGraphUrl(url: string): void {
  const parsed = new URL(url);
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `SSRF protection: requests to "${parsed.hostname}" are not allowed. ` +
      `Only Microsoft Graph API hosts are permitted.`,
    );
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('SSRF protection: only HTTPS is allowed for Graph API requests.');
  }
}

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
    validateGraphUrl(url);
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
    validateGraphUrl(url);

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
    validateGraphUrl(url);

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
