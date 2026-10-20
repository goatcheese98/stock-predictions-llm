import type { Chart, ChartOptions, Plugin } from 'chart.js'

// Clone raw configuration, not Chart.js's resolved option proxies. Dates and
// callbacks retain their meaning; mutable arrays/objects belong to this export.
function copy<T>(value: T): T {
    if (value instanceof Date) return new Date(value.getTime()) as T
    if (Array.isArray(value)) return value.map(item => copy(item)) as T
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)])) as T
    }
    return value
}

const paper: Plugin<'line'> = {
    id: 'stock-print-paper',
    beforeDraw(chart) {
        const { ctx, width, height } = chart
        ctx.save()
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, width, height)
        ctx.restore()
    }
}

/** A separate real Chart.js instance: never stop/update/resize the live chart. */
export function exportPrintChart(ChartRuntime: typeof Chart, source: Chart<'line', number[], Date>): string | null {
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 570
    try {
        const data = copy(source.config.data)
        data.datasets.forEach((dataset, index) => { dataset.hidden = !source.isDatasetVisible(index) })
        const options: ChartOptions<'line'> = copy(source.config.options ?? {})
        options.responsive = false
        options.maintainAspectRatio = false
        options.devicePixelRatio = 2
        options.animation = false
        options.events = []
        options.layout = { padding: { top: 15, right: 20, bottom: 10, left: 10 } }
        for (const scale of Object.values(options.scales ?? {})) {
            if (!scale) continue
            scale.ticks = { ...scale.ticks, color: '#18181b', font: { family: 'Geist Mono Variable', size: 14, weight: 'bold' } }
            scale.grid = { ...scale.grid, color: '#e4e4e7' }
            scale.border = { ...scale.border, color: '#18181b' }
        }
        options.plugins = { ...options.plugins, tooltip: { enabled: false } }
        const legend = options.plugins.legend
        if (legend) legend.labels = { ...legend.labels, color: '#18181b', font: { family: 'Geist Mono Variable', size: 14, weight: 'bold' } }
        const context = canvas.getContext('2d')
        if (!context) return null
        new ChartRuntime<'line', number[], Date>(context, { type: 'line', data, options, plugins: [paper] })
        return canvas.toDataURL('image/png')
    } catch (error) {
        console.warn('Chart image unavailable for printing', error)
        return null
    } finally {
        // Also handles a constructor that registered its instance before failing.
        ChartRuntime.getChart(canvas)?.destroy()
        canvas.remove()
        canvas.width = canvas.height = 0
    }
}
