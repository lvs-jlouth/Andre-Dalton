import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { GovernanceDocumentationAgent } from '@unifi/governance-agent';
import type { SharedSubsystems } from '@unifi/shared-core';

const SourceSchema = z.object({
  system: z.string().min(1).max(120),
  summary: z.string().min(1).max(2000),
});

const GenerateSchema = z.object({
  projectNameToken: z.string().min(1).default('{{PROJECT_NAME}}'),
  siteNameToken: z.string().optional(),
  serverNameToken: z.string().optional(),
  ipAddressToken: z.string().optional(),
  versionToken: z.string().optional(),
  sourceInputs: z.array(SourceSchema).min(1),
  formats: z.array(z.enum(['markdown', 'word', 'html', 'pdf'])).min(1),
});

export async function governanceRoutes(
  app: FastifyInstance,
  shared: SharedSubsystems,
  agent: GovernanceDocumentationAgent = new GovernanceDocumentationAgent(shared),
): Promise<void> {

  app.get('/catalog', async (_req, reply) => {
    return reply.send({
      agent: 'Tech Elixir Governance & Documentation Agent',
      supportedOutputs: ['markdown', 'word', 'html', 'pdf'],
      futureOutputs: ['sharepoint-pages'],
      sharedSubsystems: {
        authentication: true,
        authorization: true,
        database: true,
        auditLogging: true,
        approvalWorkflows: true,
        reportingEngine: true,
        sharedUiFramework: shared.sharedUiFramework.name,
        sharedApiFramework: shared.sharedApiFramework.name,
        observability: true,
        configuration: true,
      },
    });
  });

  app.post('/generate', async (req, reply) => {
    const token = req.headers['x-api-token'];
    const apiToken = Array.isArray(token) ? token[0] : token;
    const principal = shared.authentication.authenticate(apiToken);

    if (!shared.authorization.canPerform(principal, 'governance.generate')) {
      shared.auditLogging.record({
        actorId: principal.id,
        action: 'governance.generate',
        outcome: 'denied',
        details: 'Authorization failed for governance.generate',
      });
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const parsed = GenerateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    const response = agent.generate(parsed.data);
    return reply.send(response);
  });
}
