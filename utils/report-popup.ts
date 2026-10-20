import { renderReportHtml } from './report-html'
import { LEGACY_REPORT_STYLES, PRINT_PREVIEW_STYLES } from './popup-styles'

function popupWindow(name: string, features: string): Window | null {
    const popup = window.open('', name, features)
    if (!popup) {
        alert('Popup blocked! Please allow popups for this site.')
        return null
    }
    popup.opener = null
    return popup
}
function frame(popup: Window, title: string, css: string): Document {
    const doc = popup.document
    const style = doc.createElement('style')
    style.textContent = css
    doc.head.replaceChildren(style)
    doc.title = title
    doc.body.replaceChildren()
    return doc
}
export function openLegacyReportPopup(tickers: readonly string[], report: string): Window | null {
    const popup = popupWindow('_blank', 'width=800,height=600')
    if (!popup) return null
    const doc = frame(popup, "Stock Report - Dodgy Dave's Predictions", LEGACY_REPORT_STYLES)
    const header = doc.createElement('div')
    header.className = 'header'
    const title = doc.createElement('h1')
    title.textContent = "📈 Dodgy Dave's Stock Predictions 📈"
    const symbols = doc.createElement('div')
    symbols.className = 'tickers'
    symbols.textContent = `Analyzed Tickers: ${tickers.join(', ')}`
    header.append(title, symbols)
    const content = doc.createElement('div')
    content.className = 'report-content'
    renderReportHtml(content, report)
    const disclaimer = doc.createElement('div')
    disclaimer.className = 'disclaimer'
    disclaimer.textContent = '© This is not real financial advice! Always correct 15% of the time!'
    doc.body.append(header, content, disclaimer)
    return popup
}
export function openPrintPreview(content: Element, source: Document): Window | null {
    const popup = popupWindow('PrintPreview', 'width=800,height=600,scrollbars=yes')
    if (!popup) return null
    const doc = frame(popup, 'Print Preview - Stock Report', PRINT_PREVIEW_STYLES + (source.querySelector('style')?.textContent ?? ''))
    const container = doc.createElement('div')
    container.className = 'preview-container'
    const header = doc.createElement('div')
    header.className = 'preview-header'
    header.textContent = 'Print Preview'
    container.append(header)
    // Clone the already sanitized/DOM-rendered print tree. Do not serialize it
    // through document.write/innerHTML and give payloads a second parse.
    for (const child of content.childNodes) container.append(doc.importNode(child, true))
    const actions = doc.createElement('div')
    actions.className = 'preview-actions'
    for (const [label, className, action] of [
        ['Print', 'preview-btn-print', () => popup.print()],
        ['Close', 'preview-btn-close', () => popup.close()]
    ] as const) {
        const button = doc.createElement('button')
        button.className = `preview-btn ${className}`
        button.textContent = label
        button.addEventListener('click', action)
        actions.append(button)
    }
    doc.body.append(container, actions)
    return popup
}
