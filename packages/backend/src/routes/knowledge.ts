import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { SharedSubsystems } from '@unifi/shared-core';
import { KnowledgeInstitutionalMemoryAgent } from '@unifi/knowledge-agent';

const SourceRegistrationSchema = z.object({
  source_type: z.string().min(1),
  source_name: z.string().min(1),
  source_uri: z.string().min(1),
  system_owner: z.string().min(1),
  trust_level: z.enum(['high', 'medium', 'low']),
});

const IngestSchema = z.object({
  source_id: z.string().min(1),
  title: z.string().min(1),
  document_type: z.string().min(1),
  document_status: z.enum(['draft', 'approved', 'retired']).optional(),
  version: z.string().optional(),
  author: z.string().optional(),
  content: z.string().min(1),
  metadata_json: z.record(z.unknown()).optional(),
});

const SearchSchema = z.object({
  query: z.string().min(1),
  source_ids: z.array(z.string()).optional(),
  document_type: z.string().optional(),
  status: z.enum(['draft', 'approved', 'retired']).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const QuerySchema = z.object({
  user_id: z.string().min(1).default('system'),
  query_text: z.string().min(1),
});

const DecisionSchema = z.object({
  title: z.string().min(1),
  decision_type: z.string().min(1),
  decision_summary: z.string().min(1),
  decision_rationale: z.string().min(1),
  alternatives_considered: z.array(z.string()).default([]),
  status: z.enum(['proposed', 'approved', 'deferred', 'rejected']),
  owner: z.string().min(1),
  decision_date: z.string().optional(),
  evidence_links: z.array(z.string()).default([]),
});

const LessonSchema = z.object({
  title: z.string().min(1),
  context: z.string().min(1),
  issue: z.string().min(1),
  resolution: z.string().min(1),
  prevention: z.string().min(1),
  related_change_id: z.string().optional(),
  related_risk_id: z.string().optional(),
  related_incident_id: z.string().optional(),
});

const BaselineSchema = z.object({
  target_type: z.string().min(1),
  target_id: z.string().min(1),
  baseline_summary: z.string().min(1),
  source_document_ids: z.array(z.string()).default([]),
  approved_change_id: z.string().optional(),
});

const DriftSchema = z.object({
  target_type: z.string().min(1),
  target_id: z.string().min(1),
  drift_summary: z.string().min(1),
  baseline_id: z.string().optional(),
  related_change_ids: z.array(z.string()).default([]),
});

const ChangeHistorySchema = z.object({
  target_type: z.string().min(1),
  target_id: z.string().min(1),
  change_summary: z.string().min(1),
  approved_by: z.string().optional(),
  implemented_at: z.string().optional(),
  validation_summary: z.string().optional(),
  rollback_required: z.boolean().optional(),
});

const RiskHistorySchema = z.object({
  risk_title: z.string().min(1),
  risk_status: z.enum(['open', 'accepted', 'mitigated', 'closed']),
  affected_target: z.string().optional(),
  evidence_links: z.array(z.string()).default([]),
  review_due: z.string().optional(),
});

function requireKnowledgePermission(
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

export async function knowledgeRoutes(
  app: FastifyInstance,
  shared: SharedSubsystems,
  agent: KnowledgeInstitutionalMemoryAgent = new KnowledgeInstitutionalMemoryAgent(shared),
): Promise<void> {
  app.get('/sources', async (_req, reply) => reply.send({ items: agent.listSources() }));
  app.get('/documents', async (_req, reply) => reply.send({ items: agent.listDocuments() }));
  app.get('/chunks', async (_req, reply) => reply.send({ items: agent.listChunks() }));
  app.get('/entities', async (_req, reply) => reply.send({ items: agent.listEntities() }));
  app.get('/relationships', async (_req, reply) => reply.send({ items: agent.listRelationships() }));
  app.get('/decisions', async (_req, reply) => reply.send({ items: agent.listDecisions() }));
  app.get('/lessons', async (_req, reply) => reply.send({ items: agent.listLessons() }));
  app.get('/baselines', async (_req, reply) => reply.send({ items: agent.listBaselines() }));
  app.get('/drift-context', async (_req, reply) => reply.send({ items: agent.listDriftContexts() }));
  app.get('/change-history', async (_req, reply) => reply.send({ items: agent.listChangeHistory() }));
  app.get('/risk-history', async (_req, reply) => reply.send({ items: agent.listRiskHistory() }));

  app.post('/sources', async (req, reply) => {
    const token = req.headers['x-api-token'];
    const parsedToken = Array.isArray(token) ? token[0] : token;
    const permission = requireKnowledgePermission(shared, parsedToken, 'knowledge.source.register');
    if (!permission.ok) return reply.status(403).send({ error: 'Forbidden' });

    const parsed = SourceRegistrationSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }
    const source = agent.registerSource({ ...parsed.data, last_ingested_at: undefined });
    return reply.send(source);
  });

  app.post('/ingest', async (req, reply) => {
    const token = req.headers['x-api-token'];
    const parsedToken = Array.isArray(token) ? token[0] : token;
    const permission = requireKnowledgePermission(shared, parsedToken, 'knowledge.ingest');
    if (!permission.ok) return reply.status(403).send({ error: 'Forbidden' });

    const parsed = IngestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }
    try {
      const result = agent.ingestDocument(parsed.data);
      return reply.send(result);
    } catch (err) {
      return reply.status(404).send({ error: err instanceof Error ? err.message : 'Ingestion failed' });
    }
  });

  app.post('/search', async (req, reply) => {
    const parsed = SearchSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }
    return reply.send({ items: agent.search(parsed.data) });
  });

  app.post('/query', async (req, reply) => {
    const parsed = QuerySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }
    return reply.send(agent.query(parsed.data.user_id, parsed.data.query_text));
  });

  app.post('/reindex', async (req, reply) => {
    const token = req.headers['x-api-token'];
    const parsedToken = Array.isArray(token) ? token[0] : token;
    const permission = requireKnowledgePermission(shared, parsedToken, 'knowledge.reindex');
    if (!permission.ok) return reply.status(403).send({ error: 'Forbidden' });
    return reply.send(agent.reindex());
  });

  app.post('/decisions', async (req, reply) => {
    const parsed = DecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }
    return reply.send(agent.addDecision(parsed.data));
  });

  app.post('/lessons', async (req, reply) => {
    const parsed = LessonSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }
    return reply.send(agent.addLesson(parsed.data));
  });

  app.post('/baselines', async (req, reply) => {
    const parsed = BaselineSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }
    return reply.send(agent.addBaseline(parsed.data));
  });

  app.post('/drift-context', async (req, reply) => {
    const parsed = DriftSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }
    return reply.send(agent.addDriftContext(parsed.data));
  });

  app.post('/change-history', async (req, reply) => {
    const parsed = ChangeHistorySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }
    return reply.send(agent.addChangeHistory(parsed.data));
  });

  app.post('/risk-history', async (req, reply) => {
    const parsed = RiskHistorySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }
    return reply.send(agent.addRiskHistory(parsed.data));
  });
}
