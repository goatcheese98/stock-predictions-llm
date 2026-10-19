const { test, expect } = require('@playwright/test')
const fs = require('node:fs')
const path = require('node:path')
const vue = fs.readFileSync(require.resolve('vue/dist/vue.global.js'), 'utf8')
const stock = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/stock.json'), 'utf8'))
const report = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/report.json'), 'utf8'))
const handler = [...'window.pwned=1'].map(char => `&#${char.charCodeAt(0)};`).join('')
const malicious = `<img src=x onerror="${handler}"><svg onload="${handler}"> & "' #`
async function offline(page, { fallback = false, badStock = false, badReport = false } = {}) {
    const calls = []
    await page.route('**/*', async route => {
        const url = new URL(route.request().url())
        if (url.hostname === '127.0.0.1') return route.continue()
        if (url.hostname === 'unpkg.com') return route.fulfill({contentType:'application/javascript', body: fallback ? '' : vue})
        if (url.hostname === 'polygon-api-worker.jasani-rohan.workers.dev') {
            calls.push({kind:'stock', ticker:url.searchParams.get('ticker')})
            return route.fulfill({json:badStock ? {results:[{c:'bad'}]} : stock})
        }
        if (url.hostname === 'openai-api-worker.jasani-rohan.workers.dev') {
            calls.push({kind:'report', messages:route.request().postDataJSON()})
            return route.fulfill({json:badReport ? {error:'offline denied'} : report})
        }
        return route.fulfill({contentType:'application/javascript', body:''})
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

test('Vue ticker behavior, offline report navigation and chart/print ticker safety', async ({page}) => {
    const calls = await offline(page)
    await page.goto('./')
    await page.waitForFunction(() => window.vueApp)
    await addTicker(page, 'aa')
    await expect(page.locator('.ticker-choice-display .ticker')).toHaveCount(0)
    await addTicker(page, malicious)
    const ticker = malicious.toUpperCase()
    await expect(page.locator('.ticker-choice-display')).toContainText(ticker)
    await assertSafe(page)
    await page.locator('.generate-report-btn').click()
    await page.waitForURL(/report\.html\?id=/)
    await expect(page.locator('.report-content').first()).toContainText(report.content)
    await expect(page.locator('.chart-ticker-title')).toContainText(ticker)
    await expect(page.locator('[data-ticker]')).toHaveAttribute('data-ticker', ticker)
    const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('stockReport')))
    expect(stored.tickers).toBe(ticker)
    expect(stored.rawStockData.map(JSON.parse)).toEqual([stock])
    expect(stored.reports['dodgy-dave']).toBe(report.content)
    expect(stored.personalityIds).toEqual(['dodgy-dave'])
    expect(stored.dayRange).toBe(3)
    expect(calls.map(x => x.kind)).toEqual(['stock','report'])
    expect(calls[0].ticker).toBe(ticker)
    await assertSafe(page)
    await page.getByRole('button', {name:/Print/}).click()
    await expect(page.locator('#stockCheckboxes label')).toHaveText(ticker)
    await expect(page.locator('#stockCheckboxes input')).toHaveValue(ticker)
    await assertSafe(page)
    const popupPromise = page.waitForEvent('popup')
    await page.evaluate(() => window.previewPrint())
    const popup = await popupPromise
    await expect(popup.locator('.print-chart-title')).toContainText(ticker)
    await assertSafe(popup)
    await assertSafe(page)
})

test('no-Vue fallback renders malicious input as text and navigates with legacy storage', async ({page}) => {
    await offline(page, {fallback:true})
    await page.goto('./')
    await addTicker(page, malicious)
    await expect(page.locator('.ticker')).toHaveText(malicious.toUpperCase())
    await assertSafe(page)
    await page.locator('.generate-report-btn').click()
    await page.waitForURL(/report\.html\?id=/)
    const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('stockReport')))
    expect(stored.content).toBe(report.content)
    expect(stored.tickers).toBe(malicious.toUpperCase())
})

