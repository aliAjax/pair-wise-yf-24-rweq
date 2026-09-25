<script setup lang="ts">
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { getPolicyDocumentRelations, exportPolicyDocument } from "../api/PolicyDocument";
import type { PolicyDocument } from "../types/PolicyDocument";
import type { PolicyDocumentRelations } from "../api/PolicyDocument";
import StatCard from "../components/common/StatCard.vue";
import StatusBadge from "../components/common/StatusBadge.vue";
import EmptyState from "../components/common/EmptyState.vue";
import { formatDate, formatDateOrDash, formatLifecycle, formatRisk } from "../utils/formatters";

const store = usePolicyDocumentStore();
const { activeRows, archivedRows, activeCount, archivedCount, lastError } = storeToRefs(store);

const detail = ref<PolicyDocument | null>(null);
const relations = ref<PolicyDocumentRelations | null>(null);
const notice = ref("");

onMounted(() => store.load());

async function openDetail(row: PolicyDocument) {
  detail.value = row;
  relations.value = await getPolicyDocumentRelations(row.id);
}

function closeDetail() {
  detail.value = null;
  relations.value = null;
}

async function onArchive(row: PolicyDocument) {
  const ok = await store.archive(row.id);
  notice.value = ok ? `《${row.title}》已归档，不再参与新对比` : "";
}

async function onRestore(row: PolicyDocument) {
  const ok = await store.restore(row.id);
  notice.value = ok ? `《${row.title}》已恢复进活动列表` : "";
}

async function onRemove(row: PolicyDocument) {
  const ok = await store.remove(row.id);
  notice.value = ok ? `《${row.title}》已彻底清理` : "";
  if (ok && detail.value?.id === row.id) closeDetail();
}

async function onExport(row: PolicyDocument) {
  const markdown = await exportPolicyDocument(row.id);
  const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${row.title}-${row.version_label}.md`;
  link.click();
  URL.revokeObjectURL(url);
  notice.value = `《${row.title}》已导出`;
}
</script>

<template>
  <section class="page">
    <section class="metrics">
      <StatCard label="活动版本" :value="activeCount" />
      <StatCard label="归档版本" :value="archivedCount" />
      <div class="stat">
        <span>处理人（归档/恢复时记录）</span>
        <input class="operator" :value="store.operator" @change="store.setOperator(($event.target as HTMLInputElement).value)" />
      </div>
    </section>

    <p v-if="lastError" class="alert">{{ lastError }}</p>
    <p v-if="notice" class="notice">{{ notice }}</p>

    <div class="panel">
      <h2>活动版本（{{ activeCount }}）</h2>
      <EmptyState v-if="activeRows.length === 0" />
      <article class="row doc-row" v-for="row in activeRows" :key="row.id">
        <strong>{{ row.title }} <small>{{ row.version_label }}</small></strong>
        <span>导入 {{ formatDate(row.imported_at) }}</span>
        <span v-if="row.restored_at">恢复 {{ formatDateOrDash(row.restored_at) }} / {{ row.restored_by }}</span>
        <StatusBadge :value="formatLifecycle(row.lifecycle_status)" />
        <span class="actions">
          <button @click="openDetail(row)">查看</button>
          <button @click="onArchive(row)">撤下归档</button>
          <button class="danger" @click="onRemove(row)">彻底清理</button>
        </span>
      </article>
    </div>

    <div class="panel">
      <h2>归档版本（{{ archivedCount }}）<small>只读保留，不参与新对比</small></h2>
      <EmptyState v-if="archivedRows.length === 0" />
      <article class="row doc-row" v-for="row in archivedRows" :key="row.id">
        <strong>{{ row.title }} <small>{{ row.version_label }}</small></strong>
        <span>归档 {{ formatDateOrDash(row.archived_at) }} / {{ row.archived_by }}</span>
        <StatusBadge :value="formatLifecycle(row.lifecycle_status)" />
        <span class="actions">
          <button @click="openDetail(row)">查看</button>
          <button @click="onExport(row)">导出</button>
          <button @click="onRestore(row)">恢复</button>
          <button class="danger" @click="onRemove(row)">彻底清理</button>
        </span>
      </article>
    </div>

    <div v-if="detail" class="panel detail">
      <h2>
        {{ detail.title }}（{{ detail.version_label }}）
        <StatusBadge :value="formatLifecycle(detail.lifecycle_status)" />
        <small v-if="detail.lifecycle_status === 'ARCHIVED'">内容只读，可导出</small>
      </h2>
      <p class="meta">
        归档 {{ formatDateOrDash(detail.archived_at) }} / {{ detail.archived_by ?? "—" }} ·
        恢复 {{ formatDateOrDash(detail.restored_at) }} / {{ detail.restored_by ?? "—" }}
      </p>
      <pre class="raw">{{ detail.raw_text }}</pre>
      <template v-if="relations">
        <h3>关联差异（{{ relations.diffResults.length }}）</h3>
        <EmptyState v-if="relations.diffResults.length === 0" />
        <article class="row" v-for="diff in relations.diffResults" :key="diff.id">
          <strong>{{ diff.summary }}</strong>
          <StatusBadge :value="diff.diff_type" />
          <span>{{ formatDate(diff.created_at) }}</span>
        </article>
        <h3>关联风险条款（{{ relations.sections.length }}）</h3>
        <EmptyState v-if="relations.sections.length === 0" />
        <article class="row" v-for="section in relations.sections" :key="section.id">
          <strong>{{ section.heading }}</strong>
          <StatusBadge :value="formatRisk(section.risk_level)" />
          <span>{{ section.section_no }}</span>
        </article>
        <h3>关联审阅（{{ relations.reviewNotes.length }}）</h3>
        <EmptyState v-if="relations.reviewNotes.length === 0" />
        <article class="row" v-for="note in relations.reviewNotes" :key="note.id">
          <strong>{{ note.tag }}：{{ note.comment }}</strong>
          <StatusBadge :value="note.status" />
          <span>{{ note.reviewer }}</span>
        </article>
      </template>
      <span class="actions">
        <button @click="onExport(detail)">导出</button>
        <button @click="closeDetail">关闭</button>
      </span>
    </div>
  </section>
</template>
