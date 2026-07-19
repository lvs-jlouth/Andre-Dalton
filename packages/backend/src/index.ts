import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

import { getEnv } from './utils/env.js';
import { createLogger } from './utils/logger.js';
import { healthRoutes } from './routes/health.js';
import { providerRoutes } from './routes/providers.js';
import { assistantRoutes } from './routes/assistant.js';
import { speechRoutes } from './routes/speech.js';
import { profileRoutes } from './routes/profile.js';
import { settingsRoutes } from './routes/settings.js';
import { governanceRoutes } from './routes/governance.js';
import { knowledgeRoutes } from './routes/knowledge.js';
import { createSharedSubsystems } from '@unifi/shared-core';
import { GovernanceDocumentationAgent } from '@unifi/governance-agent';
import { KnowledgeInstitutionalMemoryAgent } from '@unifi/knowledge-agent';
import { solutionCenterRoutes } from './routes/solutionCenter.js';

const env = getEnv();
const log = createLogger('server');
const shared = createSharedSubsystems({ governanceApiToken: env.GOVERNANCE_API_TOKEN });
const governanceAgent = new GovernanceDocumentationAgent(shared);
const knowledgeAgent = new KnowledgeInstitutionalMemoryAgent(shared);

const app = Fastify({
  logger: false, // We use our own redacting logger
  trustProxy: true,
});

async function start(): Promise<void> {
  // Security middleware
  await app.register(helmet, {
    contentSecurityPolicy: false, // Configured per-route if needed
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Routes
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(providerRoutes, { prefix: '/providers' });
  await app.register((instance) => assistantRoutes(instance, shared), { prefix: '/assistant' });
  await app.register(speechRoutes, { prefix: '/speech' });
  await app.register(profileRoutes, { prefix: '/profile' });
  await app.register(settingsRoutes, { prefix: '/settings' });
  await app.register((instance) => governanceRoutes(instance, shared, governanceAgent), { prefix: '/governance' });
  await app.register((instance) => knowledgeRoutes(instance, shared, knowledgeAgent), { prefix: '/knowledge' });
  await app.register(
    (instance) => solutionCenterRoutes(instance, shared, governanceAgent, knowledgeAgent),
    { prefix: '/solution-center' },
  );

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    log.info(`AURORA backend listening on http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    log.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
