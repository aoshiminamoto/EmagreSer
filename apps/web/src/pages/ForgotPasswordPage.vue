<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { requestPasswordReset } from '../features/conta/auth'
import { authErrorMessage } from '../features/conta/errors'
import { isValidEmail } from '../features/conta/validation'
import { ApiError, NetworkError } from '../net/auth-client'

const { t } = useI18n()
const email = ref('')
const error = ref('')
const sent = ref(false)
const busy = ref(false)

async function submit(): Promise<void> {
  error.value = ''
  if (!isValidEmail(email.value)) {
    error.value = t('auth.error.invalidFields')
    return
  }
  busy.value = true
  try {
    await requestPasswordReset(email.value)
    sent.value = true
  } catch (cause) {
    const code =
      cause instanceof ApiError
        ? cause.code
        : cause instanceof NetworkError
          ? 'NETWORK_ERROR'
          : 'REQUEST_FAILED'
    error.value = authErrorMessage(code)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <v-container class="auth-layout">
    <v-card class="auth-card">
      <h1 class="type-h2 auth-brand">{{ t('app.title') }}</h1>
      <h2 class="type-h1">{{ t('auth.forgot.title') }}</h2>
      <p class="type-body auth-muted">{{ t('auth.forgot.subtitle') }}</p>
      <template v-if="!sent">
        <v-text-field
          v-model="email"
          data-testid="forgot-email"
          :label="t('auth.email')"
          type="email"
          autocomplete="email"
          variant="outlined"
          hide-details
        />
        <p v-if="error" role="alert" class="type-caption auth-error">{{ error }}</p>
        <v-btn
          data-testid="forgot-submit"
          color="primary"
          variant="flat"
          block
          :loading="busy"
          @click="submit"
        >
          {{ t('auth.forgot.submit') }}
        </v-btn>
      </template>
      <p v-else role="status" class="type-body auth-success">{{ t('auth.forgot.sent') }}</p>
      <div class="auth-links">
        <router-link :to="{ name: 'login' }">{{ t('auth.forgot.back') }}</router-link>
      </div>
    </v-card>
  </v-container>
</template>
