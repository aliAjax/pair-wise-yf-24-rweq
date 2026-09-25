export const DocumentLifecycleStatus = ["ACTIVE", "ARCHIVED"] as const;
export type DocumentLifecycleStatus = (typeof DocumentLifecycleStatus)[number];
export const DocumentLifecycleStatusText: Record<DocumentLifecycleStatus, string> = {
  ACTIVE: "活动",
  ARCHIVED: "已归档"
};