test('malformed stock data cannot reach report worker or navigate', async ({page}) => {
    const calls = await offline(page, {badStock:true})
    await page.goto('./')
    await page.waitForFunction(() => window.vueApp)
    await addTicker(page, 'aapl')
    await page.evaluate(() => window.vueApp.fetchStockData())
    await expect(page.locator('.loading-panel')).toContainText('Error fetching stock data')
    expect(calls.map(x => x.kind)).toEqual(['stock'])
    expect(await page.evaluate(() => sessionStorage.getItem('stockReport'))).toBeNull()
})

test('provider report error cannot store a successful report', async ({page}) => {
    await offline(page, {badReport:true})
    await page.goto('./')
    await page.waitForFunction(() => window.vueApp)
    await addTicker(page, 'aapl')
    await page.evaluate(() => window.vueApp.fetchStockData())
    await expect(page.locator('.loading-panel')).toContainText('Error generating AI report')
    expect(await page.evaluate(() => sessionStorage.getItem('stockReport'))).toBeNull()
})

test('legacy URL report and chart error paths render ticker text safely', async ({page}) => {
    await offline(page)
    await page.goto(`report.html?tickers=${encodeURIComponent(malicious)}&report=Legacy%20URL%20report`)
    await expect(page.locator('.report-content').first()).toHaveText('Legacy URL report')
    await assertSafe(page)
    for (const raw of ['not json', JSON.stringify({results:[]}), '```json\nnot json\n```']) {
        await page.evaluate(({malicious, raw}) => sessionStorage.setItem('stockReport', JSON.stringify({
            tickers:malicious, content:'Legacy stored report', timestamp:1, rawStockData:[raw], dayRange:3
        })), {malicious, raw})
        await page.goto('report.html?id=fixture')
        await expect(page.locator('.chart-error h3')).toContainText(malicious)
        await assertSafe(page)
    }
})

test('storage quota failure retains the encoded legacy URL fallback', async ({page}) => {
    await offline(page)
    await page.goto('./')
    await page.waitForFunction(() => window.vueApp)
    await page.evaluate(() => {
        Storage.prototype.setItem = () => { throw new Error('offline quota fixture') }
        window.vueApp.tickersArr = ['AAPL']
    })
    await page.evaluate(() => window.vueApp.fetchStockData())
    await page.waitForURL(/report\.html\?tickers=/)
    await expect(page.locator('.report-content').first()).toContainText(report.content)
})

test('legacy popup ticker text cannot become markup', async ({page}) => {
    await offline(page)
    await page.goto('./')
    await page.waitForFunction(() => window.vueApp)
    await page.evaluate(ticker => {
        window.vueApp.tickersArr = [ticker]
        window.vueApp.reportContent = 'Offline legacy popup report'
    }, malicious)
    const popupPromise = page.waitForEvent('popup')
    await page.evaluate(() => window.vueApp.openReportInNewTab())
    const popup = await popupPromise
    await expect(popup.locator('.tickers')).toHaveText(`Analyzed Tickers: ${malicious}`)
    await assertSafe(popup)
})

test('multiple personalities retain ordered messages and carousel data', async ({page}) => {
    const calls = await offline(page)
    await page.goto('./')
    await page.waitForFunction(() => window.vueApp)
    await page.evaluate(() => {
        window.vueApp.tickersArr = ['AAPL', 'TSLA']
        window.vueApp.selectedPersonalities = ['dodgy-dave', 'stephen-colbert']
        window.vueApp.dayRange = 7
    })
    await page.evaluate(() => window.vueApp.fetchStockData())
    await page.waitForURL(/report\.html\?id=/)
    const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('stockReport')))
    expect(stored.personalityIds).toEqual(['dodgy-dave', 'stephen-colbert'])
    expect(stored.dayRange).toBe(7)
    expect(stored.rawStockData).toHaveLength(2)
    expect(calls.map(call => call.kind)).toEqual(['stock','stock','report','report'])
    expect(calls[2].messages[0].content).toContain('trading guru')
    expect(calls[3].messages[0].content).toContain('Stephen Colbert')
    await expect(page.locator('.report-content')).toContainText([report.content])
})
