import type { DiffResult } from "../types/DiffResult";
import type { PolicySection } from "../types/PolicySection";
import type { ReviewNote } from "../types/ReviewNote";

export interface DocumentAssociations {
  diffs: DiffResult[];
  sections: PolicySection[];
  notes: ReviewNote[];
}

export const emptyDocumentAssociations = (): DocumentAssociations => ({ diffs: [], sections: [], notes: [] });

export function findDocumentAssociations(documentId: number, diffs: DiffResult[], sections: PolicySection[], notes: ReviewNote[]): DocumentAssociations {
  const relatedDiffs = diffs.filter((diff) => diff.old_document_id === documentId || diff.new_document_id === documentId);
  const relatedSections = sections.filter((section) => section.document_id === documentId);
  const diffIds = new Set(relatedDiffs.map((diff) => diff.id));
  const relatedNotes = notes.filter((note) => diffIds.has(note.diff_result_id));
  return { diffs: relatedDiffs, sections: relatedSections, notes: relatedNotes };
}

export function hasDocumentAssociations(associations: DocumentAssociations): boolean {
  return associations.diffs.length + associations.sections.length + associations.notes.length > 0;
}
