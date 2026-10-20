import { initializeApp } from './input-app'
import { loadAnimationRuntime } from './runtime/load-animation'

async function start(): Promise<void> {
    const [vue, animations] = await Promise.all([
        import('./runtime/vue-runtime').catch(() => null),
        loadAnimationRuntime()
    ])
    initializeApp(vue, animations)
}
void start()
