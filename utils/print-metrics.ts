import { parseStockResponse } from './report-api.ts'
export interface PrintMetrics {
    latestClose: string; percentChange: number; direction: '↑' | '↓'; high: string; low: string
}
export function printMetrics(raw: string): PrintMetrics | null {
    const match = raw.match(/```json\s*([\s\S]*?)\s*```/)
    const data = parseStockResponse(JSON.parse(match ? match[1] ?? '' : raw))
    const recent = data.results.at(-1)
    const oldest = data.results[0]
    if (!recent || !oldest) return null
    // Retain provider order and the original rounding/formula, including the
    // original zero-denominator behavior. Do not silently sort or invent values.
    const change = Number(((recent.c - oldest.c) / oldest.c * 100).toFixed(2))
    return {
        latestClose: recent.c.toFixed(2), percentChange: Math.abs(change),
        direction: change >= 0 ? '↑' : '↓', high: recent.h.toFixed(2), low: recent.l.toFixed(2)
    }
}
