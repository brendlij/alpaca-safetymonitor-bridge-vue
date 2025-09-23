<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import { mdiMenu } from '@mdi/js'

const isMenuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)
const buttonRef = ref<HTMLElement | null>(null)

const toggleMenu = (): void => {
  isMenuOpen.value = !isMenuOpen.value
  console.log('toggled Menu')
}

const closeMenu = (): void => {
  isMenuOpen.value = false
  console.log('closed Menu')
}

const onKeydown = (e: KeyboardEvent): void => {
  if (e.key === 'Escape') closeMenu()
}

const onGlobalClick = (e: MouseEvent): void => {
  if (!isMenuOpen.value) return
  const target = e.target as Node
  if (menuRef.value && menuRef.value.contains(target)) return
  if (buttonRef.value && buttonRef.value.contains(target)) return
  closeMenu()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('click', onGlobalClick)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('click', onGlobalClick)
})
</script>

<template>
  <header class="hdr">
    <h1 class="brand">Ascom Alpaca To MQTT Bridge - Safetymonitor</h1>

    <button ref="buttonRef" class="menu-btn" aria-label="Toggle navigation" @click="toggleMenu">
      <svg viewBox="0 0 24 24" class="icon" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path :d="mdiMenu" />
      </svg>
    </button>

    <nav ref="menuRef" class="menu" v-show="isMenuOpen">
      <RouterLink class="menu-item" to="/" @click="closeMenu">Home</RouterLink>
      <RouterLink class="menu-item" to="/about" @click="closeMenu">About</RouterLink>
      <RouterLink class="menu-item" to="/server" @click="closeMenu">Server Manager</RouterLink>
      <RouterLink class="menu-item" to="/settings" @click="closeMenu">Settings</RouterLink>
    </nav>
  </header>
</template>

<style scoped>
.hdr {
  height: var(--header-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  backdrop-filter: saturate(140%) blur(6px);
  background: rgb(19, 19, 19);
  padding: 32px;
}
.brand {
  font-weight: 400;
}

.menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: inherit;
  padding: 4px;
  cursor: pointer;
}

.icon {
  width: 32px;
  height: 32px;
  fill: currentColor;
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.menu-btn:hover .icon {
  transform: scale(1.06);
  opacity: 0.9;
}

.menu {
  position: absolute;
  top: calc(var(--header-h) - 8px);
  right: 16px;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: #111213;
  border: 1px solid #2a2b2d;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
}

.menu-item {
  color: #cbd5e1;
  text-decoration: none;
  padding: 10px 12px;
  border-radius: 8px;
}
.menu-item:hover {
  background: #202123;
}
</style>
