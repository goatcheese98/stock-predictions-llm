import type { Plugin } from 'vite'

/** Static Pages metadata only: no Functions, Worker entry or remote binding. */
export function pagesPolicy(): Plugin {
    return {
        name: 'stock-pages-response-policy',
        generateBundle(_options, bundle) {
            const csp = [
                "default-src 'none'",
                "script-src 'self' 'unsafe-eval'", // Retained full Vue template compiler.
                "style-src 'self' 'unsafe-inline'", // Vue/GSAP styles, report CSS and DOM-built popups.
                "img-src 'self' data: https://assets.codepen.io",
                "font-src 'self' data:",
                "connect-src 'self' https://polygon-api-worker.jasani-rohan.workers.dev https://openai-api-worker.jasani-rohan.workers.dev",
                "base-uri 'none'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'self'"
            ].join('; ')
            const hashed = Object.keys(bundle).filter(path =>
                /^assets\/.+-[A-Za-z0-9_-]{8}\.(?:js|css|woff2)$/.test(path)).sort()
            if (hashed.length + 1 > 100) throw new Error('Pages header rule limit exceeded')
            const headers = [
                '/*',
                `  Content-Security-Policy: ${csp}`,
                '  X-Content-Type-Options: nosniff',
                '  Referrer-Policy: no-referrer',
                '  X-Frame-Options: DENY',
                '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()',
                '  Cache-Control: no-store',
                ...hashed.flatMap(path => [
                    '', `/${path}`,
                    '  ! Cache-Control',
                    '  Cache-Control: public, max-age=31536000, immutable'
                ]), ''
            ].join('\n')
            this.emitFile({ type: 'asset', fileName: '_headers', source: headers })
            // Reuse Vite's processed foundation CSS/fonts at a root-absolute URL:
            // relative URLs would break recovery for a missing nested asset.
            const foundation = Object.values(bundle).find(asset => asset.type === 'asset' &&
                asset.fileName.endsWith('.css') && String(asset.source).includes('--danger-bg'))
            if (!foundation) throw new Error('Shared recovery foundations were not emitted')
            this.emitFile({ type: 'asset', fileName: '404.html', source: `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'; base-uri 'none'"><title>Not found — Dodgy Dave's Stock Predictions</title><link rel="stylesheet" href="/${foundation.fileName}"></head>
<body class="recovery-page"><main class="recovery-panel"><p class="recovery-identity">Dodgy Dave's Stock Predictions</p><h1>Not found</h1><p>This file is unavailable.</p><a href="/">Back to Home</a></main></body>
</html>
` })

        }
    }
}
