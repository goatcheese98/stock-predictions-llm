import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { readReportState, stateFromReport } from '../utils/report-state.ts'
import { generatePersonalityReports, reportMessages } from '../utils/generate-reports.ts'
import { PERSONALITIES } from '../personalities.ts'
const stock = readFileSync(new URL('./fixtures/stock.json', import.meta.url), 'utf8')
const hashes = JSON.parse(readFileSync(new URL('./fixtures/personality-hashes.json', import.meta.url), 'utf8'))
const saved = {tickers:'AAPL, TSLA',reports:{'dodgy-dave':'First','stephen-colbert':'Second'},personalityIds:['dodgy-dave','stephen-colbert'],timestamp:1,dayRange:7,rawStockData:[stock,stock]}

test('personality names, subtitles, prompts and examples exactly match checkpoint hashes', () => {
    for (const [id, personality] of Object.entries(PERSONALITIES)) {
        assert.equal(createHash('sha256').update(JSON.stringify(personality)).digest('hex'), hashes[id])
        assert.deepEqual(reportMessages(stock,personality), [
            {role:'system',content:personality.systemPrompt},
            {role:'user',content:stock+'\n            ###\n                        '+personality.examples+'\n            ###\n            '}
        ])
    }
})
test('ordered multi-personality requests retain prompts, spacing and between-call delay', async () => {
    const bodies=[],progress=[],pauses=[]
    const result=await generatePersonalityReports(stock,saved.personalityIds,PERSONALITIES,
        (...values)=>progress.push(values),
        async (url,init)=>{bodies.push(JSON.parse(init.body));return new Response(JSON.stringify({content:`Report ${bodies.length}`}))},
        async ms=>{pauses.push(ms)})
    assert.deepEqual(result,{'dodgy-dave':'Report 1','stephen-colbert':'Report 2'})
    assert.deepEqual(bodies,saved.personalityIds.map(id=>reportMessages(stock,PERSONALITIES[id])))
    assert.deepEqual(progress,[[0,2],[1,2]])
    assert.deepEqual(pauses,[500])
})
test('unrecognized personality and a partial provider failure never become a completed result', async () => {
    let requests=0
    const request=async()=>{requests++;return requests===1?new Response('{"content":"First only"}'):new Response('{"error":"unavailable"}')}
    await assert.rejects(generatePersonalityReports(stock,['unknown'],PERSONALITIES,()=>{},request,async()=>{}),/Unknown/)
    assert.equal(requests,0)
    await assert.rejects(generatePersonalityReports(stock,saved.personalityIds,PERSONALITIES,()=>{},request,async()=>{}),/provider error/)
    assert.equal(requests,2)
})
test('report state retains carousel order, charts, day range and legacy personality', () => {
    const state=readReportState('?id=123',{getItem(key){assert.equal(key,'stockReport');return JSON.stringify(saved)}})
    assert.equal(state.reportData,'First')
    assert.equal(state.personality,'dodgy-dave')
    assert.deepEqual(state.personalityIds,saved.personalityIds)
    assert.equal(state.dayRange,7)
    assert.deepEqual(state.rawStockData,saved.rawStockData)
    assert.equal(state.hasChartData,true)
    const legacy=stateFromReport({tickers:'AAPL',content:'Legacy',timestamp:1,personality:'bernie-sanders'})
    assert.equal(legacy.personality,'bernie-sanders')
    assert.equal(legacy.dayRange,3)
    assert.equal(legacy.hasChartData,false)
    assert.deepEqual(legacy.personalityIds,[])
})
test('URL fallback decodes once, ignores stale storage without an id and preserves literal percent text', () => {
    const content='Hold 10% & literal %20 text + unicode 📊'
    const params=new URLSearchParams({tickers:'A&B',report:content})
    const state=readReportState('?'+params,{getItem(){throw new Error('must not access storage')}})
    assert.equal(state.reportData,content)
    assert.equal(state.tickers,'A&B')
    assert.equal(readReportState(''),null)
    assert.equal(readReportState('?report=missing-ticker'),null)
})
test('corrupt/unavailable storage falls back to URL or a recoverable missing-report state', () => {
    const previous=console.warn
    console.warn=()=>{}
    try {
        for(const storage of [{getItem(){return 'broken json'}},{getItem(){return '{}'}},{getItem(){throw new Error('denied')}}]){
            assert.equal(readReportState('?id=1',storage),null)
            assert.equal(readReportState('?id=1&tickers=AAPL&report=Legacy',storage).reportData,'Legacy')
        }
    } finally {console.warn=previous}
})
