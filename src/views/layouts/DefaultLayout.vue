<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="layout">
    <header class="layout__header">
      <div class="layout__logo">LLM Ops</div>
      <nav class="layout__nav"><!-- 导航占位 --></nav>
    </header>
    <main class="layout__main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.layout__header {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 24px;
  border-bottom: 1px solid var(--color-border, #e5e6eb);
}

.layout__logo {
  font-size: 18px;
  font-weight: 600;
}

.layout__nav {
  margin-left: 32px;
}

.layout__main {
  flex: 1;
  padding: 24px;
}
</style>
