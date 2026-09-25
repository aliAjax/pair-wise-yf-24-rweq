import { mockData } from "../mocks/seedData";
import type { PolicyDocument } from "../types/PolicyDocument";
import type { PolicySection } from "../types/PolicySection";
import type { DiffResult } from "../types/DiffResult";
import type { ReviewNote } from "../types/ReviewNote";
import { ERROR_CODES } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import { LOG_TEMPLATES } from "../constants/logTemplates";
import { listPolicySection } from "./PolicySection";
import { listDiffResult } from "./DiffResult";
import { listReviewNote } from "./ReviewNote";

const endpoint = "/api/policy-document";
const storageKey = "policy-diff:policy-document";

export class PolicyDocumentError extends Error {
  code: keyof typeof ERROR_CODES;
  constructor(code: keyof typeof ERROR_CODES, detail = "") {
    super(detail ? `${ERROR_MESSAGES[code]}（${detail}）` : ERROR_MESSAGES[code]);
    this.code = code;
  }
}

export interface PolicyDocumentRelations {
  sections: PolicySection[];
  diffResults: DiffResult[];
  reviewNotes: ReviewNote[];
  hasRelations: boolean;
}

const seedRows = (): PolicyDocument[] => [...(mockData.policyDocument as unknown as PolicyDocument[])].map((row) => ({ ...row }));

function readRows(): PolicyDocument[] {
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(storageKey);
    if (!raw) {
      const seeded = seedRows();
      localStorage.setItem(storageKey, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as PolicyDocument[];
  } catch {
    return seedRows();
  }
}

function writeRows(rows: PolicyDocument[]) {
  if (typeof localStorage !== "undefined") localStorage.setItem(storageKey, JSON.stringify(rows));
}

function mustFind(rows: PolicyDocument[], id: number): PolicyDocument {
  const found = rows.find((row) => row.id === id);
  if (!found) throw new PolicyDocumentError("VALIDATION_FAILED", `id=${id}`);
  return found;
}

export async function listPolicyDocument(): Promise<PolicyDocument[]> {
  if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    } catch {
      // Local mock fallback keeps the UI available during offline review.
    }
  }
  return readRows();
}

export async function getPolicyDocumentRelations(id: number): Promise<PolicyDocumentRelations> {
  const [sections, diffResults, reviewNotes] = await Promise.all([listPolicySection(), listDiffResult(), listReviewNote()]);
  const ownSections = sections.filter((row) => row.document_id === id);
  const ownDiffs = diffResults.filter((row) => row.old_document_id === id || row.new_document_id === id);
  const ownNotes = reviewNotes.filter((note) => ownDiffs.some((diff) => diff.id === note.diff_result_id));
  return {
    sections: ownSections,
    diffResults: ownDiffs,
    reviewNotes: ownNotes,
    hasRelations: ownSections.length > 0 || ownDiffs.length > 0 || ownNotes.length > 0
  };
}

export async function savePolicyDocument(payload: PolicyDocument) {
  const rows = readRows();
  const current = mustFind(rows, payload.id);
  if (current.lifecycle_status === "ARCHIVED") throw new PolicyDocumentError("ARCHIVED_READ_ONLY", current.title);
  const next = rows.map((row) => (row.id === payload.id ? { ...payload } : row));
  writeRows(next);
  console.info(LOG_TEMPLATES.PolicyDocument[1], payload);
  return payload;
}

export async function archivePolicyDocument(id: number, operator: string): Promise<PolicyDocument> {
  const rows = readRows();
  const current = mustFind(rows, id);
  const archived: PolicyDocument = {
    ...current,
    lifecycle_status: "ARCHIVED",
    archived_at: new Date().toISOString(),
    archived_by: operator
  };
  writeRows(rows.map((row) => (row.id === id ? archived : row)));
  console.info(LOG_TEMPLATES.PolicyDocument[4], { id, operator });
  return archived;
}

export async function restorePolicyDocument(id: number, operator: string): Promise<PolicyDocument> {
  const rows = readRows();
  const current = mustFind(rows, id);
  const conflict = rows.find((row) => row.id !== id && row.lifecycle_status === "ACTIVE" && row.title === current.title);
  if (conflict) throw new PolicyDocumentError("DUPLICATE_ACTIVE_TITLE", `${current.title} / ${conflict.version_label}`);
  const restored: PolicyDocument = {
    ...current,
    lifecycle_status: "ACTIVE",
    restored_at: new Date().toISOString(),
    restored_by: operator
  };
  writeRows(rows.map((row) => (row.id === id ? restored : row)));
  console.info(LOG_TEMPLATES.PolicyDocument[5], { id, operator });
  return restored;
}

export async function removePolicyDocument(id: number): Promise<number> {
  const rows = readRows();
  const current = mustFind(rows, id);
  const relations = await getPolicyDocumentRelations(id);
  if (relations.hasRelations) throw new PolicyDocumentError("DOCUMENT_HAS_RELATIONS", current.title);
  writeRows(rows.filter((row) => row.id !== id));
  console.info(LOG_TEMPLATES.PolicyDocument[6], { id });
  return id;
}

export async function exportPolicyDocument(id: number): Promise<string> {
  const current = mustFind(readRows(), id);
  const relations = await getPolicyDocumentRelations(id);
  const lines = [
    `# ${current.title}（${current.version_label}）`,
    ``,
    `- 状态：${current.lifecycle_status === "ARCHIVED" ? "已归档" : "活动"}`,
    `- 导入时间：${current.imported_at}`,
    `- 归档：${current.archived_at ?? "—"} / ${current.archived_by ?? "—"}`,
    `- 恢复：${current.restored_at ?? "—"} / ${current.restored_by ?? "—"}`,
    ``,
    `## 原文`,
    ``,
    current.raw_text,
    ``,
    `## 关联差异（${relations.diffResults.length}）`,
    ...relations.diffResults.map((diff) => `- [${diff.diff_type}] ${diff.summary}`),
    ``,
    `## 关联审阅（${relations.reviewNotes.length}）`,
    ...relations.reviewNotes.map((note) => `- [${note.status}] ${note.tag}：${note.comment}（${note.reviewer}）`)
  ];
  console.info(LOG_TEMPLATES.PolicyDocument[3], { id });
  return lines.join("\n");
}
