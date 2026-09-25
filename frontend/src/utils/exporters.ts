import type { PolicyDocument } from "../types/PolicyDocument";
import type { DocumentAssociations } from "./documentAssociations";
import { formatDate, formatDocumentStatus, formatOperator, formatRisk, formatStatus } from "./formatters";
import { LOG_TEMPLATES } from "../constants/logTemplates";

const [, , , LOG_EXPORT] = LOG_TEMPLATES.PolicyDocument;

export function buildDocumentArchiveMarkdown(document: PolicyDocument, associations: DocumentAssociations): string {
  const lines: string[] = [
    `# ${document.title}（${document.version_label}）`,
    "",
    `- 状态：${formatDocumentStatus(document.status)}`,
    `- 导入时间：${formatDate(document.imported_at)}`,
    `- 归档处理人：${formatOperator(document.archived_by)}`,
    `- 归档时间：${document.archived_at ? formatDate(document.archived_at) : "—"}`,
    "",
    "## 原文",
    "",
    "```text",
    document.raw_text,
    "```",
    "",
    "## 关联条款",
    ""
  ];
  if (associations.sections.length === 0) lines.push("（无）");
  for (const section of associations.sections) {
    lines.push(`- ${section.section_no} ${section.heading}（风险：${formatRisk(section.risk_level)}）：${section.content}`);
  }
  lines.push("", "## 关联差异", "");
  if (associations.diffs.length === 0) lines.push("（无）");
  for (const diff of associations.diffs) {
    lines.push(`- [${formatStatus(diff.diff_type)}] ${diff.summary}（${formatDate(diff.created_at)}）`);
  }
  lines.push("", "## 关联审阅备注", "");
  if (associations.notes.length === 0) lines.push("（无）");
  for (const note of associations.notes) {
    lines.push(`- ${note.tag}｜${note.comment}｜${note.reviewer}｜${formatStatus(note.status)}`);
  }
  lines.push("");
  return lines.join("\n");
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportDocumentArchive(document: PolicyDocument, associations: DocumentAssociations) {
  console.info(LOG_EXPORT, { id: document.id, status: document.status });
  downloadTextFile(`${document.title}-${document.version_label}.md`, buildDocumentArchiveMarkdown(document, associations));
}
