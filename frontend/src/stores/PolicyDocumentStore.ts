import { defineStore } from "pinia";
import {
  listPolicyDocument,
  archivePolicyDocument,
  restorePolicyDocument,
  removePolicyDocument,
  PolicyDocumentError
} from "../api/PolicyDocument";
import { LOG_TEMPLATES } from "../constants/logTemplates";

const operatorKey = "policy-diff:operator";
const storedOperator = () => (typeof localStorage === "undefined" ? null : localStorage.getItem(operatorKey));

export const usePolicyDocumentStore = defineStore("policyDocument", {
  state: () => ({
    rows: [] as Awaited<ReturnType<typeof listPolicyDocument>>,
    loading: false,
    operator: storedOperator() ?? "本地审阅员",
    lastError: ""
  }),
  getters: {
    activeRows: (state) => state.rows.filter((row) => row.lifecycle_status === "ACTIVE"),
    archivedRows: (state) => state.rows.filter((row) => row.lifecycle_status === "ARCHIVED"),
    activeCount(): number {
      return this.activeRows.length;
    },
    archivedCount(): number {
      return this.archivedRows.length;
    }
  },
  actions: {
    async load() {
      this.loading = true;
      this.rows = await listPolicyDocument();
      this.loading = false;
    },
    setOperator(name: string) {
      this.operator = name.trim() || "本地审阅员";
      if (typeof localStorage !== "undefined") localStorage.setItem(operatorKey, this.operator);
    },
    async run(action: () => Promise<unknown>) {
      this.lastError = "";
      try {
        await action();
      } catch (error) {
        this.lastError = error instanceof PolicyDocumentError ? error.message : String(error);
        console.warn(LOG_TEMPLATES.PolicyDocument[2], this.lastError);
      } finally {
        await this.load();
      }
      return this.lastError === "";
    },
    async archive(id: number) {
      return this.run(() => archivePolicyDocument(id, this.operator));
    },
    async restore(id: number) {
      return this.run(() => restorePolicyDocument(id, this.operator));
    },
    async remove(id: number) {
      return this.run(() => removePolicyDocument(id));
    }
  }
});
