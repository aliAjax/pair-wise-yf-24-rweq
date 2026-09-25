import { defineStore } from "pinia";
import { archivePolicyDocument, listPolicyDocument, removePolicyDocument, restorePolicyDocument } from "../api/PolicyDocument";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import { LOG_TEMPLATES } from "../constants/logTemplates";
import type { PolicyDocument } from "../types/PolicyDocument";

const operatorKey = "policy-diff:operator";
const [, , , , , LOG_RESTORE] = LOG_TEMPLATES.PolicyDocument;

export const usePolicyDocumentStore = defineStore("policyDocument", {
  state: () => ({
    rows: [] as Awaited<ReturnType<typeof listPolicyDocument>>,
    loading: false,
    operator: (typeof localStorage === "undefined" ? null : localStorage.getItem(operatorKey)) ?? ""
  }),
  getters: {
    activeRows: (state): PolicyDocument[] => state.rows.filter((row) => row.status === "ACTIVE"),
    archivedRows: (state): PolicyDocument[] => state.rows.filter((row) => row.status === "ARCHIVED"),
    activeCount(): number { return this.activeRows.length; },
    archivedCount(): number { return this.archivedRows.length; },
    operatorName(): string { return this.operator.trim() || "未署名"; }
  },
  actions: {
    async load() { this.loading = true; this.rows = await listPolicyDocument(); this.loading = false; },
    setOperator(name: string) {
      this.operator = name;
      try {
        if (typeof localStorage !== "undefined") localStorage.setItem(operatorKey, name);
      } catch {
        // Operator name is kept in memory when persistence is unavailable.
      }
    },
    async archive(id: number) { await archivePolicyDocument(id, this.operatorName); await this.load(); },
    async restore(id: number) {
      const target = this.rows.find((row) => row.id === id);
      if (target && this.activeRows.some((row) => row.title === target.title)) {
        console.error(LOG_RESTORE, { id, reason: "DUPLICATE_ACTIVE_TITLE" });
        throw new Error(ERROR_MESSAGES.DUPLICATE_ACTIVE_TITLE);
      }
      await restorePolicyDocument(id, this.operatorName);
      await this.load();
    },
    async remove(id: number) { await removePolicyDocument(id); await this.load(); }
  }
});
