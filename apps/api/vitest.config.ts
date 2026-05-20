import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          compatibilityDate: '2025-05-01',
          compatibilityFlags: ['nodejs_compat'],
          bindings: {
            JWT_SECRET: 'test-jwt-secret-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            PASSWORD_PEPPER: 'test-pepper-AAAAAAAAAAAAAAAAAAAAAA',
            ORG_MASTER_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
            TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
            MAILCHANNELS_DKIM_PRIVATE_KEY: '',
          },
        },
      },
    },
  },
});
