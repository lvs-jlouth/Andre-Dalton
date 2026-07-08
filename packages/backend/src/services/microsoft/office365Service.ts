/**
 * Office 365 integration service.
 * Provides read/write capabilities for Word, Excel, PowerPoint, Outlook, and Teams.
 */
import { GraphClient } from './graphClient.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('office365');

// ─── Types ─────────────────────────────────────────────────────────────────

export interface MailMessage {
  id?: string;
  subject: string;
  body: { contentType: 'Text' | 'HTML'; content: string };
  toRecipients: Array<{ emailAddress: { address: string; name?: string } }>;
  ccRecipients?: Array<{ emailAddress: { address: string; name?: string } }>;
}

export interface CalendarEvent {
  id?: string;
  subject: string;
  body?: { contentType: 'Text' | 'HTML'; content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  attendees?: Array<{
    emailAddress: { address: string; name?: string };
    type: 'required' | 'optional';
  }>;
}

export interface ExcelWorkbook {
  id: string;
  name: string;
  webUrl: string;
}

export interface TeamsChatMessage {
  body: { contentType: 'text' | 'html'; content: string };
}

// ─── Service ────────────────────────────────────────────────────────────────

export class Office365Service {
  private graph: GraphClient;

  constructor(accessToken: string) {
    this.graph = new GraphClient(accessToken);
  }

  // ─── Outlook Mail ─────────────────────────────────────────────────────────

  /**
   * List recent mail messages from the user's inbox.
   */
  async listMail(top = 10, folder = 'inbox'): Promise<MailMessage[]> {
    const response = await this.graph.request<{ value: MailMessage[] }>(
      `/me/mailFolders/${folder}/messages?$top=${top}&$orderby=receivedDateTime desc`,
    );
    return response.value;
  }

  /**
   * Send a new email.
   */
  async sendMail(message: MailMessage, saveToSentItems = true): Promise<void> {
    await this.graph.request('/me/sendMail', {
      method: 'POST',
      body: { message, saveToSentItems },
    });
    log.info(`Email sent to ${message.toRecipients.map(r => r.emailAddress.address).join(', ')}`);
  }

  /**
   * Search mail by keyword.
   */
  async searchMail(query: string, top = 10): Promise<MailMessage[]> {
    const response = await this.graph.request<{ value: MailMessage[] }>(
      `/me/messages?$search="${encodeURIComponent(query)}"&$top=${top}`,
    );
    return response.value;
  }

  // ─── Calendar ─────────────────────────────────────────────────────────────

  /**
   * List upcoming calendar events.
   */
  async listEvents(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    const response = await this.graph.request<{ value: CalendarEvent[] }>(
      `/me/calendarView?startDateTime=${startDate}&endDateTime=${endDate}&$orderby=start/dateTime`,
    );
    return response.value;
  }

  /**
   * Create a calendar event.
   */
  async createEvent(event: CalendarEvent): Promise<CalendarEvent> {
    const created = await this.graph.request<CalendarEvent>('/me/events', {
      method: 'POST',
      body: event,
    });
    log.info(`Calendar event created: ${event.subject}`);
    return created;
  }

  // ─── Word Documents ───────────────────────────────────────────────────────

  /**
   * Create a new Word document from content.
   */
  async createWordDocument(
    fileName: string,
    content: string,
    folderPath = '/me/drive/root',
  ): Promise<unknown> {
    const htmlContent = `
      <html><head><meta charset="utf-8"></head>
      <body>${content}</body></html>
    `;
    const buffer = Buffer.from(htmlContent, 'utf-8');
    return await this.graph.uploadContent(
      `${folderPath}:/${fileName}.docx:/content`,
      buffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
  }

  // ─── Excel Workbooks ──────────────────────────────────────────────────────

  /**
   * Read a range from an Excel workbook stored in OneDrive.
   */
  async readExcelRange(
    driveItemId: string,
    worksheetName: string,
    range: string,
  ): Promise<unknown[][]> {
    const response = await this.graph.request<{ values: unknown[][] }>(
      `/me/drive/items/${driveItemId}/workbook/worksheets/${worksheetName}/range(address='${range}')`,
    );
    return response.values;
  }

  /**
   * Write data to an Excel range.
   */
  async writeExcelRange(
    driveItemId: string,
    worksheetName: string,
    range: string,
    values: unknown[][],
  ): Promise<void> {
    await this.graph.request(
      `/me/drive/items/${driveItemId}/workbook/worksheets/${worksheetName}/range(address='${range}')`,
      {
        method: 'PATCH',
        body: { values },
      },
    );
  }

  // ─── PowerPoint ───────────────────────────────────────────────────────────

  /**
   * Export a PowerPoint presentation's metadata.
   */
  async getPresentationInfo(driveItemId: string): Promise<unknown> {
    return await this.graph.request(`/me/drive/items/${driveItemId}`);
  }

  // ─── Teams ────────────────────────────────────────────────────────────────

  /**
   * List the user's Teams chats.
   */
  async listChats(top = 20): Promise<unknown[]> {
    const response = await this.graph.request<{ value: unknown[] }>(
      `/me/chats?$top=${top}&$orderby=lastMessagePreview/createdDateTime desc`,
    );
    return response.value;
  }

  /**
   * Send a message in a Teams chat.
   */
  async sendChatMessage(chatId: string, message: TeamsChatMessage): Promise<unknown> {
    return await this.graph.request(`/me/chats/${chatId}/messages`, {
      method: 'POST',
      body: message,
    });
  }

  /**
   * Get the user's Teams presence status.
   */
  async getPresence(): Promise<{ availability: string; activity: string }> {
    return await this.graph.request('/me/presence');
  }
}
