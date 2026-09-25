export const DocumentStatus = ["ACTIVE","ARCHIVED"] as const;
export type DocumentStatus = (typeof DocumentStatus)[number];
export const DocumentStatusText: Record<DocumentStatus, string> = Object.fromEntries(DocumentStatus.map((value) => [value, value.replace(/_/g, " ")])) as Record<DocumentStatus, string>;
