const { defineConfig } = require('@playwright/test')
module.exports = defineConfig({
    testDir: './tests/browser',
    workers: 1,
    timeout: 30000,
    globalTimeout: 300000,
    reporter: [['list'], ['html', {open:'never'}]],
    use: {
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: process.env.CHROMIUM_PATH ? 'off' : 'retain-on-failure',
        baseURL: 'http://127.0.0.1:4173/stock-predictions-llm/',
        browserName: 'chromium',
        launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
    },
    webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173/stock-predictions-llm/', reuseExistingServer: false }
})
