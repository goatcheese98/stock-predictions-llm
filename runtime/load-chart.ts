export async function loadChartRuntime() {
    const runtime = await import('./chart-runtime')
    return runtime.Chart
}
