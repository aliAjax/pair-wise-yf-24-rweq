import { mockData } from "../mocks/seedData";
import type { PolicyDocument } from "../types/PolicyDocument";
import { LOG_TEMPLATES } from "../constants/logTemplates";
import { ERROR_CODES } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";

const endpoint = "/api/policy-document";
const storageKey = "policy-diff:policy-document:v1";

const [LOG_CREATE, LOG_UPDATE, LOG_STATUS, , LOG_ARCHIVE, LOG_RESTORE, LOG_REMOVE] = LOG_TEMPLATES.PolicyDocument;

const seedRows = (): PolicyDocument[] => JSON.parse(JSON.stringify(mockData.policyDocument)) as PolicyDocument[];

function readRows(): PolicyDocument[] {
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(storageKey);
    if (raw) return JSON.parse(raw) as PolicyDocument[];
  } catch {
    // Broken cache falls back to the bundled seed data.
  }
  const seeded = seedRows();
  writeRows(seeded);
  return seeded;
}

function writeRows(rows: PolicyDocument[]) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(storageKey, JSON.stringify(rows));
  } catch {
    // Read-only environments still serve the in-memory rows.
  }
}

function codedError(code: keyof typeof ERROR_CODES): Error {
  return Object.assign(new Error(ERROR_MESSAGES[code]), { code: ERROR_CODES[code] });
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

export async function savePolicyDocument(payload: PolicyDocument) {
  const rows = readRows();
  const index = rows.findIndex((row) => row.id === payload.id);
  if (index >= 0) rows[index] = payload;
  else rows.push(payload);
  writeRows(rows);
  console.info(index >= 0 ? LOG_UPDATE : LOG_CREATE, payload);
  return payload;
}

export async function archivePolicyDocument(id: number, operator: string) {
  const rows = readRows();
  const target = rows.find((row) => row.id === id);
  if (!target) throw codedError("DOCUMENT_NOT_FOUND");
  target.status = "ARCHIVED";
  target.archived_by = operator;
  target.archived_at = new Date().toISOString();
  writeRows(rows);
  console.info(LOG_ARCHIVE, { id, operator });
  console.info(LOG_STATUS, { id, status: target.status });
  return target;
}

export async function restorePolicyDocument(id: number, operator: string) {
  const rows = readRows();
  const target = rows.find((row) => row.id === id);
  if (!target) throw codedError("DOCUMENT_NOT_FOUND");
  const duplicate = rows.find((row) => row.id !== id && row.status === "ACTIVE" && row.title === target.title);
  if (duplicate) throw codedError("DUPLICATE_ACTIVE_TITLE");
  target.status = "ACTIVE";
  target.restored_by = operator;
  target.restored_at = new Date().toISOString();
  writeRows(rows);
  console.info(LOG_RESTORE, { id, operator });
  console.info(LOG_STATUS, { id, status: target.status });
  return target;
}

export async function removePolicyDocument(id: number) {
  const rows = readRows();
  const target = rows.find((row) => row.id === id);
  if (!target) throw codedError("DOCUMENT_NOT_FOUND");
  writeRows(rows.filter((row) => row.id !== id));
  console.info(LOG_REMOVE, { id });
  return target;
}
