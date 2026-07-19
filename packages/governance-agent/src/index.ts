import type { SharedSubsystems, StoredArtifact, ApprovalRequest } from '@unifi/shared-core';

export type GovernanceOutputFormat = 'markdown' | 'word' | 'html' | 'pdf';

export interface SourceInput {
  system: string;
  summary: string;
}

export interface GovernanceGenerationRequest {
  projectNameToken: string;
  siteNameToken?: string;
  serverNameToken?: string;
  ipAddressToken?: string;
  versionToken?: string;
  sourceInputs: SourceInput[];
  formats: GovernanceOutputFormat[];
}

export interface GeneratedDocument {
  id: string;
  setName: string;
  title: string;
  filename: string;
  format: GovernanceOutputFormat;
  mimeType: string;
  content: string;
}

export interface GovernanceGenerationResponse {
  documents: GeneratedDocument[];
  executiveSummary: string;
  approvalRequest: ApprovalRequest;
  observability: Record<string, number>;
  futureIntegrations: {
    sharePointPages: string;
    microsoft365Connectors: string;
    powerPlatformConnectors: string;
  };
}

interface DocumentSetDefinition {
  setName: string;
  code: string;
  title: string;
  bodyTemplate: string;
}

const DOCUMENT_SETS: DocumentSetDefinition[] = [
  { setName: '00 - Project Overview', code: '00', title: 'Project Overview', bodyTemplate: 'Project {{PROJECT_NAME}} at {{SITE_NAME}} is documented as version {{VERSION}} for controlled operations.' },
  { setName: '01 - Architecture', code: '01', title: 'Architecture Document', bodyTemplate: 'Architecture baseline for {{PROJECT_NAME}}: server {{SERVER_NAME}}, network endpoint {{IP_ADDRESS}}.' },
  { setName: '02 - Security', code: '02', title: 'Security Baseline', bodyTemplate: 'Security controls for {{PROJECT_NAME}} reference change {{CHANGE_ID}} and approver {{APPROVER_NAME}}.' },
  { setName: '03 - Deployment', code: '03', title: 'Deployment Guide', bodyTemplate: 'Deployment workflow for {{PROJECT_NAME}} aligns to approved change {{CHANGE_ID}} and date {{DATE_APPROVED}}.' },
  { setName: '04 - Configuration', code: '04', title: 'Configuration Baseline', bodyTemplate: 'Configuration baseline records {{SERVER_NAME}} and {{IP_ADDRESS}} with release {{VERSION}}.' },
  { setName: '05 - Operations', code: '05', title: 'Operations Manual', bodyTemplate: 'Operational runbook for {{PROJECT_NAME}} with site {{SITE_NAME}} and service server {{SERVER_NAME}}.' },
  { setName: '06 - Support', code: '06', title: 'Support Procedures', bodyTemplate: 'Support matrix and escalation paths for {{PROJECT_NAME}} under change control {{CHANGE_ID}}.' },
  { setName: '07 - Disaster Recovery', code: '07', title: 'Disaster Recovery Plan', bodyTemplate: 'Recovery posture for {{PROJECT_NAME}} includes validated assets at {{SITE_NAME}} and host {{SERVER_NAME}}.' },
  { setName: '08 - Governance', code: '08', title: 'Governance and Compliance', bodyTemplate: 'Governance evidence captures approvals by {{APPROVER_NAME}} and compliance dates {{DATE_APPROVED}}.' },
  { setName: '09 - Change Log', code: '09', title: 'Change Log', bodyTemplate: 'Change log entries track {{CHANGE_ID}} transitions and version token {{VERSION}}.' },
  { setName: '10 - Lessons Learned', code: '10', title: 'Lessons Learned', bodyTemplate: 'Lessons learned summary for {{PROJECT_NAME}} tied to approvals and final outcome by {{APPROVER_NAME}}.' },
  { setName: 'Appendices', code: '11', title: 'Appendices', bodyTemplate: 'Appendices contain diagrams, inventories, and references for {{PROJECT_NAME}} and {{SITE_NAME}}.' },
  { setName: 'Glossary', code: '12', title: 'Glossary', bodyTemplate: 'Glossary of terms for {{PROJECT_NAME}} and governance identifiers such as {{CHANGE_ID}}.' },
  { setName: 'Reference Materials', code: '13', title: 'Reference Materials', bodyTemplate: 'Reference links and source evidence from systems contributing to {{PROJECT_NAME}} records.' },
];

