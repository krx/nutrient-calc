// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  hooks: {
    'prerender:routes'({ routes }) {
      routes.clear();
    },
  },
  ssr: false,
  modules: ['@nuxt/ui', '@nuxt/eslint', '@nuxt/icon'],

  css: ['~/assets/css/main.css'],

  future: {
    compatibilityVersion: 4
  },

  compatibilityDate: '2024-11-27'
})
