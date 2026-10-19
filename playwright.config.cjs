const { defineConfig } = require('@playwright/test')
module.exports = defineConfig({
    testDir: './tests/browser',
    workers: 1,
    use: {
        baseURL: 'http://127.0.0.1:4173/stock-predictions-llm/',
        browserName: 'chromium',
        launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
    },
    webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173/stock-predictions-llm/', reuseExistingServer: false }
})
