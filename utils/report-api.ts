import type { DateRange } from './dates'

export interface StockBar { t: number; o: number; h: number; l: number; c: number; v?: number }
export interface StockResponse { results: StockBar[]; status?: string; ticker?: string }
export interface Message { role: 'system' | 'user'; content: string }
interface ReportBase {
    tickers: string
    timestamp: number
    dayRange?: number
    rawStockData?: string[]
}
export interface LegacyReport extends ReportBase { content: string; personality?: string }
export interface PersonalityReport extends ReportBase {
    reports: Record<string, string>
    personalityIds: string[]
}
export type StoredReport = LegacyReport | PersonalityReport
export const REPORT_STORAGE_KEY = 'stockReport'
export function storeReport(report: StoredReport, storage: Pick<Storage, 'setItem'> = sessionStorage): void {
    storage.setItem(REPORT_STORAGE_KEY, JSON.stringify(parseStoredReport(report)))
}
export function parseStoredReport(value: unknown): StoredReport {
    if (!object(value) || typeof value.tickers !== 'string' || typeof value.timestamp !== 'number' ||
        !Number.isFinite(value.timestamp)) throw new Error('Malformed stored report')
    if (value.rawStockData !== undefined && (!Array.isArray(value.rawStockData) ||
        !value.rawStockData.every(item => typeof item === 'string'))) throw new Error('Malformed chart data')
    if (value.dayRange !== undefined && (typeof value.dayRange !== 'number' || !Number.isFinite(value.dayRange))) {
        throw new Error('Malformed day range')
    }
    if ('reports' in value) {
        if (!object(value.reports)) throw new Error('Malformed personality reports')
        const reports = value.reports
        if (!Object.values(reports).every(item => typeof item === 'string') ||
            !Array.isArray(value.personalityIds) || !value.personalityIds.every(id => typeof id === 'string' && Object.hasOwn(reports, id))) {
            throw new Error('Malformed personality reports')
        }
    } else if (typeof value.content !== 'string' ||
        (value.personality !== undefined && typeof value.personality !== 'string')) {
        throw new Error('Malformed legacy report')
    }
    return value as unknown as StoredReport
}
const stockEndpoint = 'https://polygon-api-worker.jasani-rohan.workers.dev/'
const reportEndpoint = 'https://openai-api-worker.jasani-rohan.workers.dev'
function object(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}
async function readJson(response: Response): Promise<{ raw: string; value: unknown }> {
    if (!response.ok) throw new Error(`Worker HTTP error: ${response.status}`)
    const raw = await response.text()
    let value: unknown
    try { value = JSON.parse(raw) } catch { throw new Error('Worker returned invalid JSON') }
    if (object(value) && ('error' in value || value.status === 'ERROR' || value.status === 'NOT_AUTHORIZED')) {
        throw new Error('Worker returned a provider error')
    }
    return { raw, value }
}
export function parseStockResponse(value: unknown): StockResponse {
    if (!object(value) || !Array.isArray(value.results) || value.results.length === 0 ||
        (value.ticker !== undefined && typeof value.ticker !== 'string') ||
        (value.status !== undefined && typeof value.status !== 'string') ||
        !value.results.every((bar: unknown) => object(bar) &&
            ['t', 'o', 'h', 'l', 'c'].every(key => typeof bar[key] === 'number' && Number.isFinite(bar[key])) &&
            (bar.v === undefined || (typeof bar.v === 'number' && Number.isFinite(bar.v))))) {
        throw new Error('Worker returned missing or malformed stock data')
    }
    return value as unknown as StockResponse
}
export async function fetchStock(ticker: string, range: DateRange, request: typeof fetch = fetch): Promise<string> {
    const url = new URL(stockEndpoint)
    url.search = new URLSearchParams({ ticker, startDate: range.startDate, endDate: range.endDate }).toString()
    const { raw, value } = await readJson(await request(url.toString()))
    parseStockResponse(value)
    return raw // Preserve the original prompt and chart/sessionStorage representation.
}
export async function fetchReportContent(messages: Message[], request: typeof fetch = fetch): Promise<string> {
    const { value } = await readJson(await request(reportEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(messages)
    }))
    if (!object(value) || typeof value.content !== 'string' || !value.content.trim()) {
        throw new Error('Worker returned missing or malformed report content')
    }
    return value.content
}
