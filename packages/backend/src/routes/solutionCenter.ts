import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { SharedSubsystems } from '@unifi/shared-core';
import { GovernanceDocumentationAgent } from '@unifi/governance-agent';
import { KnowledgeInstitutionalMemoryAgent } from '@unifi/knowledge-agent';
import { createLogger } from '../utils/logger.js';

const log = createLogger('route:solution-center');

const SourceSchema = z.object({
  system: z.string().min(1).max(120),
  summary: z.string().min(1).max(2000),
});

const AutomationSchema = z.object({
  projectNameToken: z.string().min(1).default('{{PROJECT_NAME}}'),
  siteNameToken: z.string().optional(),
  serverNameToken: z.string().optional(),
  ipAddressToken: z.string().optional(),
  versionToken: z.string().optional(),
  sourceInputs: z.array(SourceSchema).min(1),
  formats: z.array(z.enum(['markdown', 'word', 'html', 'pdf'])).min(1),
  knowledgeSourceName: z.string().min(1).default('Tech Elixir Documentation Automation'),
  knowledgeSourceUri: z.string().min(1).default('internal://solution-center/documentation-automation'),
});

function requirePermission(
  shared: SharedSubsystems,
  apiToken: string | undefined,
  action: string,
): { ok: true; actorId: string } | { ok: false } {
  const principal = shared.authentication.authenticate(apiToken);
  if (!shared.authorization.canPerform(principal, action)) {
    shared.auditLogging.record({
      actorId: principal.id,
      action,
      outcome: 'denied',
      details: `Authorization failed for ${action}`,
    });
    return { ok: false };
  }
  return { ok: true, actorId: principal.id };
}

export async function solutionCenterRoutes(
  app: FastifyInstance,
  shared: SharedSubsystems,
  governanceAgent: GovernanceDocumentationAgent,
  knowledgeAgent: KnowledgeInstitutionalMemoryAgent,
): Promise<void> {
  app.get('/documentation-automation/capabilities', async (_req, reply) => {
    return reply.send({
      solution: 'Tech-Elixir Solution Center',
      automation: 'documentation',
      endpoints: {
        orchestrator: '/solution-center/documentation-automation/run',
        governanceCatalog: '/governance/catalog',
        knowledgeQuery: '/knowledge/query',
      },
      outputs: ['markdown', 'word', 'html', 'pdf'],
      integration: {
        sharedAuthentication: true,
        sharedAuthorization: true,
        sharedDatabasePattern: true,
        sharedAuditLogging: true,
        sharedApprovalWorkflows: true,
        sharedReportingEngine: true,
        sharedObservability: true,
        sharedConfiguration: true,
      },
    });
  });

  app.post('/documentation-automation/run', async (req, reply) => {
    const token = req.headers['x-api-token'];
    const parsedToken = Array.isArray(token) ? token[0] : token;
    const permission = requirePermission(shared, parsedToken, 'solution-center.documentation-automation.run');
    if (!permission.ok) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const parsed = AutomationSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    const requestIdHeader = req.headers['x-request-id'];
    const requestId = Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader ?? `req-${Date.now()}`;

    const source =
      knowledgeAgent
        .listSources()
        .find((entry) => entry.source_uri === parsed.data.knowledgeSourceUri && entry.source_name === parsed.data.knowledgeSourceName) ??
      knowledgeAgent.registerSource({
        source_type: 'governance_automation',
        source_name: parsed.data.knowledgeSourceName,
        source_uri: parsed.data.knowledgeSourceUri,
        system_owner: 'Tech Elixir Solution Center',
        trust_level: 'high',
        last_ingested_at: undefined,
      });

    const generated = governanceAgent.generate({
      projectNameToken: parsed.data.projectNameToken,
      siteNameToken: parsed.data.siteNameToken,
      serverNameToken: parsed.data.serverNameToken,
      ipAddressToken: parsed.data.ipAddressToken,
      versionToken: parsed.data.versionToken,
      sourceInputs: parsed.data.sourceInputs,
      formats: parsed.data.formats,
    });

    const ingested: Array<{ documentId: string; duplicate: boolean; setName: string; format: string }> = [];
    for (const document of generated.documents) {
      const ingestion = knowledgeAgent.ingestDocument({
        source_id: source.id,
        title: `${document.setName} - ${document.title}`,
        document_type: 'governance-artifact',
        document_status: 'approved',
        version: parsed.data.versionToken ?? '{{VERSION}}',
        author: 'Tech-Elixir Solution Center',
        content: document.content,
        metadata_json: {
          setName: document.setName,
          format: document.format,
          filename: document.filename,
          requestId,
          tokens: {
            project: parsed.data.projectNameToken,
            site: parsed.data.siteNameToken ?? '{{SITE_NAME}}',
            server: parsed.data.serverNameToken ?? '{{SERVER_NAME}}',
            ip: parsed.data.ipAddressToken ?? '{{IP_ADDRESS}}',
            version: parsed.data.versionToken ?? '{{VERSION}}',
          },
        },
      });
      ingested.push({
        documentId: ingestion.document.id,
        duplicate: ingestion.duplicate,
        setName: document.setName,
        format: document.format,
      });
    }

    shared.observability.increment('solution_center.documentation_automation.runs');
    shared.auditLogging.record({
      actorId: permission.actorId,
      action: 'solution-center.documentation-automation.run',
      outcome: 'success',
      details: `requestId=${requestId}, generated=${generated.documents.length}, ingested=${ingested.length}`,
    });

    log.info(`Documentation automation completed requestId=${requestId}`);
    return reply.send({
      requestId,
      status: 'completed',
      generatedCount: generated.documents.length,
      ingestedCount: ingested.length,
      approvalRequest: generated.approvalRequest,
      executiveSummary: generated.executiveSummary,
      integration: {
        governance: '/governance/generate',
        knowledgeIngestion: '/knowledge/ingest',
        knowledgeQuery: '/knowledge/query',
      },
      documents: ingested,
    });
  });
}
