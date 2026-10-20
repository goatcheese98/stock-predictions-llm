const {expect}=require('@playwright/test')
const {offline,addTicker,stock}=require('./helpers.cjs')
module.exports=async function fallbackRecovery(page,reportUrl) {
    const {report}=require('./helpers.cjs')
    const calls=await offline(page)
    let failedVue=false
    await page.context().route('**/vue-runtime-*.js',route=>{
        if(failedVue) return route.fallback()
        failedVue=true
        return route.abort('failed')
    })
    let release, started, failed
    const held=new Promise(resolve=>release=resolve)
    const requested=new Promise(resolve=>started=resolve)
    const aborted=new Promise(resolve=>failed=resolve)
    page.on('requestfailed',request=>{if(request.url().startsWith('https://polygon-api-worker.')) failed(request.failure()?.errorText)})
    let first=true
    await page.context().route('https://polygon-api-worker.jasani-rohan.workers.dev/**',async route=>{
        if(!first) return route.fallback()
        first=false
        started(route.request().url())
        await held
        try {await route.fulfill({json:stock})} catch {}
    })
    await page.goto('./')
    await addTicker(page,'aapl')
    await page.locator('#ticker-input').fill('TSLA')
    await page.locator('.generate-report-btn').click()
    const originalRequest=new URL(await requested)
    expect(originalRequest.searchParams.get('ticker')).toBe('AAPL')
    await expect(page.locator('.loading-panel')).toBeVisible()
    await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})))
    expect(await aborted).toContain('ERR_ABORTED')
    await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})))
    release() // A late provider result must not navigate or complete the old generation.
    await page.waitForTimeout(150)
    expect(await page.evaluate(()=>sessionStorage.getItem('stockReport'))).toBeNull()
    expect(calls.filter(call=>call.kind==='report')).toHaveLength(0)
    expect(new URL(page.url()).pathname).not.toMatch(/report/)
    expect(await page.evaluate(()=>window.vueApp)).toBeUndefined()
    await expect(page.locator('.action-panel')).toBeVisible()
    await expect(page.locator('.loading-panel')).toBeHidden()
    await expect(page.locator('.ticker')).toHaveText('AAPL')
    await expect(page.locator('#ticker-input')).toHaveValue('TSLA')
    await expect(page.locator('.generate-report-btn')).toBeEnabled()
    await page.locator('.generate-report-btn').click()
    await page.waitForURL(reportUrl)
    await expect(page.locator('.report-content').first()).toHaveText(report.content)
    const retried=calls.find(call=>call.kind==='report')
    expect(retried.messages).toEqual([
        {role:'system',content:'You are a trading guru. Given data on share prices over the past 3 days, write a report of no more than 150 words describing the stocks performance and recommending whether to buy, hold or sell.'},
        {role:'user',content:JSON.stringify(stock)}
    ])
    expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('stockReport')))).toMatchObject({tickers:'AAPL',content:report.content})
}
