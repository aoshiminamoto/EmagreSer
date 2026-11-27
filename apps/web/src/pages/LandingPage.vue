<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { APP_VERSION } from '../version'
import { formatDateTime, formatNumber } from '../i18n/format'
import { landingOrigin } from '../features/landing/origin'
import { qrSvg } from '../features/landing/qr'
import { isBelowThreshold, isPublicStats, type PublicStats } from '../features/landing/stats'

type StatsState = 'loading' | 'ready' | 'below' | 'unavailable'

const { t, locale } = useI18n()
const state = ref<StatsState>('loading')
const stats = ref<PublicStats | null>(null)
const copied = ref(false)

const origin = landingOrigin()
const qr = qrSvg(origin)
const qrViewBox = computed(() => `-2 -2 ${qr.size + 4} ${qr.size + 4}`)
const resetHint = /redefinir-senha|esqueci-a-senha/.test(globalThis.location?.pathname ?? '')

const features = [
  {
    icon: 'mdi-scale-bathroom',
    title: t('landing.features.weight.title'),
    body: t('landing.features.weight.body'),
  },
  {
    icon: 'mdi-target',
    title: t('landing.features.goals.title'),
    body: t('landing.features.goals.body'),
  },
  {
    icon: 'mdi-cup-water',
    title: t('landing.features.habits.title'),
    body: t('landing.features.habits.body'),
  },
  {
    icon: 'mdi-emoticon-happy-outline',
    title: t('landing.features.mood.title'),
    body: t('landing.features.mood.body'),
  },
  {
    icon: 'mdi-image-outline',
    title: t('landing.features.photos.title'),
    body: t('landing.features.photos.body'),
  },
  {
    icon: 'mdi-bell-outline',
    title: t('landing.features.reminders.title'),
    body: t('landing.features.reminders.body'),
  },
  {
    icon: 'mdi-cloud-off-outline',
    title: t('landing.features.offline.title'),
    body: t('landing.features.offline.body'),
  },
  {
    icon: 'mdi-information-outline',
    title: t('landing.features.bmi.title'),
    body: t('landing.features.bmi.body'),
  },
]

/** A página renderiza primeiro; os números vêm depois (RF-70). */
onMounted(async () => {
  try {
    const response = await globalThis.fetch('/public/stats')
    if (!response.ok) {
      state.value = 'unavailable'
      return
    }
    const data: unknown = await response.json()
    if (isBelowThreshold(data)) state.value = 'below'
    else if (isPublicStats(data)) {
      stats.value = data
      state.value = 'ready'
    } else state.value = 'unavailable'
  } catch {
    state.value = 'unavailable'
  }
})

async function copyLink(): Promise<void> {
  try {
    await globalThis.navigator?.clipboard?.writeText(origin)
    copied.value = true
  } catch {
    copied.value = false
  }
}

function count(value: number): string {
  return formatNumber(value, locale.value, 'count')
}
</script>

