<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { resetPassword } from '../features/conta/auth'
import { authErrorMessage } from '../features/conta/errors'
import { forgetSessionLocally } from '../features/conta/session'
import { isValidPassword } from '../features/conta/validation'
import { ApiError, NetworkError } from '../net/auth-client'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const password = ref('')
const error = ref('')
const busy = ref(false)
const token = typeof route.query.token === 'string' ? route.query.token : ''

async function submit(): Promise<void> {
  error.value = ''
  if (token === '') {
    error.value = t('auth.reset.missingToken')
    return
  }
  if (!isValidPassword(password.value)) {
    error.value = t('auth.error.invalidFields')
    return
  }
  busy.value = true
  try {
    await resetPassword(token, password.value)
    await forgetSessionLocally()
    await router.push({ name: 'login', query: { reset: 'done' } })
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
      <h2 class="type-h1">{{ t('auth.reset.title') }}</h2>
      <p class="type-body auth-muted">{{ t('auth.reset.subtitle') }}</p>
      <v-text-field
        v-model="password"
        data-testid="reset-password"
        :label="t('auth.password')"
        type="password"
        autocomplete="new-password"
        variant="outlined"
        hide-details
      />
      <p v-if="error" role="alert" class="type-caption auth-error">{{ error }}</p>
      <v-btn
        data-testid="reset-submit"
        color="primary"
        variant="flat"
        block
        :loading="busy"
        @click="submit"
      >
        {{ t('auth.reset.submit') }}
      </v-btn>
      <div class="auth-links">
        <router-link :to="{ name: 'login' }">{{ t('auth.forgot.back') }}</router-link>
      </div>
    </v-card>
  </v-container>
</template>
