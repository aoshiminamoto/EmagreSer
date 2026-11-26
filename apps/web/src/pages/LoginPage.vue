<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import LocaleSelect from '../components/LocaleSelect.vue'
import { login } from '../features/conta/auth'
import { authErrorMessage } from '../features/conta/errors'
import { destinationAfterSignIn } from '../features/conta/routes'
import { isValidEmail, isValidPassword } from '../features/conta/validation'
import { ApiError, NetworkError } from '../net/auth-client'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit(): Promise<void> {
  error.value = ''
  if (!isValidEmail(email.value) || !isValidPassword(password.value)) {
    error.value = t('auth.error.invalidFields')
    return
  }
  busy.value = true
  try {
    await login({ email: email.value, password: password.value })
    await router.push({ name: await destinationAfterSignIn() })
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
      <h2 class="type-h1">{{ t('auth.login.title') }}</h2>
      <p class="type-body auth-muted">{{ t('auth.login.subtitle') }}</p>
      <p v-if="route.query.reset === 'done'" class="type-caption auth-success">
        {{ t('auth.reset.done') }}
      </p>
      <v-text-field
        v-model="email"
        data-testid="login-email"
        :label="t('auth.email')"
        type="email"
        autocomplete="email"
        variant="outlined"
        hide-details
      />
      <v-text-field
        v-model="password"
        data-testid="login-password"
        :label="t('auth.password')"
        type="password"
        autocomplete="current-password"
        variant="outlined"
        hide-details
      />
      <p v-if="error" role="alert" class="type-caption auth-error">{{ error }}</p>
      <v-btn
        data-testid="login-submit"
        color="primary"
        variant="flat"
        block
        :loading="busy"
        @click="submit"
      >
        {{ t('auth.login.submit') }}
      </v-btn>
      <div class="auth-links">
        <router-link :to="{ name: 'forgotPassword' }">{{ t('auth.login.forgot') }}</router-link>
        <router-link :to="{ name: 'register' }">{{ t('auth.login.createAccount') }}</router-link>
      </div>
      <LocaleSelect />
    </v-card>
  </v-container>
</template>
