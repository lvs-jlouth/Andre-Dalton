import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getProvider, getDefaultProvider } from '../providers/index.js';
import type { LlmMessage } from '../providers/types.js';
import { createLogger } from '../utils/logger.js';
import { getEnv } from '../utils/env.js';
import type { SharedSubsystems } from '@unifi/shared-core';

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
});

export async function assistantRoutes(app: FastifyInstance, shared: SharedSubsystems): Promise<void> {
  /** POST /assistant/message — send a conversation turn to the configured LLM */
  app.post(
    '/message',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async (req, reply) => {
      const parsed = AssistantRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
      }

      const { messages, providerId, model, systemPrompt, maxTokens, temperature } = parsed.data;

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
      const principal = shared.authentication.authenticate();
      if (!shared.authorization.canPerform(principal, 'assistant.message')) {
        shared.auditLogging.record({
          actorId: principal.id,
          action: 'assistant.message',
          outcome: 'denied',
          details: 'Authorization failed for assistant.message',
        });
        return reply.status(403).send({ error: 'Forbidden' });
      }

      // Privacy: do not log prompt content unless debug mode is explicitly enabled
      if (env.DEBUG_MODE) {
        log.debug(`Sending message to provider: ${provider.id}`);
      } else {
        log.info(`Message request → provider: ${provider.id}`);
      }

      try {
        const response = await provider.sendMessage({
          messages: messages as LlmMessage[],
          model,
          systemPrompt,
          maxTokens,
          temperature,
        });

        // Only return the response content and metadata — never echo back prompts
        shared.observability.increment('assistant.messages.handled');
        shared.auditLogging.record({
          actorId: principal.id,
          action: 'assistant.message',
          outcome: 'success',
          details: `Provider ${provider.id}`,
        });
        return reply.send({
          content: response.content,
          model: response.model,
          finishReason: response.finishReason,
          usage: response.usage,
          providerId: provider.id,
        });
      } catch (err) {
        log.error('Assistant message error', err);
        return reply.status(502).send({ error: 'Failed to get response from AI provider' });
      }
    },
  );
}
