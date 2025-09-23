<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import { mdiMenu } from '@mdi/js'

const isMenuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)
const buttonRef = ref<HTMLElement | null>(null)

const toggleMenu = (): void => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = (): void => {
  isMenuOpen.value = false
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
    <h1 class="brand">Alpaca Safety Monitor Bridge</h1>

    <!-- Desktop Navigation (always visible on larger screens) -->
    <nav class="nav-desktop">
      <RouterLink class="nav-item" to="/" exact-active-class="active">Server Manager</RouterLink>
      <RouterLink class="nav-item" to="/settings" exact-active-class="active">Settings</RouterLink>
      <RouterLink class="nav-item" to="/docs" exact-active-class="active">Docs</RouterLink>
    </nav>

    <!-- Mobile hamburger menu button (only visible on smaller screens) -->
    <button ref="buttonRef" class="menu-btn" aria-label="Toggle navigation" @click="toggleMenu">
      <svg viewBox="0 0 24 24" class="icon" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path :d="mdiMenu" />
      </svg>
    </button>

    <!-- Mobile dropdown menu -->
    <nav ref="menuRef" class="nav-mobile" v-show="isMenuOpen">
      <RouterLink class="menu-item" to="/" exact-active-class="active" @click="closeMenu"
        >Server Manager</RouterLink
      >
      <RouterLink class="menu-item" to="/settings" exact-active-class="active" @click="closeMenu"
        >Settings</RouterLink
      >
      <RouterLink class="menu-item" to="/docs" exact-active-class="active" @click="closeMenu"
        >Docs</RouterLink
      >
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
  padding: 16px 32px;
  border-bottom: 1px solid #2a2b2d;
}

.brand {
  font-weight: 500;
  font-size: 1.2rem;
  color: #f8fafc;
  flex-shrink: 0;
}

/* Desktop Navigation - Always visible on larger screens */
.nav-desktop {
  display: flex;
  align-items: center;
  gap: 0;
  background: transparent;
  border-radius: 0;
  overflow: visible;
  border: none;
}

.nav-item {
  background: #4a5568;
  border: none;
  color: #cbd5e1;
  border-radius: 0;
  font-weight: 500;
  padding: 10px 20px;
  text-decoration: none;
  transition:
    background 0.3s ease,
    color 0.3s ease;
  box-shadow: none;
  outline: none;
}

.nav-item:hover:not(.active) {
  background: #5a6570;
  color: #fff;
}

.nav-item.active {
  background: #6b7280;
  color: #fff;
  border: none;
  box-shadow: none;
  outline: none;
}

/* Mobile hamburger button - Only visible on smaller screens */
.menu-btn {
  display: none;
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

/* Mobile dropdown menu */
.nav-mobile {
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
  border-radius: 0;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
  z-index: 1000;
}

.menu-item {
  background: #4a5568;
  border: none;
  color: #cbd5e1;
  border-radius: 0;
  font-weight: 500;
  padding: 10px 12px;
  text-decoration: none;
  transition:
    background 0.3s ease,
    color 0.3s ease;
  box-shadow: none;
  outline: none;
}

.menu-item:hover:not(.active) {
  background: #5a6570;
  color: #fff;
}

.menu-item.active {
  background: #6b7280;
  color: white;
  border: none;
  box-shadow: none;
  outline: none;
}

/* Responsive behavior */
@media (max-width: 768px) {
  .hdr {
    padding: 16px 20px;
  }

  .brand {
    font-size: 1rem;
  }

  /* Hide desktop nav on mobile */
  .nav-desktop {
    display: none;
  }

  /* Show hamburger menu on mobile */
  .menu-btn {
    display: inline-flex;
  }
}

/* For very small screens, adjust brand text */
@media (max-width: 480px) {
  .brand {
    font-size: 0.9rem;
  }

  .icon {
    width: 28px;
    height: 28px;
  }
}
</style>
