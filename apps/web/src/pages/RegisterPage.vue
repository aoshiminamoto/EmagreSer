<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import LocaleSelect from '../components/LocaleSelect.vue'
import { register } from '../features/conta/auth'
import { authErrorMessage } from '../features/conta/errors'
import { destinationAfterSignIn } from '../features/conta/routes'
import { isValidEmail, isValidPassword } from '../features/conta/validation'
import { ApiError, NetworkError } from '../net/auth-client'

const { t } = useI18n()
const router = useRouter()
const name = ref('')
const email = ref('')
const password = ref('')
const consent = ref(false)
const error = ref('')
const busy = ref(false)

async function submit(): Promise<void> {
  error.value = ''
  if (!isValidEmail(email.value) || !isValidPassword(password.value) || !consent.value) {
    error.value = t('auth.error.invalidFields')
    return
  }
  busy.value = true
  try {
    await register({
      email: email.value,
      password: password.value,
      consent: consent.value,
      ...(name.value.trim() ? { displayName: name.value } : {}),
    })
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
      <h2 class="type-h1">{{ t('auth.register.title') }}</h2>
      <p class="type-body auth-muted">{{ t('auth.register.subtitle') }}</p>
      <v-text-field
        v-model="name"
        data-testid="register-name"
        :label="t('auth.register.name')"
        autocomplete="name"
        variant="outlined"
        hide-details
      />
      <v-text-field
        v-model="email"
        data-testid="register-email"
        :label="t('auth.email')"
        type="email"
        autocomplete="email"
        variant="outlined"
        hide-details
      />
      <v-text-field
        v-model="password"
        data-testid="register-password"
        :label="t('auth.password')"
        type="password"
        autocomplete="new-password"
        variant="outlined"
        hide-details
      />
      <p class="type-caption auth-muted">{{ t('auth.register.passwordHint') }}</p>
      <v-checkbox v-model="consent" data-testid="register-consent" hide-details>
        <template #label>
          <span class="type-caption">
            {{ t('auth.register.consentBefore') }}
            <router-link :to="{ name: 'privacy' }">{{
              t('auth.register.consentLink')
            }}</router-link>
            {{ t('auth.register.consentAfter') }}
          </span>
        </template>
      </v-checkbox>
      <p v-if="error" role="alert" class="type-caption auth-error">{{ error }}</p>
      <v-btn
        data-testid="register-submit"
        color="primary"
        variant="flat"
        block
        :loading="busy"
        @click="submit"
      >
        {{ t('auth.register.submit') }}
      </v-btn>
      <div class="auth-links">
        <router-link :to="{ name: 'login' }">{{ t('auth.register.toLogin') }}</router-link>
      </div>
      <LocaleSelect />
    </v-card>
  </v-container>
</template>
