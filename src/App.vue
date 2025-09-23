<template>
  <div class="app">
    <HeaderComponent />
    <main class="app-main">
      <RouterView v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
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
  min-height: calc(100dvh - var(--header-h));
  width: 100%;
  overflow-x: hidden;
  position: relative;
}

/* Prevent layout shifts during page transitions */
.app-main > * {
  max-width: 100%;
  overflow-x: hidden;
}

/* Page transition animations */
.page-enter-active,
.page-leave-active {
  transition: all 0.2s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.page-enter-to,
.page-leave-from {
  opacity: 1;
  transform: translateX(0);
}
</style>
