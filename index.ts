import { initializeApp } from './app.js'
import { loadAnimationRuntime } from './runtime/load-animation'

async function start(): Promise<void> {
    const [vue, animations] = await Promise.all([
        import('./runtime/vue-runtime').catch(() => null),
        loadAnimationRuntime()
    ])
    // Temporary bridge to the legacy UI, removed as its methods migrate.
    if (vue) Object.assign(window, { Vue: vue })
    if (animations) Object.assign(window, animations)
    initializeApp()
}
void start()
