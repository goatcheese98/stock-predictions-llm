const {test,expect}=require('@playwright/test')
const {stock,offline,addTicker,malicious}=require('./helpers.cjs')
const valid='<div><h2>Offline analysis</h2><p><strong>AAPL</strong> held <em>$105.00 (+5%)</em>. Hold pending review.</p><ul><li>Trading-day data only.</li></ul><table><tbody><tr><th scope="row">Close</th><td>$105.00</td></tr></tbody></table><p><a href="https://example.test/research" title="Fixture source">Research source</a></p></div>'
const code='window.reportAttack=1;window.opener&&(window.opener.reportAttack=2)'
const attacks=[
 `<img src="/offline-attack.png" onerror="${code}"><svg onload="${code}"><a href="javascript:${code}">SVG link</a></svg>`,
 `<script>${code}</script><iframe srcdoc="<script>${code}</script>"></iframe><object data="/offline-attack"></object><embed src="/offline-attack">`,
 `<style>@import url('/offline-attack.css');body{display:none}</style><link rel="stylesheet" href="/offline-attack.css"><meta http-equiv="refresh" content="0;url=/offline-attack">`,
 `<form id="printContent" name="reportApp"><input name="__proto__" autofocus onfocus="${code}"></form><div id="reportApp" data-secret="x" style="background:url('/offline-attack')" onclick="${code}">Passive text</div>`,
 `<a href="jav&#x09;ascript:${code}" onclick="${code}">Unsafe URL</a><a href="&#106;avascript:${code}">Encoded URL</a><a href="data:text/html,<script>${code}</script>">Data URL</a>`,
 `<math><mtext><table><mglyph><style><!--</style><img title="--><img src=/offline-attack onerror=window.reportAttack=1>">`,
 `<svg><foreignObject><div><img src="/offline-attack" onerror="${code}"></div></foreignObject></svg><template><img src="/offline-attack" onerror="${code}"></template>`
]
async function seed(page,data) {
 await page.goto('./')
 await page.evaluate(data=>sessionStorage.setItem('stockReport',JSON.stringify(data)),data)
 await page.goto('report.html?id=trust-fixture')
}
async function safeReport(page,selector='.report-content') {
 const root=page.locator(selector).first()
 await expect(root.locator('img,svg,math,script,style,iframe,object,embed,form,input,button,link,meta,template')).toHaveCount(0)
 const bad=await root.evaluate(root=>[...root.querySelectorAll('*')].flatMap(node=>[...node.attributes].filter(a=>/^(on|data-)|^(?:id|name|style|class|src|srcdoc)$/i.test(a.name)||a.name==='href'&&/^\s*(?:javascript|data|vbscript):/i.test(a.value)).map(a=>a.name)))
 expect(bad).toEqual([])
 expect(await page.evaluate(()=>window.reportAttack)).toBeUndefined()
}
async function preview(page) {
 await page.getByRole('button',{name:'Custom Print'}).click()
 await page.locator('#includeAnalysisCard').click()
 const promise=page.waitForEvent('popup')
 await page.evaluate(()=>window.previewPrint())
 return promise
}

