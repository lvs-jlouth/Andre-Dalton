/**
 * OneDrive storage routes — CRUD for app files stored in the user's OneDrive.
 */
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/tokenValidator.js';
import { acquireTokenOnBehalfOf } from '../auth/oboService.js';
import { OneDriveService } from '../services/microsoft/oneDriveService.js';
import { GRAPH_SCOPES } from '../auth/msalConfig.js';

async function getOneDriveService(request: { headers: { authorization?: string } }): Promise<OneDriveService> {
  const userToken = request.headers.authorization!.slice(7);
  const { accessToken } = await acquireTokenOnBehalfOf(userToken, [GRAPH_SCOPES.FILES_READ_WRITE]);
  return new OneDriveService(accessToken);
}

export async function oneDriveRoutes(app: FastifyInstance): Promise<void> {
  // All routes require authentication
  app.addHook('preHandler', requireAuth);

  /** POST /storage/init — ensure app folder exists */
  app.post('/init', async (request) => {
    const service = await getOneDriveService(request);
    const folder = await service.ensureAppFolder();
    return { success: true, folder };
  });

  /** GET /storage/files?path=relative/path — list files */
  app.get('/files', async (request) => {
    const { path: relativePath } = request.query as { path?: string };
    const service = await getOneDriveService(request);
    const items = await service.listItems(relativePath ?? '');
    return { items };
  });

  /** GET /storage/file?path=relative/path — read a JSON file */
  app.get('/file', async (request) => {
    const { path: relativePath } = request.query as { path: string };
    const service = await getOneDriveService(request);
    const data = await service.readJson(relativePath);
    return { data };
  });

  /** PUT /storage/file — write a JSON file */
  app.put('/file', async (request) => {
    const { path: relativePath, data } = request.body as { path: string; data: unknown };
    const service = await getOneDriveService(request);
    const item = await service.writeJson(relativePath, data);
    return { success: true, item };
  });

  /** DELETE /storage/file?path=relative/path — delete a file */
  app.delete('/file', async (request) => {
    const { path: relativePath } = request.query as { path: string };
    const service = await getOneDriveService(request);
    await service.deleteItem(relativePath);
    return { success: true };
  });

  /** POST /storage/sync-settings — sync app settings to OneDrive */
  app.post('/sync-settings', async (request) => {
    const settings = request.body as Record<string, unknown>;
    const service = await getOneDriveService(request);
    await service.syncSettings(settings);
    return { success: true };
  });

  /** GET /storage/load-settings — load settings from OneDrive */
  app.get('/load-settings', async (request) => {
    const service = await getOneDriveService(request);
    const settings = await service.loadSettings();
    return { settings };
  });

  /** POST /storage/conversations/:id — save conversation */
  app.post('/conversations/:id', async (request) => {
    const { id } = request.params as { id: string };
    const data = request.body;
    const service = await getOneDriveService(request);
    await service.saveConversation(id, data);
    return { success: true };
  });

  /** GET /storage/conversations/:id — load conversation */
  app.get('/conversations/:id', async (request) => {
    const { id } = request.params as { id: string };
    const service = await getOneDriveService(request);
    const data = await service.loadConversation(id);
    return { data };
  });
}
