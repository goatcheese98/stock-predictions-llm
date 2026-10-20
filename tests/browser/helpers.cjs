const { expect } = require('@playwright/test')
const fs = require('node:fs')
const path = require('node:path')
const stock = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/stock.json'), 'utf8'))
const report = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/report.json'), 'utf8'))
const handler = [...'window.pwned=1'].map(char => `&#${char.charCodeAt(0)};`).join('')
const malicious = `<img src=x onerror="${handler}"><svg onload="${handler}"> & "' #`
async function offline(page, { fallback = false, badStock = false, badReport = false, failedChunk = null, reportContent = report.content } = {}) {
    const calls = []
    await page.context().route('**/*', async route => {
        const url = new URL(route.request().url())
        if (url.pathname.includes('/offline-attack')) { calls.push({kind:'report-resource'}); return route.abort('blockedbyclient') }
        if (url.hostname === '127.0.0.1') {
            if ((fallback && /\/vue-runtime-.*\.js$/.test(url.pathname)) ||
                (failedChunk && url.pathname.includes('/' + failedChunk + '-'))) return route.abort('failed')
            return route.continue()
        }
        if (url.hostname === 'polygon-api-worker.jasani-rohan.workers.dev') {
            calls.push({kind:'stock', ticker:url.searchParams.get('ticker')})
            return route.fulfill({json:badStock ? {results:[{c:'bad'}]} : stock})
        }
        if (url.hostname === 'openai-api-worker.jasani-rohan.workers.dev') {
            calls.push({kind:'report', messages:route.request().postDataJSON()})
            return route.fulfill({json:badReport ? {error:'offline denied'} : {content: reportContent}})
        }
        return route.abort('blockedbyclient')
    })
    return calls
}
async function addTicker(page, ticker) {
    await page.locator('#ticker-input').fill(ticker)
    await page.locator('#ticker-input-form').evaluate(form => form.requestSubmit())
}
async function assertSafe(page) {
    await expect(page.locator('[onerror], [onload], img[src=x]')).toHaveCount(0)
    expect(await page.evaluate(() => window.pwned)).toBeUndefined()
}


module.exports = {stock, report, malicious, offline, addTicker, assertSafe}
