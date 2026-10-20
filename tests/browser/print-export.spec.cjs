const {test,expect}=require('@playwright/test')
const fs=require('node:fs/promises')
const {offline}=require('./helpers.cjs')
const pages=process.env.PAGES_RUNTIME==='1'
const target=pages?'pages':'preview'
const rows=Array.from({length:6},(_,i)=>({t:1729008000000+i*86400000,o:100+i,h:110+i,l:99+i,c:105+i,v:1000+i}))
async function setup(page,width) {
    await offline(page)
    await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'})
    await page.setViewportSize({width,height:900})
    await page.goto('./')
    await page.evaluate(raw=>sessionStorage.setItem('stockReport',JSON.stringify({tickers:'AAPL',content:'Offline print proportion fixture.',timestamp:1,dayRange:3,rawStockData:[raw]})),JSON.stringify({results:[...rows].reverse()}))
    await page.goto('report.html?id=print-proportion')
    await page.waitForFunction(()=>window.stockCharts?.length===1)
    await page.evaluate(async()=>{
        await document.fonts.load('14px "Geist Mono Variable"')
        const live=window.stockCharts[0];live.stop();live.update('none')
        // Observe the real engine without replacing its constructor or datasets.
        const Engine=live.constructor
        window.exportObserved=[]
        Engine.register({id:'observe-real-print',afterDraw(chart){
            if(chart===live) return
            const point=chart.getDatasetMeta(0).data[0]
            window.exportObserved.push({width:chart.width,height:chart.height,ratio:chart.currentDevicePixelRatio,
                values:chart.data.datasets.map(series=>series.data),labels:chart.data.labels.map(date=>date.toISOString()),
                colors:chart.data.datasets.map(series=>series.borderColor),
                ticks:chart.options.scales.y.ticks.color,font:chart.options.scales.y.ticks.font,
                legend:chart.options.plugins.legend.labels.font,fontLoaded:document.fonts.check('14px \"Geist Mono Variable\"'),
                point:{x:point.x,y:point.y,radius:point.options.radius},
                visible:chart.data.datasets.map((_,index)=>chart.isDatasetVisible(index))})
        }})
        window.liveRefs={data:live.data,options:live.config.options,series:live.data.datasets[0],values:live.data.datasets[0].data}
        window.snapshot=()=>({raw:JSON.stringify({data:live.config.data,options:live.config.options}),
            width:live.width,height:live.height,bitmap:[live.canvas.width,live.canvas.height],
            registry:Object.keys(Engine.instances),active:live.getActiveElements().length,
            references:live.data===window.liveRefs.data && live.config.options===window.liveRefs.options && live.data.datasets[0]===window.liveRefs.series && live.data.datasets[0].data===window.liveRefs.values})
        window.beforeExport=window.snapshot()
        window.liveCalls=[]
        for(const method of ['update','stop','resize','destroy']) {
            const original=live[method]
            live[method]=function(...args){window.liveCalls.push(method);return original.apply(this,args)}
        }
    })
    await page.getByRole('button',{name:'Custom Print'}).click()
}
async function preview(page) {
    const pending=page.waitForEvent('popup')
    await page.evaluate(()=>window.previewPrint())
    const popup=await pending
    await popup.setViewportSize({width:900,height:1100})
    await popup.evaluate(async()=>{await Promise.all([document.fonts.load('16px "Geist Popup"'),document.fonts.load('16px "Geist Mono Popup"')])})
    return popup
}
for(const [label,width] of [['mobile',390],['desktop',1280]]) {
    test(`isolated ${label} print uses real proportional chart, preserves data/live state and renders print media`,async({page})=>{
        await setup(page,width)
        const popup=await preview(page)
        const observed=await page.evaluate(()=>window.exportObserved.at(-1))
        expect(observed).toMatchObject({width:800,height:570,ratio:2,values:[rows.slice(-3).map(x=>x.c),rows.slice(-3).map(x=>x.h),rows.slice(-3).map(x=>x.l)],
            colors:['#000','#ff4757','#3742fa'],ticks:'#18181b',font:{family:'Geist Mono Variable',size:14},legend:{size:14},fontLoaded:true,visible:[true,true,true]})
        expect(observed.labels).toEqual(rows.slice(-3).map(row=>new Date(row.t).toISOString()))
        expect(await page.evaluate(()=>window.beforeExport.width)).not.toBe(await page.evaluate(()=>window.beforeExport.height))
        const image=popup.locator('.print-chart-canvas')
        const raster=await image.evaluate(async image=>{
            await image.decode()
            const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight
            const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0)
            return {width:image.naturalWidth,height:image.naturalHeight,corner:[...ctx.getImageData(0,0,1,1).data]}
        })
        expect(raster).toEqual({width:1600,height:1140,corner:[255,255,255,255]})
        // A real point's bright green center has equal horizontal/vertical radii.
        const diameters=await image.evaluate(async(image,point)=>{
            await image.decode();const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight
            const ctx=c.getContext('2d');ctx.drawImage(image,0,0)
            const x=Math.round(point.x*2),y=Math.round(point.y*2)
            const green=(x,y)=>{const p=ctx.getImageData(x,y,1,1).data;return p[1]>200 && p[0]<120 && p[2]<180}
            const span=(dx,dy)=>{let n=0;for(let i=-30;i<=30;i++)if(green(x+i*dx,y+i*dy))n++;return n}
            return {x:span(1,0),y:span(0,1)}
        },observed.point)
        expect(diameters.x).toBeGreaterThan(15)
        expect(Math.abs(diameters.x-diameters.y)).toBeLessThanOrEqual(2)
        await popup.screenshot({path:`docs/evidence/print-proportion-${target}-${label}.png`,fullPage:true,animations:'disabled'})
        await popup.emulateMedia({media:'print',colorScheme:'dark'})
        await expect(popup.locator('.preview-actions')).toBeHidden()
        expect(await image.evaluate(el=>getComputedStyle(el).visibility)).toBe('visible')
        const bounds=await image.boundingBox()
        expect(bounds.width/bounds.height).toBeCloseTo(raster.width/raster.height,2)
        expect(await popup.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--bg').trim())).toBe('#fff')
        expect(await popup.evaluate(()=>document.fonts.check('16px "Geist Popup"') && document.fonts.check('16px "Geist Mono Popup"'))).toBe(true)
        expect(await popup.locator('.print-chart-ticker-overlay').evaluate(el=>getComputedStyle(el).color)).toBe('rgb(255, 255, 255)')
        await popup.screenshot({path:`docs/evidence/print-media-${target}-${label}.png`,fullPage:true,animations:'disabled'})
        await fs.mkdir('quality-artifacts',{recursive:true})
        await fs.writeFile(`quality-artifacts/print-${target}-${label}.json`,JSON.stringify({observed,raster,diameters,bounds},null,2))
        const pdf=await popup.pdf({path:`quality-artifacts/print-${target}-${label}.pdf`,preferCSSPageSize:true,printBackground:true})
        expect(pdf.subarray(0,5).toString()).toBe('%PDF-')
        expect(pdf.toString('latin1')).toContain('/Subtype /Image')
        expect(pdf.length).toBeGreaterThan(15000)
        expect(await page.evaluate(()=>window.snapshot())).toEqual(await page.evaluate(()=>window.beforeExport))
        expect(await page.evaluate(()=>window.liveCalls)).toEqual([])
        await popup.close()
    })
}
test('real print renderer cleans up after context, render and serialization failures without mutating live chart',async({page})=>{
    await setup(page,390)
    for(const failure of ['context','render','encode']) {
        await page.evaluate(failure=>{
            const live=window.stockCharts[0],Engine=live.constructor
            window.restoreFailure=()=>{}
            if(failure==='render') {
                const plugin={id:'fail-real-print',afterInit(chart){if(chart!==live)throw new Error('Offline print render failure')}}
                Engine.register(plugin);window.restoreFailure=()=>Engine.unregister(plugin)
            } else {
                const method=failure==='context'?'getContext':'toDataURL',original=HTMLCanvasElement.prototype[method]
                HTMLCanvasElement.prototype[method]=function(...args){if(this!==live.canvas){if(method==='getContext')return null;throw new Error('Offline PNG serialization failure')}return original.apply(this,args)}
                window.restoreFailure=()=>{HTMLCanvasElement.prototype[method]=original}
            }
        },failure)
        const popup=await preview(page)
        await expect(popup.locator('.print-chart-canvas')).toHaveCount(0)
        await expect(popup.locator('.print-chart-title')).toContainText('AAPL')
        expect(await page.evaluate(()=>window.snapshot())).toEqual(await page.evaluate(()=>window.beforeExport))
        expect(await page.evaluate(()=>window.liveCalls)).toEqual([])
        await popup.close()
        await page.evaluate(()=>window.restoreFailure())
    }
    const recovered=await preview(page)
    await expect(recovered.locator('.print-chart-canvas')).toHaveCount(1)
    expect(await page.evaluate(()=>window.snapshot())).toEqual(await page.evaluate(()=>window.beforeExport))
    expect(await page.evaluate(()=>window.liveCalls)).toEqual([])
    await recovered.close()
})