test('provider HTML preserves real report formatting through page and print without executing payloads',async({page})=>{
 const raw=valid+attacks.join('')
 const calls=await offline(page,{reportContent:raw})
 await page.goto('./');await page.waitForFunction(()=>window.vueApp)
 await addTicker(page,'AAPL');await page.locator('.generate-report-btn').click()
 await page.waitForURL(/report\.html\?id=/)
 await expect(page.locator('.report-content h2')).toHaveText('Offline analysis')
 await expect(page.locator('.report-content strong')).toHaveText('AAPL')
 await expect(page.locator('.report-content em')).toHaveText('$105.00 (+5%)')
 await expect(page.locator('.report-content td')).toHaveText('$105.00')
 await expect(page.locator('.report-content a[title="Fixture source"]')).toHaveAttribute('href','https://example.test/research')
 expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('stockReport')).reports['dodgy-dave'])).toBe(raw)
 await safeReport(page)
 await page.getByText('Unsafe URL',{exact:true}).click()
 await safeReport(page)
 // Wait for fonts/natural animation completion while the source is foreground.
 // Print no longer stops it, and background popup tabs may throttle animation.
 await page.evaluate(()=>document.fonts.ready)
 await expect.poll(async()=>page.evaluate(()=>{const chart=window.stockCharts[0];return Math.abs(chart.getDatasetMeta(0).data[0].y-chart.scales.y.getPixelForValue(105))})).toBeLessThan(0.000005)
 const popup=await preview(page)
 await expect(popup.locator('.print-analysis-content strong')).toHaveText('AAPL')
 await expect(popup.locator('.print-analysis-content td')).toHaveText('$105.00')
 await safeReport(popup,'.print-analysis-content')
 expect(await popup.evaluate(()=>window.opener)).toBeNull()
 expect(await popup.title()).toMatch(/Stock Report|Print Preview/)
 await expect(popup.locator('.print-chart-canvas')).toHaveCount(1)
 const point = await page.evaluate(()=>{const chart=window.stockCharts[0];return {actual:chart.getDatasetMeta(0).data[0].y,expected:chart.scales.y.getPixelForValue(105)}})
 expect(point.actual).toBeCloseTo(point.expected,5)
 expect(calls.some(call=>call.kind==='report-resource')).toBe(false)
 await popup.setViewportSize({width:1280,height:900})
 await popup.screenshot({path:'docs/evidence/report-sanitized-preview.png',fullPage:true,animations:'disabled'})
})

test('stored legacy payload corpus is sanitized without rewriting saved report data',async({page})=>{
 const calls=await offline(page)
 for(const attack of attacks){
  const raw=valid+attack
  await seed(page,{tickers:'AAPL',content:raw,timestamp:1})
  await expect(page.locator('.report-content strong')).toHaveText('AAPL')
  await safeReport(page)
  expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('stockReport')).content)).toBe(raw)
 }
 expect(calls.some(call=>call.kind==='report-resource')).toBe(false)
})

test('URL reports and legacy popup use the same formatting and sanitization policy',async({page})=>{
 const calls=await offline(page)
 const raw=valid+attacks.join('')
 await page.goto('report.html?'+new URLSearchParams({tickers:malicious,report:raw}))
 await expect(page.locator('.report-content strong')).toHaveText('AAPL')
 await safeReport(page)
 await page.goto('./');await page.waitForFunction(()=>window.vueApp)
 await page.evaluate(({raw,malicious})=>{window.vueApp.reportContent=raw;window.vueApp.tickersArr=[malicious]},{raw,malicious})
 const pop=page.waitForEvent('popup');await page.evaluate(()=>window.vueApp.openReportInNewTab())
 const popup=await pop
 await expect(popup.locator('.report-content strong')).toHaveText('AAPL')
 await expect(popup.locator('.tickers')).toHaveText(`Analyzed Tickers: ${malicious}`)
 await safeReport(popup)
 expect(await popup.evaluate(()=>window.opener)).toBeNull()
 expect(await popup.title()).toMatch(/Stock Report|Print Preview/)
 expect(await page.evaluate(()=>window.reportAttack)).toBeUndefined()
 expect(calls.some(call=>call.kind==='report-resource')).toBe(false)
})

test('unknown own personality keys stay text-safe and print the currently selected analyst',async({page})=>{
 await offline(page)
 const second=valid+attacks[0]
 await seed(page,{tickers:'AAPL',reports:{'dodgy-dave':'<p>First analyst original</p>',constructor:second},personalityIds:['dodgy-dave','constructor'],timestamp:1})
 await expect(page.locator('.report-content').first()).toHaveText('First analyst original')
 await page.locator('.carousel-next').click()
 await expect(page.locator('.personality-name-carousel')).toHaveText('constructor')
 await expect(page.locator('.report-content strong')).toHaveText('AAPL')
 await expect(page.locator('.personality-img')).toHaveAttribute('src',/images\/Dody_Dave\.png$/)
 await safeReport(page)
 const popup=await preview(page)
 await expect(popup.locator('.print-analysis-content strong')).toHaveText('AAPL')
 await expect(popup.locator('.print-analysis-content')).not.toContainText('First analyst original')
 await safeReport(popup,'.print-analysis-content')
})

