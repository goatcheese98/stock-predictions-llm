const { test, expect } = require('@playwright/test')
const {stock, report, malicious, offline, addTicker, assertSafe} = require('./helpers.cjs')

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
    await page.waitForFunction(() => window.stockCharts?.length === 1)
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
    await expect(popup.locator('.print-chart-canvas')).toHaveCount(1)
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

test('failed chart runtime preserves report/source data and disables unavailable controls', async ({page}) => {
    await offline(page, {failedChunk:'chart-runtime'})
    await page.goto('./')
    await page.evaluate(raw => sessionStorage.setItem('stockReport', JSON.stringify({tickers:'AAPL',content:'Saved fixture report',timestamp:1,dayRange:3,rawStockData:[raw]})), JSON.stringify(stock))
    await page.goto('report.html?id=fixture')
    await expect(page.locator('.report-content').first()).toHaveText('Saved fixture report')
    await expect(page.getByRole('status')).toContainText('Chart rendering is unavailable')
    await expect(page.locator('#addDay-0')).toBeDisabled()
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('stockReport')).rawStockData)).toEqual([JSON.stringify(stock)])
    await page.getByRole('button', {name:'Custom Print'}).click()
    const popupPromise = page.waitForEvent('popup')
    await page.evaluate(() => window.previewPrint())
    const popup = await popupPromise
    await expect(popup.locator('.chart-error')).toContainText('Chart rendering is unavailable for this print')
    await expect(popup.locator('.print-chart-canvas')).toHaveCount(0)
})

test('failed report dependency displays a recoverable error without deleting saved data', async ({page}) => {
    await offline(page, {failedChunk:'report-view'})
    await page.goto('./')
    await page.evaluate(() => sessionStorage.setItem('stockReport', JSON.stringify({tickers:'AAPL',content:'Keep this report',timestamp:1})))
    await page.goto('report.html?id=fixture')
    await expect(page.getByRole('alert')).toContainText('Your saved report has been kept')
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('stockReport')).content)).toBe('Keep this report')
    await expect(page.getByRole('link', {name:'Back to Home'})).toHaveAttribute('href', 'index.html')
})

test('unavailable optional animation chunk cannot break input, slider or report generation', async ({page}) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await offline(page, {failedChunk:'animation-runtime'})
    await page.goto('./')
    await page.waitForFunction(() => window.vueApp)
    await addTicker(page, 'AAPL')
    await page.locator('input[type=range]').fill('7')
    await expect(page.locator('.day-range-number')).toHaveText('7')
    await page.locator('.generate-report-btn').click()
    await page.waitForURL(/report\.html\?id=/)
    await expect(page.locator('.report-content').first()).toContainText(report.content)
    expect(errors).toEqual([])
})

test('bundled animation runtime initializes and respects reduced motion', async ({page}) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const scripts = []
    page.on('request', request => { if (request.resourceType() === 'script') scripts.push(request.url()) })
    await offline(page)
    await page.goto('./')
    await page.waitForFunction(() => window.vueApp?.confettiSystem.wiggle)
    expect(scripts.filter(url => /https?:\/\/(?!127\.0\.0\.1)/.test(url))).toEqual([])
    expect(scripts.some(url => url.includes('/animation-runtime-'))).toBe(true)
    const physics = await page.evaluate(() => {
        const timeline = window.vueApp.createExplosion(200,200,100)
        timeline.progress(0.25)
        const pieces = [...document.querySelectorAll('.confetti-piece')]
        const result = {count:pieces.length,transformed:pieces.every(piece=>piece.style.transform.includes('translate'))}
        timeline.progress(1)
        return result
    })
    expect(physics).toEqual({count:5,transformed:true})
    await expect(page.locator('.confetti-piece')).toHaveCount(0)
    expect(errors).toEqual([])
    await page.emulateMedia({reducedMotion:'reduce'})
    scripts.length = 0
    await page.reload()
    await page.waitForFunction(() => window.vueApp)
    expect(scripts.some(url => url.includes('/animation-runtime-'))).toBe(false)
    expect(await page.evaluate(() => window.vueApp.confettiSystem.animationIsOk)).toBe(false)
    expect(await page.locator('.loading-spinner').first().evaluate(el => parseFloat(getComputedStyle(el).animationDuration))).toBeLessThan(0.001)
})

