import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getProvider, getDefaultProvider, isProviderAvailable } from '../providers/index.js';
import type { LlmMessage } from '../providers/types.js';
import { createLogger } from '../utils/logger.js';
import { getEnv } from '../utils/env.js';
import { fetchM365Context, formatM365ContextForPrompt } from '../services/graphContextService.js';
import { getUserIdentityKey } from '../utils/userIdentity.js';

const log = createLogger('route:assistant');

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(32_000),
});

const AssistantRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(100),
  providerId: z.string().optional(),
  model: z.string().optional(),
  systemPrompt: z.string().max(4000).optional(),
  maxTokens: z.number().int().min(1).max(8192).optional(),
  temperature: z.number().min(0).max(2).optional(),
  useWebSearch: z.boolean().optional(),
  includeM365Context: z.boolean().optional(),
});

export async function assistantRoutes(app: FastifyInstance): Promise<void> {
  /** POST /assistant/message — send a conversation turn to the configured LLM */
  app.post('/message', async (req, reply) => {
    const parsed = AssistantRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    const {
      messages,
      providerId,
      model,
      systemPrompt,
      maxTokens,
      temperature,
      useWebSearch,
      includeM365Context,
    } = parsed.data;

    let provider;
    try {
      const resolvedProviderId =
        useWebSearch && isProviderAvailable('openrouter') ? 'openrouter' : providerId;
      provider = resolvedProviderId ? getProvider(resolvedProviderId) : getDefaultProvider();
      if (!provider) {
        return reply
          .status(404)
          .send({ error: `Provider "${resolvedProviderId ?? providerId}" not found` });
      }
    } catch (err) {
      return reply.status(503).send({ error: 'No provider configured' });
    }

    const env = getEnv();

    if (env.DEBUG_MODE) {
      log.debug(`Sending message to provider: ${provider.id}`);
    } else {
      log.info(`Message request → provider: ${provider.id}`);
    }

    // Optionally fetch M365 context to inject into system prompt
    let m365Snippet: string | null = null;
    if (includeM365Context) {
      try {
        const delegatedToken =
          (req.headers['x-ms-token-aad-access-token'] as string) || null;
        const userKey = getUserIdentityKey(req);
        const oidMatch = userKey.match(/^[0-9a-f-]{36}$/i);
        const userObjectId = oidMatch ? userKey : null;
        const ctx = await fetchM365Context(delegatedToken, userObjectId);
        if (ctx) m365Snippet = formatM365ContextForPrompt(ctx);
      } catch {
        // Non-fatal — proceed without M365 context
      }
    }

    try {
      const resolvedModel =
        useWebSearch && provider.id === 'openrouter' ? 'perplexity/sonar-pro' : model;

      const resolvedSystemPrompt = [
        systemPrompt?.trim(),
        m365Snippet,
        useWebSearch && provider.id === 'openrouter'
          ? 'Use live web search to answer with current, up-to-date information and cite the freshest facts you can access.'
          : null,
      ]
        .filter(Boolean)
        .join('\n\n');

      const response = await provider.sendMessage({
        messages: messages as LlmMessage[],
        model: resolvedModel,
        systemPrompt: resolvedSystemPrompt || undefined,
        maxTokens,
        temperature,
      });
      const content =
        typeof response.content === 'string' ? response.content.trim() : '';
      if (!content) {
        log.error(`Provider returned empty content: ${provider.id}`);
        return reply.status(502).send({ error: 'Provider returned an empty response' });
      }

      return reply.send({
        content,
        model: response.model,
        finishReason: response.finishReason,
        usage: response.usage,
        providerId: provider.id,
        m365ContextUsed: !!m365Snippet,
      });
    } catch (err) {
      log.error('Assistant message error', err);
      return reply.status(502).send({ error: 'Failed to get response from AI provider' });
    }
  });
}

