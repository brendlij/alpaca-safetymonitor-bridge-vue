<template>
  <div class="app">
    <HeaderComponent />
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import HeaderComponent from '@/components/HeaderComponent.vue'
import { RouterView } from 'vue-router'
</script>

<style>
:root {
  --header-h: 64px;
}

.app {
  min-height: 100dvh;
  background: #1e1e1f;
  color: #cbd5e1;
}

/* Header bleibt oben */
.app > header {
  position: sticky;
  top: 0;
  z-index: 1000;
}

.app-main {
  padding: 16px;
}
</style>
