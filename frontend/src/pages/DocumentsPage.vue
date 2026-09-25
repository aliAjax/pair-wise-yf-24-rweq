<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { useDiffResultStore } from "../stores/DiffResultStore";
import { usePolicySectionStore } from "../stores/PolicySectionStore";
import { useReviewNoteStore } from "../stores/ReviewNoteStore";
import { emptyDocumentAssociations, findDocumentAssociations, hasDocumentAssociations, type DocumentAssociations } from "../utils/documentAssociations";
import { exportDocumentArchive } from "../utils/exporters";
import { formatDate, formatDocumentStatus, formatOperator } from "../utils/formatters";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import StatCard from "../components/common/StatCard.vue";
import StatusBadge from "../components/common/StatusBadge.vue";
import RiskTag from "../components/common/RiskTag.vue";
import EmptyState from "../components/common/EmptyState.vue";

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

const associationsById = computed(() => {
  const map = new Map<number, DocumentAssociations>();
  for (const row of documentStore.rows) {
    map.set(row.id, findDocumentAssociations(row.id, diffStore.rows, sectionStore.rows, noteStore.rows));
  }
  return map;
});
const associationsOf = (id: number) => associationsById.value.get(id) ?? emptyDocumentAssociations();
const canPurge = (id: number) => !hasDocumentAssociations(associationsOf(id));
const purgeableCount = computed(() => documentStore.rows.filter((row) => canPurge(row.id)).length);

const feedback = ref("");
const detailId = ref<number | null>(null);
const detailDocument = computed(() => documentStore.rows.find((row) => row.id === detailId.value) ?? null);
const detailAssociations = computed(() => (detailId.value === null ? emptyDocumentAssociations() : associationsOf(detailId.value)));

function onOperatorInput(event: Event) {
  documentStore.setOperator((event.target as HTMLInputElement).value);
}

async function run(action: () => Promise<void>) {
  feedback.value = "";
  try {
    await action();
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : String(error);
  }
}

function onArchive(id: number) {
  if (window.confirm("归档后该版本不再参与新对比，历史差异与审阅记录保留只读入口。确认归档？")) {
    void run(() => documentStore.archive(id));
  }
}

function onRestore(id: number) {
  void run(() => documentStore.restore(id));
}

function onPurge(id: number) {
  if (!canPurge(id)) {
    feedback.value = ERROR_MESSAGES.DOCUMENT_HAS_ASSOCIATIONS;
    return;
  }
  if (window.confirm("该版本没有关联记录，彻底删除后不可恢复。确认删除？")) {
    void run(() => documentStore.remove(id));
  }
}

function onExport(id: number) {
  const document = documentStore.rows.find((row) => row.id === id);
  if (document) exportDocumentArchive(document, associationsOf(id));
}
</script>

