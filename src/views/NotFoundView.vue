<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="not-found">
    <h1>404</h1>
    <p>页面不存在</p>
    <RouterLink to="/">返回首页</RouterLink>
  </section>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding-top: 80px;
}

.not-found h1 {
  font-size: 64px;
  margin: 0;
}
</style>
