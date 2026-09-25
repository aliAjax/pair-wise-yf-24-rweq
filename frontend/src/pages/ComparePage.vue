<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { useDiffResultStore } from "../stores/DiffResultStore";
import { usePolicySectionStore } from "../stores/PolicySectionStore";
import { useReviewNoteStore } from "../stores/ReviewNoteStore";
import { formatDate, formatDocumentStatus } from "../utils/formatters";
import type { DiffResult } from "../types/DiffResult";
import type { PolicyDocument } from "../types/PolicyDocument";
import type { PolicySection } from "../types/PolicySection";
import type { ReviewNote } from "../types/ReviewNote";
import StatusBadge from "../components/common/StatusBadge.vue";
import RiskTag from "../components/common/RiskTag.vue";
import EmptyState from "../components/common/EmptyState.vue";

interface ResultRow {
  diff: DiffResult;
  oldDoc?: PolicyDocument;
  newDoc?: PolicyDocument;
  section?: PolicySection;
  notes: ReviewNote[];
}

const documentStore = usePolicyDocumentStore();
const diffStore = useDiffResultStore();
const sectionStore = usePolicySectionStore();
const noteStore = useReviewNoteStore();

onMounted(() => {
  void documentStore.load();
  void diffStore.load();
  void sectionStore.load();
  void noteStore.load();
});

const docById = (id: number) => documentStore.rows.find((row) => row.id === id);

const results = computed<ResultRow[]>(() =>
  diffStore.rows.map((diff) => ({
    diff,
    oldDoc: docById(diff.old_document_id),
    newDoc: docById(diff.new_document_id),
    section: sectionStore.rows.find((section) => section.id === diff.section_id),
    notes: noteStore.rows.filter((note) => note.diff_result_id === diff.id)
  }))
);

const oldId = ref<number | null>(null);
const newId = ref<number | null>(null);
const compared = ref(false);
const canCompare = computed(() => oldId.value !== null && newId.value !== null && oldId.value !== newId.value);
const matched = computed(() => results.value.filter(({ diff }) => diff.old_document_id === oldId.value && diff.new_document_id === newId.value));

function onOldChange(event: Event) {
  oldId.value = Number((event.target as HTMLSelectElement).value) || null;
  compared.value = false;
}
function onNewChange(event: Event) {
  newId.value = Number((event.target as HTMLSelectElement).value) || null;
  compared.value = false;
}
function onCompare() {
  if (canCompare.value) compared.value = true;
}

const detail = ref<ResultRow | null>(null);
const detailReadonly = computed(() => !!detail.value && (detail.value.oldDoc?.status === "ARCHIVED" || detail.value.newDoc?.status === "ARCHIVED"));
</script>

<template>
  <section class="panel wide">
    <h2>发起新对比</h2>
    <div class="compare-bar">
      <label class="field">
        <span>旧版本</span>
        <select @change="onOldChange">
          <option value="">请选择活动版本</option>
          <option v-for="doc in documentStore.activeRows" :key="doc.id" :value="doc.id">{{ doc.title }}（{{ doc.version_label }}）</option>
        </select>
      </label>
      <label class="field">
        <span>新版本</span>
        <select @change="onNewChange">
          <option value="">请选择活动版本</option>
          <option v-for="doc in documentStore.activeRows" :key="doc.id" :value="doc.id">{{ doc.title }}（{{ doc.version_label }}）</option>
        </select>
      </label>
      <button class="btn primary" :disabled="!canCompare" @click="onCompare">开始对比</button>
    </div>
    <p class="hint">仅活动版本可参与新对比；已归档版本（{{ documentStore.archivedCount }} 个）不再出现在选择列表中。</p>
    <template v-if="compared">
      <EmptyState v-if="!matched.length" />
      <article v-for="row in matched" :key="row.diff.id" class="section-block">
        <header><strong>#{{ row.diff.id }} {{ row.diff.summary }}</strong><StatusBadge :value="row.diff.diff_type" /></header>
        <p>{{ formatDate(row.diff.created_at) }}</p>
      </article>
    </template>
  </section>

  <section class="panel wide">
    <h2>历史差异结果（{{ results.length }}）</h2>
    <p class="hint">涉及已归档版本的结果保留入口，打开后只读。</p>
    <table v-if="results.length" class="list">
      <thead>
        <tr><th>ID</th><th>类型</th><th>旧版本</th><th>新版本</th><th>摘要</th><th>时间</th><th>操作</th></tr>
      </thead>
      <tbody>
        <tr v-for="row in results" :key="row.diff.id">
          <td>#{{ row.diff.id }}</td>
          <td><StatusBadge :value="row.diff.diff_type" /></td>
          <td>
            {{ row.oldDoc?.title ?? "已清理" }}
            <StatusBadge v-if="row.oldDoc?.status === 'ARCHIVED'" :value="formatDocumentStatus('ARCHIVED')" />
          </td>
          <td>
            {{ row.newDoc?.title ?? "已清理" }}
            <StatusBadge v-if="row.newDoc?.status === 'ARCHIVED'" :value="formatDocumentStatus('ARCHIVED')" />
          </td>
          <td>{{ row.diff.summary }}</td>
          <td>{{ formatDate(row.diff.created_at) }}</td>
          <td class="actions"><button class="btn ghost" @click="detail = row">查看</button></td>
        </tr>
      </tbody>
    </table>
    <EmptyState v-else />
  </section>

  <div v-if="detail" class="modal-mask" @click.self="detail = null">
    <div class="modal">
      <header>
        <h2>差异 #{{ detail.diff.id }}</h2>
        <StatusBadge :value="detail.diff.diff_type" />
      </header>
      <p v-if="detailReadonly" class="hint">该结果涉及已归档版本，内容只读。</p>
      <dl class="kv">
        <div><dt>旧版本</dt><dd>{{ detail.oldDoc ? `${detail.oldDoc.title}（${detail.oldDoc.version_label}）` : "已清理" }}</dd></div>
        <div><dt>新版本</dt><dd>{{ detail.newDoc ? `${detail.newDoc.title}（${detail.newDoc.version_label}）` : "已清理" }}</dd></div>
        <div><dt>创建时间</dt><dd>{{ formatDate(detail.diff.created_at) }}</dd></div>
      </dl>
      <h3>摘要</h3>
      <p>{{ detail.diff.summary }}</p>
      <template v-if="detail.section">
        <h3>关联条款</h3>
        <article class="section-block">
          <header><strong>{{ detail.section.section_no }} {{ detail.section.heading }}</strong><RiskTag :level="detail.section.risk_level" /></header>
          <p>{{ detail.section.content }}</p>
        </article>
      </template>
      <h3>审阅备注（{{ detail.notes.length }}）</h3>
      <EmptyState v-if="!detail.notes.length" />
      <article v-for="note in detail.notes" :key="note.id" class="section-block">
        <header><strong>{{ note.tag }}</strong><StatusBadge :value="note.status" /></header>
        <p>{{ note.comment }} — {{ note.reviewer }}</p>
      </article>
      <footer class="actions">
        <button class="btn ghost" @click="detail = null">关闭</button>
      </footer>
    </div>
  </div>
</template>
