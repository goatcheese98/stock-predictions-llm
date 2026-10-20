import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Lifecycle } from '../utils/lifecycle.ts'

test('page lifecycle cancels waits, timers and intervals, aborts fetch and renews independently', async () => {
    const scope = new Lifecycle()
    const original = globalThis.fetch
    let signal
    globalThis.fetch = async (_input, init) => { signal=init.signal; return new Response('fixture') }
    try {
        await scope.fetch('https://offline.invalid')
        let calls=0
        scope.timeout(() => calls++, 20)
        scope.interval(() => calls++, 20)
        const paused=scope.pause(1000)
        scope.dispose()
        await assert.rejects(paused, {name:'AbortError'})
        assert.equal(signal.aborted, true)
        await new Promise(resolve => setTimeout(resolve, 40))
        assert.equal(calls, 0)
        assert.equal(scope.disposed, true)
        scope.renew()
        await scope.pause(1)
        assert.equal(scope.disposed, false)
        await scope.fetch('https://offline.invalid')
        assert.equal(signal.aborted, false)
    } finally {scope.dispose(); globalThis.fetch=original}
})
