import { parseStoredReport, REPORT_STORAGE_KEY } from './report-api.ts'
import type { StoredReport } from './report-api.ts'

export interface ReportState {
    tickers: string
    reportData: string
    reports: Record<string, string>
    personalityIds: string[]
    currentPersonalityIndex: number
    personality: string
    dayRange: number
    rawStockData: string[]
    hasChartData: boolean
    isLoading: boolean
}
export function stateFromReport(report: StoredReport): ReportState {
    const multi = 'reports' in report
    const ids = multi ? report.personalityIds : []
    const first = ids[0] ?? 'dodgy-dave'
    const reports = multi ? report.reports : {}
    return {
        tickers: report.tickers,
        reportData: multi ? (Object.hasOwn(reports, first) ? reports[first] ?? '' : '') : report.content,
        reports,
        personalityIds: ids,
        currentPersonalityIndex: 0,
        personality: multi ? first : (report.personality ?? 'dodgy-dave'),
        dayRange: report.dayRange || 3,
        rawStockData: report.rawStockData ?? [],
        hasChartData: Boolean(report.rawStockData?.length),
        isLoading: false
    }
}
export function readReportState(search: string, storage?: Pick<Storage, 'getItem'>): ReportState | null {
    const params = new URLSearchParams(search)
    if (params.get('id')) {
        try {
            const raw = (storage ?? sessionStorage).getItem(REPORT_STORAGE_KEY)
            if (raw) {
                const report = parseStoredReport(JSON.parse(raw))
                if (report.tickers && ('reports' in report || report.content)) return stateFromReport(report)
            }
        } catch (error) {
            console.warn('Saved report could not be read', error)
        }
    }
    const tickers = params.get('tickers')
    const content = params.get('report')
    if (!tickers || !content) return null
    // URLSearchParams already performs the single decoding matching our links.
    return stateFromReport({ tickers, content, timestamp: 0 })
}
