import {test} from 'node:test'
import assert from 'node:assert/strict'
import {printMetrics} from '../utils/print-metrics.ts'
import {parseStoredReport} from '../utils/report-api.ts'
const bar=(c,t=1)=>({t,o:c,h:c+2,l:c-1,c,v:100})
test('print metrics preserve provider order, formula and rounding for rising/falling data',()=>{
 assert.deepEqual(printMetrics(JSON.stringify({results:[bar(100,3),bar(105.125,1)]})),{latestClose:'105.13',percentChange:5.13,direction:'↑',high:'107.13',low:'104.13'})
 assert.equal(printMetrics('```json\n'+JSON.stringify({results:[bar(105),bar(100)]})+'\n```').direction,'↓')
 assert.equal(printMetrics(JSON.stringify({results:[bar(105),bar(100)]})).percentChange,4.76)
 assert.equal(printMetrics(JSON.stringify({results:[bar(0),bar(1)]})).percentChange,Infinity)
})
test('invalid print stock fields cannot be reflected as HTML or fabricated numeric metrics',()=>{
 for(const raw of ['not json','null','{}',JSON.stringify({results:[]}),JSON.stringify({results:[{...bar(1),h:'<img onerror=attack()>'}]})]) assert.throws(()=>printMetrics(raw))
})
test('personality references must own a validated report string, including special own keys',()=>{
 for(const id of ['__proto__','constructor','toString']) assert.throws(()=>parseStoredReport({tickers:'AAPL',reports:{},personalityIds:[id],timestamp:1}))
 const value=JSON.parse('{"tickers":"AAPL","reports":{"__proto__":"<p>Own report</p>"},"personalityIds":["__proto__"],"timestamp":1}')
 assert.deepEqual(parseStoredReport(value),value)
})