test('native print retains the 1200-character limit without cutting through markup or resurrecting payloads',async({page})=>{
 await offline(page)
 const raw='<p><strong>'+('A'.repeat(1199))+'</strong><em>Long report tail</em></p>'+attacks[0]
 await seed(page,{tickers:'AAPL',content:raw,timestamp:1})
 await expect(page.locator('.report-content strong')).toHaveText('A'.repeat(1199))
 await page.evaluate(()=>{window.print=()=>{window.printCalls=(window.printCalls||0)+1}})
 await page.getByRole('button',{name:'Custom Print'}).click();await page.locator('#includeAnalysisCard').click()
 await page.getByRole('button',{name:'Generate PDF',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>window.printCalls)).toBe(1)
 await safeReport(page,'.print-analysis-content')
 const printed=page.locator('.print-analysis-content')
 expect(await printed.evaluate(el=>el.textContent.length)).toBe(1203)
 await expect(printed.locator('strong')).toHaveText('A'.repeat(1199))
 await expect(printed.locator('em')).toHaveText('L')
 expect(await printed.textContent()).toMatch(/L\.\.\.$/)
 await expect(page.locator('#printDialog')).toBeHidden()
})

test('malformed stored chart/metadata and inherited personality references cannot enter print HTML',async({page})=>{
 await offline(page)
 await seed(page,{tickers:'AAPL',content:valid,timestamp:1,rawStockData:[JSON.stringify({results:[{t:1,o:1,h:attacks[0],l:1,c:1}]})]})
 await expect(page.locator('.report-content strong')).toHaveText('AAPL')
 const popup=await preview(page)
 await safeReport(popup,'.print-analysis-content')
 await expect(popup.locator('.print-chart-metrics')).toHaveCount(0)
 await expect(popup.locator('.chart-error')).toContainText('Chart rendering is unavailable')
 for(const data of [
  {tickers:'AAPL',content:valid,timestamp:1,dayRange:attacks[0]},
  {tickers:'AAPL',reports:{},personalityIds:['__proto__'],timestamp:1}
 ]){
  await seed(page,data)
  await expect(page.locator('.error-message')).toContainText('No report data found')
  expect(await page.evaluate(()=>window.reportAttack)).toBeUndefined()
 }
})

test('blocked report and print popups report failure without executing report content',async({page})=>{
 await offline(page)
 await page.goto('./');await page.waitForFunction(()=>window.vueApp)
 await page.evaluate(raw=>{
  window.open=()=>null;window.alert=message=>{window.popupFailure=message}
  window.vueApp.tickersArr=['AAPL'];window.vueApp.reportContent=raw
 },valid+attacks.join(''))
 await page.evaluate(()=>window.vueApp.openReportInNewTab())
 expect(await page.evaluate(()=>window.popupFailure)).toContain('Popup blocked')
 expect(await page.evaluate(()=>window.reportAttack)).toBeUndefined()
 await seed(page,{tickers:'AAPL',content:valid+attacks[0],timestamp:1})
 await expect(page.locator('.report-content strong')).toHaveText('AAPL')
 await page.evaluate(()=>{window.open=()=>null;window.alert=message=>{window.popupFailure=message}})
 await page.getByRole('button',{name:'Custom Print'}).click()
 await page.locator('#includeAnalysisCard').click()
 await page.evaluate(()=>window.previewPrint())
 expect(await page.evaluate(()=>window.popupFailure)).toContain('Popup blocked')
 await safeReport(page,'.print-analysis-content')
})
