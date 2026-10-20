const {test,expect}=require('@playwright/test')
const fs=require('node:fs/promises')
const path=require('node:path')
const root=path.resolve('dist')
const observations=[]
test.afterAll(async()=>{
    await fs.mkdir('quality-artifacts',{recursive:true})
    await fs.writeFile('quality-artifacts/pages-responses.json',JSON.stringify(observations,null,2))
})
function record(url,response) {
    const headers=response.headers()
    observations.push({path:url,status:response.status(),headers})
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['referrer-policy']).toBe('no-referrer')
    expect(headers['permissions-policy']).toContain('camera=()')
    expect(headers['content-security-policy']).toContain("script-src 'self' 'unsafe-eval'")
    expect(headers['content-security-policy']).toContain("style-src 'self' 'unsafe-inline'")
    return headers
}
test('Pages serves actual built HTML, native canonical redirects and explicit no-store data/error responses',async({request})=>{
    for(const [url,location] of [['/index.html?x=%25','/?x=%25'],['/report.html?id=fixture','/report?id=fixture']]) {
        const response=await request.get(url,{maxRedirects:0})
        const headers=record(url,response)
        expect(response.status()).toBe(308)
        expect(headers.location).toBe(location)
        expect(headers['cache-control']).toBe('no-store')
    }
    for(const [url,file] of [['/','index.html'],['/report?id=fixture','report.html'],['/report?tickers=AAPL&report=Offline%20%25','report.html']]) {
        const response=await request.get(url)
        const headers=record(url,response)
        expect(response.status()).toBe(200)
        expect(headers['content-type']).toContain('text/html')
        expect(headers['cache-control']).toBe('no-store')
        expect(await response.text()).toBe(await fs.readFile(path.join(root,file),'utf8'))
    }
    const probe=path.join(root,'offline-runtime-probe.json')
    await fs.writeFile(probe,JSON.stringify({offlinePolicyProbe:true}))
    try {
        const response=await request.get('/offline-runtime-probe.json')
        const headers=record('/offline-runtime-probe.json',response)
        expect(response.status()).toBe(200)
        expect(headers['content-type']).toContain('application/json')
        expect(headers['cache-control']).toBe('no-store')
        expect(await response.json()).toEqual({offlinePolicyProbe:true})
    } finally {await fs.unlink(probe)}
    const privateData=await request.get('/stockReport.json')
    expect(record('/stockReport.json',privateData)['cache-control']).toBe('no-store')
    expect(privateData.status()).toBe(404)
})
test('only exact emitted hashed JS, CSS and font URLs receive immutable caching and correct MIME',async({request})=>{
    const files=(await fs.readdir(path.join(root,'assets'))).filter(file=>/\.(js|css|woff2)$/.test(file))
    expect(files.some(file=>file.endsWith('.js'))).toBe(true)
    expect(files.some(file=>file.endsWith('.css'))).toBe(true)
    expect(files.some(file=>file.endsWith('.woff2'))).toBe(true)
    for(const file of files) {
        const url='/assets/'+file
        const response=await request.get(url)
        const headers=record(url,response)
        expect(response.status()).toBe(200)
        expect(headers['cache-control']).toBe('public, max-age=31536000, immutable')
        expect(headers['content-type']).toContain(file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'font/woff2')
        expect(Buffer.from(await response.body())).toEqual(await fs.readFile(path.join(root,'assets',file)))
    }
    const image=await request.get('/images/Dody_Dave.png')
    expect(record('/images/Dody_Dave.png',image)['cache-control']).toBe('no-store')
})
test('unknown and temporarily missing known JS/CSS/fonts remain real non-cacheable 404s, never SPA HTML successes',async({request})=>{
    const missing=async url=>{
        const response=await request.get(url)
        expect(response.status()).toBe(404)
        const headers=record(url,response)
        expect(headers['cache-control']).toBe('no-store')
        expect(await response.text()).toContain('<h1>Not found</h1>')
        expect(await response.text()).not.toContain('id="app"')
    }
    for(const extension of ['js','css','woff2']) await missing(`/assets/missing-ABCDef12.${extension}`)
    const files=await fs.readdir(path.join(root,'assets'))
    for(const extension of ['js','css','woff2']) {
        const file=files.find(name=>name.endsWith('.'+extension))
        const target=path.join(root,'assets',file)
        const original=await fs.readFile(target)
        await fs.unlink(target)
        try {await missing('/assets/'+file)} finally {await fs.writeFile(target,original)}
        const restored=await request.get('/assets/'+file)
        expect(restored.status()).toBe(200)
        expect(restored.headers()['cache-control']).toContain('immutable')
    }
})
