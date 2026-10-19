import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { formatDate, getDateNDaysAgo, getDatesForRange, dates } from '../utils/dates.ts'
import { fetchStock, fetchReportContent, parseStoredReport, storeReport } from '../utils/report-api.ts'
const stock = readFileSync(new URL('./fixtures/stock.json', import.meta.url), 'utf8')
const report = readFileSync(new URL('./fixtures/report.json', import.meta.url), 'utf8')
const range = { startDate: '2024-01-01', endDate: '2024-01-03' }
const respond = (body, status = 200) => async () => new Response(body, { status })

test('local calendar dates preserve leap, month, year and DST boundaries', () => {
    process.env.TZ = 'America/Vancouver'
    for (const [year, month, day, expected] of [
        [2024, 2, 1, '2024-02-29'], [2025, 2, 1, '2025-02-28'],
        [2025, 0, 1, '2024-12-31'], [2024, 2, 11, '2024-03-10'],
        [2024, 10, 4, '2024-11-03']
    ]) {
        const today = new Date(year, month, day, 0, 30)
        const before = today.getTime()
        assert.equal(getDateNDaysAgo(1, today), expected)
        assert.equal(today.getTime(), before)
    }
    assert.equal(formatDate(new Date(2024, 0, 2)), '2024-01-02')
    const today = new Date(2025, 0, 1)
    for (const n of [1, 3, 7, 30]) assert.deepEqual(getDatesForRange(n, today), {
        startDate: '2024-11-20', endDate: '2024-12-31'
    })
    assert.deepEqual(Object.keys(dates), ['startDate', 'endDate'])
})
test('stock contract preserves raw JSON and encodes the entire ticker as one parameter', async () => {
    const ticker = 'A&B#<img src=x onerror=alert(1)>'
    const raw = await fetchStock(ticker, range, async url => {
        const parsed = new URL(url)
        assert.equal(parsed.origin, 'https://polygon-api-worker.jasani-rohan.workers.dev')
        assert.equal(parsed.searchParams.get('ticker'), ticker)
        assert.equal(parsed.searchParams.get('startDate'), range.startDate)
        assert.equal(parsed.searchParams.size, 3)
        return new Response(stock)
    })
    assert.equal(raw, stock)
})
test('report contract preserves endpoint, message array and content', async () => {
    const messages = [{ role: 'user', content: stock }]
    assert.equal(await fetchReportContent(messages, async (url, init) => {
        assert.equal(url, 'https://openai-api-worker.jasani-rohan.workers.dev')
        assert.equal(init.method, 'POST')
        assert.deepEqual(JSON.parse(init.body), messages)
        return new Response(report)
    }), JSON.parse(report).content)
})
test('provider HTTP, transport, JSON, error and shape failures reject', async () => {
    for (const fn of [request => fetchStock('AAPL', range, request), request => fetchReportContent([], request)]) {
        for (const body of ['<html>failure</html>', 'null', '[]', '{}', '{"error":"denied"}', '{"status":"ERROR"}']) {
            await assert.rejects(fn(respond(body)))
        }
        for (const status of [400, 429, 500]) await assert.rejects(fn(respond('unavailable', status)), /HTTP/)
        await assert.rejects(fn(async () => { throw new Error('offline') }), /offline/)
    }
    for (const value of [{results:[]}, {ticker:4, results:[{t:1,o:1,h:1,l:1,c:2}]}, {status:4, results:[{t:1,o:1,h:1,l:1,c:2}]}, {results:[{t:1,o:1,h:1,l:1,c:'2'}]}, {results:[{t:1,o:1,h:1,l:1,c:2,v:null}]}]) {
        await assert.rejects(fetchStock('AAPL', range, respond(JSON.stringify(value))))
    }
    for (const content of ['', ' ', null, 4, {}]) await assert.rejects(fetchReportContent([], respond(JSON.stringify({content}))))
})
test('sessionStorage key and both report shapes round trip unchanged', () => {
    for (const data of [
        {tickers:'AAPL', content:'Legacy', timestamp:1, personality:'dodgy-dave'},
        {tickers:'AAPL, TSLA', reports:{'dodgy-dave':'Report'}, personalityIds:['dodgy-dave'], timestamp:1, dayRange:3, rawStockData:[stock]}
    ]) {
        let stored
        storeReport(data, {setItem(key, value) { assert.equal(key, 'stockReport'); stored = value }})
        assert.deepEqual(parseStoredReport(JSON.parse(stored)), data)
    }
    for (const data of [null, {}, {tickers:'AAPL', timestamp:1, content:4}, {tickers:'AAPL', timestamp:1, reports:[], personalityIds:[]}]) {
        assert.throws(() => parseStoredReport(data))
    }
    assert.throws(() => storeReport({tickers:'AAPL',content:'x',timestamp:1}, {setItem() {throw new Error('quota')}}), /quota/)
})
