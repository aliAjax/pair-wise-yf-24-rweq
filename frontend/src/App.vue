<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { routes } from "./router/routes";
import { usePolicyDocumentStore } from "./stores/PolicyDocumentStore";
import StatusBadge from "./components/common/StatusBadge.vue";
import StatCard from "./components/common/StatCard.vue";
import DocumentsPage from "./pages/DocumentsPage.vue";
import ComparePage from "./pages/ComparePage.vue";
import RisksPage from "./pages/RisksPage.vue";
import ReviewPage from "./pages/ReviewPage.vue";

const pages = { "/documents": DocumentsPage, "/compare": ComparePage, "/risks": RisksPage, "/review": ReviewPage } as const;
const active = ref<string>(routes[0]?.route ?? "/documents");
const current = computed(() => routes.find((route) => route.route === active.value) ?? routes[0]);
const currentPage = computed(() => pages[active.value as keyof typeof pages] ?? DocumentsPage);
const documentStore = usePolicyDocumentStore();
onMounted(() => { void documentStore.load(); });
</script>

<template>
  <div class="shell">
    <aside>
      <div class="brand">隐私政策差异对比器</div>
      <nav>
        <button v-for="route in routes" :key="route.route" :class="{ active: active === route.route }" @click="active = route.route">{{ route.name }}</button>
      </nav>
    </aside>
    <main class="page">
      <section class="page-head"><div><p class="eyebrow">policy-diff</p><h1>{{ current?.name }}</h1></div><StatusBadge value="LOCAL_DATA" /></section>
      <section class="metrics"><StatCard label="活动版本" :value="documentStore.activeCount" /><StatCard label="已归档" :value="documentStore.archivedCount" /><StatCard label="版本总数" :value="documentStore.rows.length" /></section>
      <component :is="currentPage" />
    </main>
  </div>
</template>
