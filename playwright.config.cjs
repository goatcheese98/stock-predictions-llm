const { defineConfig } = require('@playwright/test')
const pages = process.env.PAGES_RUNTIME === '1'
module.exports = defineConfig({
    testDir: pages ? './tests/pages' : './tests/browser',
    outputDir: pages ? 'test-results/pages' : 'test-results/preview',
    workers: 1,
    timeout: 30000,
    globalTimeout: 300000,
    reporter: [['list'], ['html', {open:'never',outputFolder:pages?'playwright-report/pages':'playwright-report/preview'}]],
    use: {
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: process.env.CHROMIUM_PATH ? 'off' : 'retain-on-failure',
        baseURL: pages ? 'http://127.0.0.1:8788/' : 'http://127.0.0.1:4173/stock-predictions-llm/',
        browserName: 'chromium',
        launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
    },
    webServer: pages ? {
        command: 'node_modules/.bin/wrangler pages dev dist --ip 127.0.0.1 --port 8788 --inspector-port 0 --log-level info',
        env: {WRANGLER_SEND_METRICS:'false',CLOUDFLARE_CF_FETCH_ENABLED:'false',WRANGLER_LOG_PATH:'./quality-artifacts/wrangler-logs',XDG_CONFIG_HOME:'./quality-artifacts/wrangler-config'},
        url:'http://127.0.0.1:8788/',reuseExistingServer:false,timeout:60000
    } : { command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173/stock-predictions-llm/', reuseExistingServer: false }
})
