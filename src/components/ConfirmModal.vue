<template>
  <div v-if="show" class="modal-overlay" @click="onCancel">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ title }}</h3>
      </div>
      <div class="modal-body">
        <p>{{ message }}</p>
      </div>
      <div class="modal-actions">
        <button @click="onCancel" class="cancel-btn">
          <svg class="icon" viewBox="0 0 24 24">
            <path
              d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"
            />
          </svg>
          Cancel
        </button>
        <button @click="onConfirm" class="confirm-btn" :class="type">
          <svg class="icon" viewBox="0 0 24 24">
            <path d="M9,20.42L2.79,14.21L5.62L9,17.58L18.38,8.21L21.21,11.04L9,20.42Z" />
          </svg>
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  show: boolean
  title: string
  message: string
  confirmText?: string
  type?: 'danger' | 'warning' | 'primary'
}

interface Emits {
  (e: 'confirm'): void
  (e: 'cancel'): void
}

withDefaults(defineProps<Props>(), {
  confirmText: 'Confirm',
  type: 'primary',
})

const emit = defineEmits<Emits>()

function onConfirm() {
  emit('confirm')
}

function onCancel() {
  emit('cancel')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: #1a1b1e;
  border: 1px solid #2a2b2d;
  border-radius: 12px;
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  animation: modalSlideIn 0.2s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #2a2b2d;
}

.modal-header h3 {
  margin: 0;
  color: #f8fafc;
  font-size: 18px;
  font-weight: 600;
}

.modal-body {
  padding: 20px 24px;
}

.modal-body p {
  margin: 0;
  color: #cbd5e1;
  line-height: 1.5;
}

.modal-actions {
  padding: 16px 24px 20px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 0;
  border: 1px solid;
  cursor: pointer;
  font-weight: 500;
  font-family: 'SUSE Mono', monospace;
  transition: all 0.2s ease;
}

.icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.cancel-btn {
  background: #374151;
  border-color: #4b5563;
  color: #d1d5db;
}

.cancel-btn:hover {
  background: #4b5563;
  border-color: #6b7280;
}

.confirm-btn {
  color: white;
  font-weight: 600;
}

.confirm-btn.primary {
  background: #3b82f6;
  border-color: #2563eb;
}

.confirm-btn.primary:hover {
  background: #2563eb;
  border-color: #1d4ed8;
}

.confirm-btn.warning {
  background: #f59e0b;
  border-color: #d97706;
}

.confirm-btn.warning:hover {
  background: #d97706;
  border-color: #b45309;
}

.confirm-btn.danger {
  background: #ef4444;
  border-color: #dc2626;
}

.confirm-btn.danger:hover {
  background: #dc2626;
  border-color: #b91c1c;
}
</style>