<template>
  <section class="metrics">
    <StatCard label="活动版本" :value="documentStore.activeCount" />
    <StatCard label="已归档" :value="documentStore.archivedCount" />
    <StatCard label="可彻底清理" :value="purgeableCount" />
  </section>

  <section class="toolbar">
    <label class="field">
      <span>处理人</span>
      <input :value="documentStore.operator" placeholder="留空则记为「未署名」" @input="onOperatorInput" />
    </label>
    <p class="hint">归档与恢复操作会记录处理人和时间；已归档版本不参与新对比，历史结果仍可只读查看与导出。</p>
  </section>

  <p v-if="feedback" class="alert-error">{{ feedback }}</p>

  <section class="panel wide">
    <h2>活动版本（{{ documentStore.activeCount }}）</h2>
    <table v-if="documentStore.activeRows.length" class="list">
      <thead>
        <tr><th>标题</th><th>版本</th><th>导入时间</th><th>关联记录</th><th>恢复记录</th><th>操作</th></tr>
      </thead>
      <tbody>
        <tr v-for="row in documentStore.activeRows" :key="row.id">
          <td><strong>{{ row.title }}</strong></td>
          <td>{{ row.version_label }}</td>
          <td>{{ formatDate(row.imported_at) }}</td>
          <td>差异 {{ associationsOf(row.id).diffs.length }} / 条款 {{ associationsOf(row.id).sections.length }} / 备注 {{ associationsOf(row.id).notes.length }}</td>
          <td>
            <template v-if="row.restored_at">{{ formatOperator(row.restored_by) }} · {{ formatDate(row.restored_at) }}</template>
            <template v-else>—</template>
          </td>
          <td class="actions">
            <button class="btn ghost" @click="detailId = row.id">查看</button>
            <button class="btn primary" @click="onArchive(row.id)">归档</button>
            <button class="btn danger" :disabled="!canPurge(row.id)" :title="canPurge(row.id) ? '彻底删除该版本' : ERROR_MESSAGES.DOCUMENT_HAS_ASSOCIATIONS" @click="onPurge(row.id)">彻底删除</button>
          </td>
        </tr>
      </tbody>
    </table>
    <EmptyState v-else />
  </section>

  <section class="panel wide">
    <h2>已归档（{{ documentStore.archivedCount }}）</h2>
    <table v-if="documentStore.archivedRows.length" class="list">
      <thead>
        <tr><th>标题</th><th>版本</th><th>归档处理人</th><th>归档时间</th><th>操作</th></tr>
      </thead>
      <tbody>
        <tr v-for="row in documentStore.archivedRows" :key="row.id">
          <td><strong>{{ row.title }}</strong> <StatusBadge :value="formatDocumentStatus(row.status)" /></td>
          <td>{{ row.version_label }}</td>
          <td>{{ formatOperator(row.archived_by) }}</td>
          <td>{{ row.archived_at ? formatDate(row.archived_at) : "—" }}</td>
          <td class="actions">
            <button class="btn ghost" @click="detailId = row.id">查看</button>
            <button class="btn primary" @click="onRestore(row.id)">恢复</button>
            <button class="btn ghost" @click="onExport(row.id)">导出</button>
            <button class="btn danger" :disabled="!canPurge(row.id)" :title="canPurge(row.id) ? '彻底删除该版本' : ERROR_MESSAGES.DOCUMENT_HAS_ASSOCIATIONS" @click="onPurge(row.id)">彻底删除</button>
          </td>
        </tr>
      </tbody>
    </table>
    <EmptyState v-else />
  </section>

  <div v-if="detailDocument" class="modal-mask" @click.self="detailId = null">
    <div class="modal">
      <header>
        <h2>{{ detailDocument.title }}（{{ detailDocument.version_label }}）</h2>
        <StatusBadge :value="formatDocumentStatus(detailDocument.status)" />
      </header>
      <p v-if="detailDocument.status === 'ARCHIVED'" class="hint">已归档版本内容只读，可导出存档。</p>
      <dl class="kv">
        <div><dt>导入时间</dt><dd>{{ formatDate(detailDocument.imported_at) }}</dd></div>
        <div><dt>归档处理人</dt><dd>{{ formatOperator(detailDocument.archived_by) }}</dd></div>
        <div><dt>归档时间</dt><dd>{{ detailDocument.archived_at ? formatDate(detailDocument.archived_at) : "—" }}</dd></div>
        <div><dt>最近恢复</dt><dd>{{ detailDocument.restored_at ? `${formatOperator(detailDocument.restored_by)} · ${formatDate(detailDocument.restored_at)}` : "—" }}</dd></div>
      </dl>
      <h3>原文</h3>
      <pre class="raw">{{ detailDocument.raw_text }}</pre>
      <h3>关联条款（{{ detailAssociations.sections.length }}）</h3>
      <EmptyState v-if="!detailAssociations.sections.length" />
      <article v-for="section in detailAssociations.sections" :key="section.id" class="section-block">
        <header><strong>{{ section.section_no }} {{ section.heading }}</strong><RiskTag :level="section.risk_level" /></header>
        <p>{{ section.content }}</p>
      </article>
      <h3>关联差异（{{ detailAssociations.diffs.length }}）</h3>
      <EmptyState v-if="!detailAssociations.diffs.length" />
      <article v-for="diff in detailAssociations.diffs" :key="diff.id" class="section-block">
        <header><strong>#{{ diff.id }} {{ diff.summary }}</strong><StatusBadge :value="diff.diff_type" /></header>
        <p>{{ formatDate(diff.created_at) }}</p>
      </article>
      <h3>关联审阅备注（{{ detailAssociations.notes.length }}）</h3>
      <EmptyState v-if="!detailAssociations.notes.length" />
      <article v-for="note in detailAssociations.notes" :key="note.id" class="section-block">
        <header><strong>{{ note.tag }}</strong><StatusBadge :value="note.status" /></header>
        <p>{{ note.comment }} — {{ note.reviewer }}</p>
      </article>
      <footer class="actions">
        <button class="btn primary" @click="onExport(detailDocument.id)">导出</button>
        <button class="btn ghost" @click="detailId = null">关闭</button>
      </footer>
    </div>
  </div>
</template>
