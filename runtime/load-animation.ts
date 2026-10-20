export async function loadAnimationRuntime() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return null
    try {
        return await import('./animation-runtime')
    } catch (error) {
        console.warn('Optional animation runtime unavailable; report generation remains available.', error)
        return null
    }
}
