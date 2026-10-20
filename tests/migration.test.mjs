import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
const root = new URL('../', import.meta.url).pathname
// .wrangler contains generated vendor shims, not handwritten application source.
const excluded = new Set(['node_modules','.git','.wrangler','dist','docs','tests','test-results','playwright-report','quality-artifacts'])
function files(directory) {
    return readdirSync(directory,{withFileTypes:true}).flatMap(entry=> excluded.has(entry.name) ? [] :
        entry.isDirectory() ? files(join(directory,entry.name)) : [join(directory,entry.name)])
}
test('all handwritten application entries are strict TypeScript with no legacy or inline JavaScript escape hatch',()=>{
    const config=JSON.parse(readFileSync(join(root,'tsconfig.json'),'utf8'))
    assert.equal(config.compilerOptions.strict,true)
    assert.notEqual(config.compilerOptions.allowJs,true)
    const javascript=files(root).map(path=>relative(root,path)).filter(path=>/\.[cm]?js$/.test(path) && path!=='playwright.config.cjs')
    assert.deepEqual(javascript,[])
    for(const entry of ['index.html','report.html']) {
        const html=readFileSync(join(root,entry),'utf8')
        assert.doesNotMatch(html,/\son[a-z]+\s*=/i)
        const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
        assert.equal(scripts.length,1)
        for(const [,attributes,body] of scripts) {
            assert.match(attributes,/type="module"/)
            assert.match(attributes,/src="[^"]+\.ts"/)
            assert.equal(body.trim(),'')
        }
    }
})