<template>
  <v-app class="landing-app">
    <v-main>
      <v-container class="landing-container">
        <header class="landing-header" role="banner">
          <div class="landing-brand">
            <v-icon icon="mdi-scale-bathroom" color="primary-text" size="32" aria-hidden="true" />
            <span class="type-h3">{{ t('app.title') }}</span>
          </div>
          <p class="type-body landing-muted">{{ t('landing.brand.slogan') }}</p>
        </header>

        <main role="main">
          <v-card class="landing-card restriction" data-testid="landing-restriction">
            <v-icon
              icon="mdi-information-outline"
              color="primary-text"
              size="28"
              aria-hidden="true"
            />
            <div>
              <h1 class="type-h2">{{ t('landing.restriction.title') }}</h1>
              <p class="type-body">{{ t('landing.restriction.body') }}</p>
              <p v-if="resetHint" class="type-body" data-testid="landing-reset-hint">
                {{ t('landing.resetHint') }}
              </p>
            </div>
            <div class="qr-block">
              <svg
                class="qr-code"
                :viewBox="qrViewBox"
                role="img"
                :aria-label="t('landing.restriction.qrAlt')"
                data-testid="landing-qr"
              >
                <rect :x="-2" :y="-2" :width="qr.size + 4" :height="qr.size + 4" fill="#ffffff" />
                <path :d="qr.path" fill="#111827" />
              </svg>
              <p class="type-caption landing-muted">{{ t('landing.restriction.addressLabel') }}</p>
              <code data-testid="landing-address">{{ origin }}</code>
              <v-btn color="primary" data-testid="landing-copy" @click="copyLink">
                {{ t('landing.restriction.copy') }}
              </v-btn>
              <p v-if="copied" class="type-caption landing-success" role="status">
                {{ t('landing.restriction.copied') }}
              </p>
            </div>
          </v-card>

          <template v-if="state !== 'unavailable'">
            <v-card class="landing-card social" data-testid="landing-social">
              <v-skeleton-loader v-if="state === 'loading'" type="article" />
              <p v-else-if="state === 'below'" class="type-body" data-testid="landing-starting">
                {{ t('landing.social.starting') }}
              </p>
              <template v-else-if="stats !== null">
                <p class="type-h1 social-number" data-testid="landing-active-users">
                  {{ count(stats.activeUsers30d) }}
                </p>
                <p class="type-body landing-muted">{{ t('landing.social.active') }}</p>
                <p class="type-caption landing-muted">
                  {{ t('landing.social.total', { count: count(stats.totalUsers) }) }}
                </p>
              </template>
            </v-card>

            <section class="landing-section" aria-labelledby="usage-title">
              <h2 id="usage-title" class="type-h2">{{ t('landing.stats.title') }}</h2>
              <v-card class="landing-card" data-testid="landing-stats">
                <v-skeleton-loader v-if="state === 'loading'" type="list-item-three-line@3" />
                <p v-else-if="state === 'below'" class="type-body">
                  {{ t('landing.social.starting') }}
                </p>
                <template v-else-if="stats !== null">
                  <div class="stat-row">
                    <span class="type-body">{{ t('landing.stats.weightEntries') }}</span>
                    <strong data-testid="landing-weight-entries">{{
                      count(stats.weightEntries)
                    }}</strong>
                  </div>
                  <div class="stat-row">
                    <span class="type-body">{{ t('landing.stats.habitsCompleted') }}</span>
                    <strong>{{ count(stats.habitsCompleted) }}</strong>
                  </div>
                  <div class="stat-row">
                    <span class="type-body">{{ t('landing.stats.waterGlasses') }}</span>
                    <strong>{{ count(stats.waterGlasses) }}</strong>
                  </div>
                  <p class="type-caption landing-muted" data-testid="landing-updated">
                    {{
                      t('landing.stats.updatedAt', {
                        value: formatDateTime(stats.updatedAt, locale),
                      })
                    }}
                  </p>
                </template>
              </v-card>
            </section>
          </template>

          <section class="landing-section" aria-labelledby="features-title">
            <h2 id="features-title" class="type-h2">{{ t('landing.features.title') }}</h2>
            <div class="features-grid">
              <v-card v-for="feature in features" :key="feature.title" class="landing-card feature">
                <v-icon :icon="feature.icon" color="primary-text" size="30" aria-hidden="true" />
                <h3 class="type-h3">{{ feature.title }}</h3>
                <p class="type-body landing-muted">{{ feature.body }}</p>
              </v-card>
            </div>
          </section>
        </main>

        <footer class="landing-footer" role="contentinfo">
          <a href="/privacidade">{{ t('landing.footer.privacy') }}</a>
          <span class="type-caption landing-muted">
            {{ t('landing.footer.version', { version: APP_VERSION }) }}
          </span>
        </footer>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.landing-container {
  max-width: 1080px;
  padding-top: 32px;
  padding-bottom: 32px;
}

.landing-header,
.landing-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.landing-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.landing-brand span,
.landing-muted,
.landing-header p,
.landing-footer p {
  color: #6b7280;
}

.landing-card {
  padding: 24px;
  border-radius: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 8px 24px rgba(17, 24, 39, 0.06);
}

.restriction {
  display: grid;
  grid-template-columns: auto 1fr minmax(200px, 280px);
  gap: 16px;
  margin-top: 24px;
}

.restriction h1,
.restriction p {
  margin: 0 0 8px;
}

.landing-success {
  color: #15803d;
}

.qr-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.qr-code {
  width: 168px;
  height: 168px;
}

.qr-block p {
  margin: 0;
}

.social {
  margin-top: 24px;
  text-align: center;
}

.social-number {
  color: #15803d;
  margin: 0;
}

.landing-section {
  margin-top: 32px;
}

.landing-section h2 {
  margin-bottom: 16px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.feature {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 160px;
}

.feature h3,
.feature p {
  margin: 0;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
}

.stat-row strong {
  color: #15803d;
}

.landing-footer {
  margin-top: 40px;
}

a {
  color: #15803d;
}

@media (max-width: 720px) {
  .restriction {
    grid-template-columns: 1fr;
  }
}
</style>
