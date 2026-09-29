import { defineConfig } from 'vitest/config'

const TEST_DB = 'prayer_tools_v3_with_orgs_2_test'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['./test/global-setup.ts'],
    // Sweeps are global across sites, so test files share one database and run one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      DATABASE_URL: `postgres://pt2_admin:dev@localhost:5432/${TEST_DB}`,
      APP_DATABASE_URL: `postgres://pt2_app:dev@localhost:5432/${TEST_DB}`,
      PT_SECRET: 'test-secret',
      PT_SITE_BASE_HOST: 'localhost:3380',
      PT_ADMIN_URL: 'http://localhost:2380',
      MAIL_PROVIDER: 'log',
      MAIL_DOMAIN_TRANSACTIONAL: 'mail.test',
      LOG_LEVEL: 'warn'
    }
  }
})
