import { createHash } from 'node:crypto';
import type { SharedSubsystems } from '@unifi/shared-core';

export type KnowledgeStatementType =
  | 'FACT'
  | 'OBSERVATION'
  | 'ASSUMPTION'
  | 'INFERENCE'
  | 'RISK'
  | 'RECOMMENDATION'
  | 'DECISION'
  | 'ACTION_ITEM'
  | 'UNKNOWN';

export interface KnowledgeSource {
  id: string;
  source_type: string;
  source_name: string;
  source_uri: string;
  system_owner: string;
  trust_level: 'high' | 'medium' | 'low';
  ingestion_status: 'pending' | 'ingesting' | 'ingested' | 'failed';
  last_ingested_at?: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeDocument {
  id: string;
  source_id: string;
  title: string;
  document_type: string;
  document_status: 'draft' | 'approved' | 'retired';
  version: string;
  author: string;
  created_date?: string;
  modified_date?: string;
  effective_date?: string;
  retired_date?: string;
  content_hash: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  heading: string;
  content: string;
  token_count: number;
  content_hash: string;
  embedding_id?: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeEntity {
  id: string;
  entity_type: string;
  canonical_name: string;
  display_name: string;
  aliases: string[];
  description?: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeRelationship {
  id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: string;
  confidence: number;
  evidence_document_id?: string;
  evidence_chunk_id?: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeDecision {
  id: string;
  title: string;
  decision_type: string;
  decision_summary: string;
  decision_rationale: string;
  alternatives_considered: string[];
  status: 'proposed' | 'approved' | 'deferred' | 'rejected';
  owner: string;
  decision_date?: string;
  evidence_links: string[];
  created_at: string;
  updated_at: string;
}

export interface KnowledgeLessonLearned {
  id: string;
  title: string;
  context: string;
  issue: string;
  resolution: string;
  prevention: string;
  related_change_id?: string;
  related_risk_id?: string;
  related_incident_id?: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeQueryRecord {
  id: string;
  user_id: string;
  query_text: string;
  query_type: string;
  retrieved_sources: string[];
  answer_summary: string;
  confidence: 'High' | 'Medium' | 'Low';
  created_at: string;
}

export interface KnowledgeBaselineRecord {
  id: string;
  target_type: string;
  target_id: string;
  baseline_summary: string;
  source_document_ids: string[];
  approved_change_id?: string;
  created_at: string;
}

export interface KnowledgeDriftContextRecord {
  id: string;
  target_type: string;
  target_id: string;
  drift_summary: string;
  baseline_id?: string;
  related_change_ids: string[];
  created_at: string;
}

export interface KnowledgeChangeHistoryRecord {
  id: string;
  target_type: string;
  target_id: string;
  change_summary: string;
  approved_by?: string;
  implemented_at?: string;
  validation_summary?: string;
  rollback_required?: boolean;
  created_at: string;
}

export interface KnowledgeRiskHistoryRecord {
  id: string;
  risk_title: string;
  risk_status: 'open' | 'accepted' | 'mitigated' | 'closed';
  affected_target?: string;
  evidence_links: string[];
  review_due?: string;
  created_at: string;
}

export interface IngestDocumentRequest {
  source_id: string;
  title: string;
  document_type: string;
  document_status?: 'draft' | 'approved' | 'retired';
  version?: string;
  author?: string;
  content: string;
  metadata_json?: Record<string, unknown>;
}

export interface KnowledgeSearchRequest {
  query: string;
  source_ids?: string[];
  document_type?: string;
  status?: 'draft' | 'approved' | 'retired';
  tags?: string[];
  limit?: number;
}

export interface KnowledgeSearchHit {
  document_id: string;
  chunk_id: string;
  title: string;
  heading: string;
  excerpt: string;
  score: number;
}

export interface KnowledgeAnswerResponse {
  answer: string;
  evidence: Array<{ document_id: string; chunk_id: string; title: string; heading: string }>;
  context: string;
  related_items: {
    decisions: KnowledgeDecision[];
    lessons: KnowledgeLessonLearned[];
    changes: KnowledgeChangeHistoryRecord[];
    risks: KnowledgeRiskHistoryRecord[];
  };
  confidence: 'High' | 'Medium' | 'Low';
  gaps: string[];
}

interface InMemoryKnowledgeState {
  sources: KnowledgeSource[];
  documents: KnowledgeDocument[];
  chunks: KnowledgeChunk[];
  entities: KnowledgeEntity[];
  relationships: KnowledgeRelationship[];
  decisions: KnowledgeDecision[];
  lessons: KnowledgeLessonLearned[];
  queries: KnowledgeQueryRecord[];
  baselines: KnowledgeBaselineRecord[];
  driftContexts: KnowledgeDriftContextRecord[];
  changeHistory: KnowledgeChangeHistoryRecord[];
  riskHistory: KnowledgeRiskHistoryRecord[];
}

const ENTITY_PATTERNS: Array<{ entity_type: string; pattern: RegExp }> = [
  { entity_type: 'VLAN', pattern: /\bVLAN[-\s]?\d+\b/gi },
  { entity_type: 'Device', pattern: /\b(AP|Switch|Gateway)[-\s]?[A-Za-z0-9]+\b/gi },
  { entity_type: 'Change', pattern: /\bCHG[-\s]?\d+\b/gi },
  { entity_type: 'Risk', pattern: /\bRISK[-\s]?\d+\b/gi },
  { entity_type: 'MOP', pattern: /\bMOP[-\s]?[A-Za-z0-9]+\b/gi },
];

function nowIso(): string {
  return new Date().toISOString();
}

function contentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function tokenizeCount(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

function splitStructured(content: string): Array<{ heading: string; content: string }> {
  const lines = content.split(/\r?\n/);
  const chunks: Array<{ heading: string; content: string }> = [];
  let currentHeading = 'General';
  let buffer: string[] = [];

  const flush = (): void => {
    const text = buffer.join('\n').trim();
    if (!text) return;
    chunks.push({ heading: currentHeading, content: text });
    buffer = [];
  };

  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line)) {
      flush();
      currentHeading = line.replace(/^#{1,6}\s+/, '').trim();
      continue;
    }
    buffer.push(line);
  }
  flush();

  if (chunks.length === 0 && content.trim()) {
    chunks.push({ heading: 'General', content: content.trim() });
  }

  return chunks;
}

function confidenceFromHits(hitCount: number): 'High' | 'Medium' | 'Low' {
  if (hitCount >= 5) return 'High';
  if (hitCount >= 2) return 'Medium';
  return 'Low';
}

function nextId(prefix: string, index: number): string {
  return `${prefix}-${String(index).padStart(6, '0')}`;
}

export class KnowledgeInstitutionalMemoryAgent {
  private readonly state: InMemoryKnowledgeState = {
    sources: [],
    documents: [],
    chunks: [],
    entities: [],
    relationships: [],
    decisions: [],
    lessons: [],
    queries: [],
    baselines: [],
    driftContexts: [],
    changeHistory: [],
    riskHistory: [],
  };

  constructor(private readonly shared: SharedSubsystems) {}

  listSources(): KnowledgeSource[] {
    return this.state.sources.slice();
  }

  registerSource(input: Omit<KnowledgeSource, 'id' | 'ingestion_status' | 'created_at' | 'updated_at'>): KnowledgeSource {
    const created: KnowledgeSource = {
      id: nextId('source', this.state.sources.length + 1),
      ingestion_status: 'pending',
      created_at: nowIso(),
      updated_at: nowIso(),
      ...input,
    };
    this.state.sources.push(created);
    this.shared.auditLogging.record({
      actorId: 'knowledge-agent',
      action: 'knowledge.source.register',
      outcome: 'success',
      details: created.source_name,
    });
    return created;
  }

  listDocuments(): KnowledgeDocument[] {
    return this.state.documents.slice();
  }

  listChunks(): KnowledgeChunk[] {
    return this.state.chunks.slice();
  }

  listEntities(): KnowledgeEntity[] {
    return this.state.entities.slice();
  }

  listRelationships(): KnowledgeRelationship[] {
    return this.state.relationships.slice();
  }

  listDecisions(): KnowledgeDecision[] {
    return this.state.decisions.slice();
  }

  listLessons(): KnowledgeLessonLearned[] {
    return this.state.lessons.slice();
  }

  listBaselines(): KnowledgeBaselineRecord[] {
    return this.state.baselines.slice();
  }

  listDriftContexts(): KnowledgeDriftContextRecord[] {
    return this.state.driftContexts.slice();
  }

  listChangeHistory(): KnowledgeChangeHistoryRecord[] {
    return this.state.changeHistory.slice();
  }

  listRiskHistory(): KnowledgeRiskHistoryRecord[] {
    return this.state.riskHistory.slice();
  }

  addDecision(decision: Omit<KnowledgeDecision, 'id' | 'created_at' | 'updated_at'>): KnowledgeDecision {
    const created: KnowledgeDecision = {
      id: nextId('decision', this.state.decisions.length + 1),
      created_at: nowIso(),
      updated_at: nowIso(),
      ...decision,
    };
    this.state.decisions.push(created);
    return created;
  }

  addLesson(lesson: Omit<KnowledgeLessonLearned, 'id' | 'created_at' | 'updated_at'>): KnowledgeLessonLearned {
    const created: KnowledgeLessonLearned = {
      id: nextId('lesson', this.state.lessons.length + 1),
      created_at: nowIso(),
      updated_at: nowIso(),
      ...lesson,
    };
    this.state.lessons.push(created);
    return created;
  }

  addBaseline(record: Omit<KnowledgeBaselineRecord, 'id' | 'created_at'>): KnowledgeBaselineRecord {
    const created: KnowledgeBaselineRecord = {
      id: nextId('baseline', this.state.baselines.length + 1),
      created_at: nowIso(),
      ...record,
    };
    this.state.baselines.push(created);
    return created;
  }

  addDriftContext(record: Omit<KnowledgeDriftContextRecord, 'id' | 'created_at'>): KnowledgeDriftContextRecord {
    const created: KnowledgeDriftContextRecord = {
      id: nextId('drift', this.state.driftContexts.length + 1),
      created_at: nowIso(),
      ...record,
    };
    this.state.driftContexts.push(created);
    return created;
  }

  addChangeHistory(record: Omit<KnowledgeChangeHistoryRecord, 'id' | 'created_at'>): KnowledgeChangeHistoryRecord {
    const created: KnowledgeChangeHistoryRecord = {
      id: nextId('change', this.state.changeHistory.length + 1),
      created_at: nowIso(),
      ...record,
    };
    this.state.changeHistory.push(created);
    return created;
  }

  addRiskHistory(record: Omit<KnowledgeRiskHistoryRecord, 'id' | 'created_at'>): KnowledgeRiskHistoryRecord {
    const created: KnowledgeRiskHistoryRecord = {
      id: nextId('risk', this.state.riskHistory.length + 1),
      created_at: nowIso(),
      ...record,
    };
    this.state.riskHistory.push(created);
    return created;
  }

  ingestDocument(input: IngestDocumentRequest): {
    document: KnowledgeDocument;
    chunks: KnowledgeChunk[];
    entities: KnowledgeEntity[];
    relationships: KnowledgeRelationship[];
    duplicate: boolean;
  } {
    const source = this.state.sources.find((item) => item.id === input.source_id);
    if (!source) {
      throw new Error(`Unknown source id: ${input.source_id}`);
    }

    source.ingestion_status = 'ingesting';
    source.updated_at = nowIso();

    const hash = contentHash(input.content);
    const existing = this.state.documents.find(
      (doc) => doc.source_id === input.source_id && doc.content_hash === hash && doc.version === (input.version ?? '1.0.0'),
    );
    if (existing) {
      source.ingestion_status = 'ingested';
      source.last_ingested_at = nowIso();
      source.updated_at = nowIso();
      return {
        document: existing,
        chunks: this.state.chunks.filter((chunk) => chunk.document_id === existing.id),
        entities: this.state.entities,
        relationships: this.state.relationships,
        duplicate: true,
      };
    }

    const document: KnowledgeDocument = {
      id: nextId('document', this.state.documents.length + 1),
      source_id: input.source_id,
      title: input.title,
      document_type: input.document_type,
      document_status: input.document_status ?? 'draft',
      version: input.version ?? '1.0.0',
      author: input.author ?? 'system',
      content_hash: hash,
      metadata_json: input.metadata_json ?? {},
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    this.state.documents.push(document);

    const sections = splitStructured(input.content);
    const chunkList: KnowledgeChunk[] = sections.map((section, index) => ({
      id: nextId('chunk', this.state.chunks.length + index + 1),
      document_id: document.id,
      chunk_index: index,
      heading: section.heading,
      content: section.content,
      token_count: tokenizeCount(section.content),
      content_hash: contentHash(section.content),
      embedding_id: `emb-${document.id}-${index}`,
      metadata_json: {
        title: document.title,
        document_type: document.document_type,
        version: document.version,
        source_uri: source.source_uri,
        author: document.author,
        approval_status: document.document_status,
        tags: input.metadata_json?.['tags'] ?? [],
      },
      created_at: nowIso(),
      updated_at: nowIso(),
    }));
    this.state.chunks.push(...chunkList);

    const entities: KnowledgeEntity[] = [];
    for (const pattern of ENTITY_PATTERNS) {
      const matches = input.content.match(pattern.pattern) ?? [];
      for (const match of matches) {
        const canonical = match.trim();
        if (this.state.entities.some((entity) => entity.canonical_name.toLowerCase() === canonical.toLowerCase())) {
          continue;
        }
        entities.push({
          id: nextId('entity', this.state.entities.length + entities.length + 1),
          entity_type: pattern.entity_type,
          canonical_name: canonical,
          display_name: canonical,
          aliases: [],
          metadata_json: {},
          created_at: nowIso(),
          updated_at: nowIso(),
        });
      }
    }
    this.state.entities.push(...entities);

    const relationships: KnowledgeRelationship[] = [];
    for (let i = 0; i < entities.length - 1; i += 1) {
      relationships.push({
        id: nextId('rel', this.state.relationships.length + relationships.length + 1),
        source_entity_id: entities[i].id,
        target_entity_id: entities[i + 1].id,
        relationship_type: 'relates_to',
        confidence: 0.6,
        evidence_document_id: document.id,
        evidence_chunk_id: chunkList[0]?.id,
        created_at: nowIso(),
        updated_at: nowIso(),
      });
    }
    this.state.relationships.push(...relationships);

    source.ingestion_status = 'ingested';
    source.last_ingested_at = nowIso();
    source.updated_at = nowIso();

    this.shared.observability.increment('knowledge.ingest.documents');
    this.shared.observability.increment('knowledge.ingest.chunks');
    this.shared.auditLogging.record({
      actorId: 'knowledge-agent',
      action: 'knowledge.ingest',
      outcome: 'success',
      details: `Ingested ${document.title} with ${chunkList.length} chunks`,
    });

    return {
      document,
      chunks: chunkList,
      entities,
      relationships,
      duplicate: false,
    };
  }

  search(input: KnowledgeSearchRequest): KnowledgeSearchHit[] {
    const query = input.query.toLowerCase().trim();
    const queryTerms = query
      .split(/\s+/)
      .map((term) => term.replace(/[^a-z0-9-]/g, ''))
      .filter((term) => term.length >= 3);
    const limit = input.limit ?? 20;

    const hits = this.state.chunks
      .map((chunk) => {
        const document = this.state.documents.find((doc) => doc.id === chunk.document_id);
        if (!document) return null;
        const sourceEligible = !input.source_ids || input.source_ids.includes(document.source_id);
        const typeEligible = !input.document_type || document.document_type === input.document_type;
        const statusEligible = !input.status || document.document_status === input.status;
        if (!sourceEligible || !typeEligible || !statusEligible) return null;

        const scoreText = `${document.title}\n${chunk.heading}\n${chunk.content}`.toLowerCase();
        let occurrences = scoreText.split(query).length - 1;
        if (occurrences === 0 && queryTerms.length > 0) {
          occurrences = queryTerms.reduce((acc, term) => acc + (scoreText.split(term).length - 1), 0);
        }
        const score = occurrences > 0 ? occurrences / Math.max(tokenizeCount(chunk.content), 1) : 0;
        if (score === 0) return null;
        return {
          document_id: document.id,
          chunk_id: chunk.id,
          title: document.title,
          heading: chunk.heading,
          excerpt: chunk.content.slice(0, 220),
          score,
        };
      })
      .filter((hit): hit is KnowledgeSearchHit => Boolean(hit))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return hits;
  }

  query(userId: string, text: string): KnowledgeAnswerResponse {
    const hits = this.search({ query: text, limit: 8 });
    if (hits.length === 0) {
      const noAnswer: KnowledgeAnswerResponse = {
        answer: 'No reliable source was found for this question.',
        evidence: [],
        context: 'The current knowledge base does not contain a trustworthy matching record.',
        related_items: {
          decisions: [],
          lessons: [],
          changes: [],
          risks: [],
        },
        confidence: 'Low',
        gaps: ['No matching approved sources', 'Ingest additional MOPs, change records, or risk records'],
      };
      this.recordQuery(userId, text, noAnswer, []);
      return noAnswer;
    }

    const evidence = hits.map((hit) => ({
      document_id: hit.document_id,
      chunk_id: hit.chunk_id,
      title: hit.title,
      heading: hit.heading,
    }));

    const confidence = confidenceFromHits(hits.length);
    const answer = `Based on retrieved knowledge artifacts, ${hits[0].title} provides the strongest evidence for this question.`;
    const context = `Retrieved ${hits.length} supporting chunks from institutional sources and prioritized by direct textual relevance.`;
    const relatedChanges = this.state.changeHistory.slice(0, 5);
    const relatedRisks = this.state.riskHistory.slice(0, 5);
    const relatedDecisions = this.state.decisions.slice(0, 5);
    const relatedLessons = this.state.lessons.slice(0, 5);
    const gaps = confidence === 'High' ? [] : ['Additional approved evidence would improve certainty'];

    const response: KnowledgeAnswerResponse = {
      answer,
      evidence,
      context,
      related_items: {
        decisions: relatedDecisions,
        lessons: relatedLessons,
        changes: relatedChanges,
        risks: relatedRisks,
      },
      confidence,
      gaps,
    };
    this.recordQuery(userId, text, response, evidence.map((item) => item.document_id));
    return response;
  }

  reindex(): { status: string; document_count: number; chunk_count: number } {
    this.shared.observability.increment('knowledge.reindex.invocations');
    this.shared.auditLogging.record({
      actorId: 'knowledge-agent',
      action: 'knowledge.reindex',
      outcome: 'success',
      details: `Documents=${this.state.documents.length}, Chunks=${this.state.chunks.length}`,
    });
    return {
      status: 'reindexed',
      document_count: this.state.documents.length,
      chunk_count: this.state.chunks.length,
    };
  }

  search_knowledge_base(query: string, limit = 10): KnowledgeSearchHit[] {
    return this.search({ query, limit });
  }

  get_document_by_id(documentId: string): KnowledgeDocument | undefined {
    return this.state.documents.find((doc) => doc.id === documentId);
  }

  get_related_entities(entityId: string): KnowledgeRelationship[] {
    return this.state.relationships.filter(
      (relationship) => relationship.source_entity_id === entityId || relationship.target_entity_id === entityId,
    );
  }

  private recordQuery(userId: string, queryText: string, result: KnowledgeAnswerResponse, sources: string[]): void {
    const record: KnowledgeQueryRecord = {
      id: nextId('query', this.state.queries.length + 1),
      user_id: userId,
      query_text: queryText,
      query_type: 'knowledge_backed',
      retrieved_sources: sources,
      answer_summary: result.answer,
      confidence: result.confidence,
      created_at: nowIso(),
    };
    this.state.queries.push(record);
    this.shared.observability.increment('knowledge.query.invocations');
  }
}