test('bundled real charts preserve OHLC windows, update volume and produce printable pixels', async ({page}) => {
    const errors=[]
    page.on('pageerror', error => errors.push(error.message))
    await offline(page)
    const rows = Array.from({length:6}, (_,i) => ({t:1729008000000+i*86400000,o:100+i,h:110+i,l:99+i,c:105+i,v:1000+i}))
    const raw = JSON.stringify({status:'OK',results:[...rows].reverse()})
    await page.goto('./')
    await page.evaluate(raw => sessionStorage.setItem('stockReport', JSON.stringify({tickers:'AAPL',content:'Offline historical fixture report; no live market data.',timestamp:1,dayRange:3,rawStockData:[raw]})),raw)
    await page.goto('report.html?id=fixture')
    await page.waitForFunction(() => window.stockCharts?.length===1)
    expect(await page.evaluate(() => window.stockCharts[0].data.datasets.map(d=>d.data))).toEqual([rows.slice(-3).map(x=>x.c),rows.slice(-3).map(x=>x.h),rows.slice(-3).map(x=>x.l)])
    expect(await page.evaluate(() => window.stockCharts[0].scales.x.type)).toBe('time')
    await page.locator('#addDay-0').click()
    await expect(page.locator('#currentDayCount-0')).toHaveText('4')
    expect(await page.evaluate(() => window.stockCharts[0].data.datasets[0].data)).toEqual(rows.slice(-4).map(x=>x.c))
    expect(await page.evaluate(() => window.stockCharts[0].config.options.plugins.tooltip.callbacks.afterBody([{dataIndex:0}]))).toEqual(['','📦 Volume: 1,002'])
    await page.locator('#removeDay-0').click()
    await expect(page.locator('#currentDayCount-0')).toHaveText('3')
    const pixels = await page.locator('canvas').evaluate(canvas => [...canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data].filter((v,i)=>i%4===3 && v>0).length)
    expect(pixels).toBeGreaterThan(100)
    await page.evaluate(() => {const chart=window.stockCharts[0];chart.stop();chart.update('none')})
    await page.screenshot({path:'docs/evidence/report-offline-desktop.png',fullPage:true,animations:'disabled'})
    await page.setViewportSize({width:390,height:844})
    await page.reload()
    await page.waitForFunction(() => window.stockCharts?.length===1)
    await page.evaluate(() => {const chart=window.stockCharts[0];chart.stop();chart.update('none')})
    await page.screenshot({path:'docs/evidence/report-offline-mobile.png',fullPage:true,animations:'disabled'})
    await page.getByRole('button',{name:'Custom Print'}).click()
    await page.locator('#includeAnalysisCard').click()
    const popupPromise=page.waitForEvent('popup')
    await page.evaluate(() => window.previewPrint())
    const popup=await popupPromise
    await expect(popup.locator('.print-chart-canvas')).toHaveAttribute('src',/^data:image\/png/)
    await expect(popup.locator('.print-analysis-content')).toContainText('Offline historical fixture report')
    expect(errors).toEqual([])
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')))
    expect(await page.evaluate(() => window.stockCharts.length)).toBe(0)
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted:true})))
    await page.waitForFunction(() => window.stockCharts?.length===1)
    await expect(page.locator('.report-content').first()).toContainText('Offline historical fixture report')
})

test('missing canvas context is reported without losing the report', async ({page}) => {
    await offline(page)
    await page.addInitScript(() => {HTMLCanvasElement.prototype.getContext = () => null})
    await page.goto('./')
    await page.evaluate(raw=>sessionStorage.setItem('stockReport',JSON.stringify({tickers:'AAPL',content:'Canvas unavailable fixture',timestamp:1,rawStockData:[raw]})),JSON.stringify(stock))
    await page.goto('report.html?id=fixture')
    await expect(page.locator('.report-content').first()).toHaveText('Canvas unavailable fixture')
    await expect(page.getByRole('status')).toContainText('Chart rendering is unavailable')
    await expect(page.locator('#addDay-0')).toBeDisabled()
    await expect(page.locator('#removeDay-0')).toBeDisabled()
})
