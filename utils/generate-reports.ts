import { fetchReportContent } from './report-api.ts'
import type { Message } from './report-api.ts'
import type { Personality } from '../personalities'

export function reportMessages(stockData: string, personality: Personality): Message[] {
    return [
        { role: 'system', content: personality.systemPrompt },
        { role: 'user', content: `${stockData}
            ###
                        ${personality.examples}
            ###
            ` }
    ]
}
export async function generatePersonalityReports(
    stockData: string,
    ids: string[],
    personalities: Record<string, Personality>,
    onProgress: (index: number, total: number) => void,
    request: typeof fetch = fetch,
    pause: (milliseconds: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms))
): Promise<Record<string, string>> {
    const reports: Record<string, string> = {}
    for (const [index, id] of ids.entries()) {
        const personality = personalities[id]
        if (!personality) throw new Error('Unknown report personality')
        onProgress(index, ids.length)
        reports[id] = await fetchReportContent(reportMessages(stockData, personality), request)
        if (index < ids.length - 1) await pause(500)
    }
    return reports
}
