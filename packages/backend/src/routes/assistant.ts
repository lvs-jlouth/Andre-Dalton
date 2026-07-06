import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getProvider, getDefaultProvider } from '../providers/index.js';
import type { LlmMessage } from '../providers/types.js';
import { createLogger } from '../utils/logger.js';
import { getEnv } from '../utils/env.js';
import { buildSystemPrompt, sanitizeConversation } from '../utils/assistantSecurity.js';

const log = createLogger('route:assistant');

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(32_000),
});

const AssistantRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(100),
  providerId: z.string().optional(),
  model: z.string().optional(),
  profileName: z.string().max(100).optional(),
  maxTokens: z.number().int().min(1).max(8192).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export async function assistantRoutes(app: FastifyInstance): Promise<void> {
  /** POST /assistant/message — send a conversation turn to the configured LLM */
  app.post('/message', async (req, reply) => {
    const parsed = AssistantRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    const { messages, providerId, model, profileName, maxTokens, temperature } = parsed.data;
    const sanitizedMessages = sanitizeConversation(messages as LlmMessage[]);
    if (sanitizedMessages.length === 0) {
      return reply.status(400).send({ error: 'At least one user or assistant message is required' });
    }

    let provider;
    try {
      provider = providerId ? getProvider(providerId) : getDefaultProvider();
      if (!provider) {
        return reply.status(404).send({ error: `Provider "${providerId}" not found` });
      }
    } catch (err) {
      return reply.status(503).send({ error: 'No provider configured' });
    }

    const env = getEnv();

    // Privacy: do not log prompt content unless debug mode is explicitly enabled
    if (env.DEBUG_MODE) {
      log.debug(`Sending message to provider: ${provider.id}`);
    } else {
      log.info(`Message request → provider: ${provider.id}`);
    }

    try {
      const response = await provider.sendMessage({
        messages: sanitizedMessages,
        model,
        systemPrompt: buildSystemPrompt(profileName),
        maxTokens,
        temperature,
      });

      // Only return the response content and metadata — never echo back prompts
      return reply.send({
        content: response.content,
        model: response.model,
        finishReason: response.finishReason,
        usage: response.usage,
        providerId: provider.id,
      });
    } catch (err) {
      log.error('Assistant message error', err);
      return reply.status(502).send({
        error: `Provider "${provider.id}" is unavailable right now. Please retry or switch providers.`,
      });
    }
  });
}
