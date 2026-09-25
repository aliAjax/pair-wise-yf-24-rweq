<script setup lang="ts">
import { computed } from "vue";
import { formatRisk } from "../../utils/formatters";
const props = defineProps<{ level?: string; title?: string }>();
const text = computed(() => (props.level ? formatRisk(props.level) : props.title ?? "RiskTag"));
</script>
<template><span class="risk-tag" :data-level="level">{{ text }}</span></template>