function toMarkdown(set: DocumentSetDefinition, request: GovernanceGenerationRequest): string {
  const sourceLines = request.sourceInputs.map((source) => `- **${source.system}**: ${source.summary}`).join('\n');
  return `# ${set.setName}\n\n## ${set.title}\n\n${set.bodyTemplate}\n\n## Source Systems\n${sourceLines}\n\n## Required Tokens\n- {{PROJECT_NAME}}\n- {{SERVER_NAME}}\n- {{IP_ADDRESS}}\n- {{SITE_NAME}}\n- {{CHANGE_ID}}\n- {{APPROVER_NAME}}\n- {{DATE_APPROVED}}\n- {{VERSION}}\n`;
}

function toHtml(markdown: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>{{PROJECT_NAME}} Governance Artifact</title></head><body><pre>${markdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`;
}

function toWordTemplate(markdown: string): string {
  return `WORD_TEMPLATE_START\n${markdown}\nWORD_TEMPLATE_END`;
}

function toPdfTemplate(markdown: string): string {
  return `PDF_TEMPLATE_START\n${markdown}\nPDF_TEMPLATE_END`;
}

function toMimeType(format: GovernanceOutputFormat): string {
  if (format === 'markdown') return 'text/markdown';
  if (format === 'html') return 'text/html';
  if (format === 'word') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/pdf';
}

function toContent(format: GovernanceOutputFormat, markdown: string): string {
  if (format === 'markdown') return markdown;
  if (format === 'html') return toHtml(markdown);
  if (format === 'word') return toWordTemplate(markdown);
  return toPdfTemplate(markdown);
}

function makeArtifactRecord(doc: GeneratedDocument): StoredArtifact {
  return {
    id: doc.id,
    createdAt: new Date().toISOString(),
    agent: 'tech-elixir-governance-agent',
    category: doc.setName,
    format: doc.format,
    title: doc.title,
    filename: doc.filename,
    content: doc.content,
  };
}

export class GovernanceDocumentationAgent {
  constructor(private readonly shared: SharedSubsystems) {}

  generate(request: GovernanceGenerationRequest): GovernanceGenerationResponse {
    const documents: GeneratedDocument[] = [];

    for (const set of DOCUMENT_SETS) {
      const markdown = toMarkdown(set, request);
      for (const format of request.formats) {
        const extension = format === 'markdown' ? 'md' : format === 'html' ? 'html' : format === 'word' ? 'docx' : 'pdf';
        const document: GeneratedDocument = {
          id: `${set.code}-${format}`,
          setName: set.setName,
          title: set.title,
          filename: `${set.code}-${set.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${extension}`,
          format,
          mimeType: toMimeType(format),
          content: toContent(format, markdown),
        };
        documents.push(document);
        this.shared.database.saveArtifact(makeArtifactRecord(document));
      }
    }

    const executiveSummary = this.shared.reportingEngine.createExecutiveSummary({
      projectNameToken: request.projectNameToken,
      artifactCount: documents.length,
      sourceSystems: request.sourceInputs.map((source) => source.system),
    });

    const approvalRequest = this.shared.approvalWorkflows.createRequest('{{CHANGE_ID}}', '{{PROJECT_NAME}}');
    this.shared.observability.increment('governance.documents.generated');
    this.shared.observability.increment('governance.approval.requests.created');
    this.shared.auditLogging.record({
      actorId: 'tech-elixir-governance-agent',
      action: 'governance.generate',
      outcome: 'success',
      details: `Generated ${documents.length} artifacts across ${request.formats.join(', ')}`,
    });

    return {
      documents,
      executiveSummary,
      approvalRequest,
      observability: this.shared.observability.snapshot(),
      futureIntegrations: {
        sharePointPages: 'Planned: map each numbered document set to SharePoint page templates with token hydration.',
        microsoft365Connectors: 'Planned: ingest change tickets, Teams approvals, and M365 compliance data.',
        powerPlatformConnectors: 'Planned: consume Dataverse and Power Automate approvals as governance evidence.',
      },
    };
  }
}
