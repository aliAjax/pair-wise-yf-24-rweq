<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { useDiffResultStore } from "../stores/DiffResultStore";
import type { DiffResult } from "../types/DiffResult";
import StatCard from "../components/common/StatCard.vue";
import StatusBadge from "../components/common/StatusBadge.vue";
import EmptyState from "../components/common/EmptyState.vue";
import { formatDate, formatLifecycle } from "../utils/formatters";

const documentStore = usePolicyDocumentStore();
const diffStore = useDiffResultStore();
const { activeRows } = storeToRefs(documentStore);

const oldId = ref<number | null>(null);
const newId = ref<number | null>(null);
const opened = ref<DiffResult | null>(null);

onMounted(async () => {
  await Promise.all([documentStore.load(), diffStore.load()]);
  oldId.value = activeRows.value[0]?.id ?? null;
  newId.value = activeRows.value[1]?.id ?? activeRows.value[0]?.id ?? null;
});

const docTitle = (id: number) => {
  const doc = documentStore.rows.find((row) => row.id === id);
  return doc ? `${doc.title}（${doc.version_label}）` : `#${id}`;
};
const docStatus = (id: number) => formatLifecycle(documentStore.rows.find((row) => row.id === id)?.lifecycle_status ?? "ACTIVE");

const canCompare = computed(() => oldId.value !== null && newId.value !== null && oldId.value !== newId.value);
const matched = computed(() =>
  diffStore.rows.filter((diff) => canCompare.value && diff.old_document_id === oldId.value && diff.new_document_id === newId.value)
);
</script>

<template>
  <section class="page">
    <section class="metrics">
      <StatCard label="可参与新对比的活动版本" :value="activeRows.length" />
      <StatCard label="历史差异结果" :value="diffStore.rows.length" />
      <StatCard label="归档版本（已排除）" :value="documentStore.archivedCount" />
    </section>

    <div class="panel">
      <h2>发起新对比 <small>仅活动版本可选，归档版本不参与</small></h2>
      <EmptyState v-if="activeRows.length === 0" />
      <div v-else class="compare-bar">
        <select v-model="oldId">
          <option v-for="row in activeRows" :key="row.id" :value="row.id">{{ row.title }}（{{ row.version_label }}）</option>
        </select>
        <span>→</span>
        <select v-model="newId">
          <option v-for="row in activeRows" :key="row.id" :value="row.id">{{ row.title }}（{{ row.version_label }}）</option>
        </select>
      </div>
      <p v-if="canCompare && matched.length === 0" class="notice">所选两版暂无差异结果记录。</p>
      <article class="row" v-for="diff in matched" :key="diff.id">
        <strong>{{ diff.summary }}</strong>
        <StatusBadge :value="diff.diff_type" />
        <span class="actions"><button @click="opened = diff">打开</button></span>
      </article>
    </div>

    <div class="panel">
      <h2>历史差异结果 <small>涉及归档版本的结果仍可打开查看</small></h2>
      <EmptyState v-if="diffStore.rows.length === 0" />
      <article class="row" v-for="diff in diffStore.rows" :key="diff.id">
        <strong>{{ diff.summary }}</strong>
        <span>{{ docTitle(diff.old_document_id) }} → {{ docTitle(diff.new_document_id) }}</span>
        <StatusBadge :value="docStatus(diff.old_document_id)" />
        <StatusBadge :value="diff.diff_type" />
        <span class="actions"><button @click="opened = diff">打开</button></span>
      </article>
    </div>

    <div v-if="opened" class="panel detail">
      <h2>差异详情 <StatusBadge :value="opened.diff_type" /></h2>
      <p class="meta">
        {{ docTitle(opened.old_document_id) }}（{{ docStatus(opened.old_document_id) }}） →
        {{ docTitle(opened.new_document_id) }}（{{ docStatus(opened.new_document_id) }}） ·
        {{ formatDate(opened.created_at) }}
      </p>
      <pre class="raw">{{ opened.summary }}</pre>
      <span class="actions"><button @click="opened = null">关闭</button></span>
    </div>
  </section>
</template>
