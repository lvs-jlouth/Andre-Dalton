/**
 * Office 365 integration routes — mail, calendar, Teams, and documents.
 */
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/tokenValidator.js';
import { acquireTokenOnBehalfOf } from '../auth/oboService.js';
import { Office365Service } from '../services/microsoft/office365Service.js';
import { GRAPH_SCOPES } from '../auth/msalConfig.js';
import type { MailMessage, CalendarEvent } from '../services/microsoft/office365Service.js';

async function getOffice365Service(request: { headers: { authorization?: string } }): Promise<Office365Service> {
  const userToken = request.headers.authorization!.slice(7);
  const { accessToken } = await acquireTokenOnBehalfOf(userToken, [
    GRAPH_SCOPES.MAIL_READ_WRITE,
    GRAPH_SCOPES.MAIL_SEND,
    GRAPH_SCOPES.CALENDARS_READ_WRITE,
    GRAPH_SCOPES.CHAT_READ_WRITE,
    GRAPH_SCOPES.PRESENCE_READ,
  ]);
  return new Office365Service(accessToken);
}

export async function office365Routes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  // ─── Mail ───────────────────────────────────────────────────────────────

  /** GET /office/mail?top=10&folder=inbox — list mail */
  app.get('/mail', async (request) => {
    const { top = '10', folder = 'inbox' } = request.query as { top?: string; folder?: string };
    const service = await getOffice365Service(request);
    const messages = await service.listMail(parseInt(top, 10), folder);
    return { messages };
  });

  /** POST /office/mail/send — send an email */
  app.post('/mail/send', async (request) => {
    const { message } = request.body as { message: MailMessage };
    const service = await getOffice365Service(request);
    await service.sendMail(message);
    return { success: true };
  });

  /** GET /office/mail/search?q=query — search mail */
  app.get('/mail/search', async (request) => {
    const { q, top = '10' } = request.query as { q: string; top?: string };
    const service = await getOffice365Service(request);
    const messages = await service.searchMail(q, parseInt(top, 10));
    return { messages };
  });

  // ─── Calendar ─────────────────────────────────────────────────────────────

  /** GET /office/calendar?start=ISO&end=ISO — list events */
  app.get('/calendar', async (request) => {
    const { start, end } = request.query as { start: string; end: string };
    const service = await getOffice365Service(request);
    const events = await service.listEvents(start, end);
    return { events };
  });

  /** POST /office/calendar — create event */
  app.post('/calendar', async (request) => {
    const event = request.body as CalendarEvent;
    const service = await getOffice365Service(request);
    const created = await service.createEvent(event);
    return { event: created };
  });

  // ─── Teams ────────────────────────────────────────────────────────────────

  /** GET /office/teams/chats — list chats */
  app.get('/teams/chats', async (request) => {
    const service = await getOffice365Service(request);
    const chats = await service.listChats();
    return { chats };
  });

  /** POST /office/teams/chats/:chatId/messages — send chat message */
  app.post('/teams/chats/:chatId/messages', async (request) => {
    const { chatId } = request.params as { chatId: string };
    const { content, contentType = 'text' } = request.body as { content: string; contentType?: 'text' | 'html' };
    const service = await getOffice365Service(request);
    const message = await service.sendChatMessage(chatId, {
      body: { contentType, content },
    });
    return { message };
  });

  /** GET /office/teams/presence — get Teams presence */
  app.get('/teams/presence', async (request) => {
    const service = await getOffice365Service(request);
    const presence = await service.getPresence();
    return { presence };
  });

  // ─── Documents ────────────────────────────────────────────────────────────

  /** POST /office/documents/word — create Word document */
  app.post('/documents/word', async (request) => {
    const { fileName, content } = request.body as { fileName: string; content: string };
    const service = await getOffice365Service(request);
    const doc = await service.createWordDocument(fileName, content);
    return { document: doc };
  });

  /** GET /office/documents/excel/:itemId/range — read Excel range */
  app.get('/documents/excel/:itemId/range', async (request) => {
    const { itemId } = request.params as { itemId: string };
    const { worksheet, range } = request.query as { worksheet: string; range: string };
    const service = await getOffice365Service(request);
    const values = await service.readExcelRange(itemId, worksheet, range);
    return { values };
  });

  /** PATCH /office/documents/excel/:itemId/range — write Excel range */
  app.patch('/documents/excel/:itemId/range', async (request) => {
    const { itemId } = request.params as { itemId: string };
    const { worksheet, range, values } = request.body as {
      worksheet: string;
      range: string;
      values: unknown[][];
    };
    const service = await getOffice365Service(request);
    await service.writeExcelRange(itemId, worksheet, range, values);
    return { success: true };
  });
}
