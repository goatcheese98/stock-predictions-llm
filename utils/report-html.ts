import DOMPurify from 'dompurify'

declare const sanitizedReport: unique symbol
export type SanitizedReportHtml = string & { readonly [sanitizedReport]: true }

// Report prose needs rich text, not a second application surface. No images,
// CSS, IDs, forms, embedded documents, SVG/MathML or event/data attributes.
const policy = {
    ALLOWED_TAGS: ['div', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ul', 'ol', 'li',
        'blockquote', 'pre', 'code', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr',
        'table', 'caption', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
        'a', 'span', 'sup', 'sub', 'dl', 'dt', 'dd'],
    ALLOWED_ATTR: ['href', 'title', 'colspan', 'rowspan', 'scope'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    SANITIZE_NAMED_PROPS: true,
    RETURN_TRUSTED_TYPE: false as const
}

export function sanitizeReportHtml(input: string, maxTextLength?: number): SanitizedReportHtml {
    if (typeof input !== 'string') throw new TypeError('Report HTML must be a string')
    const clean = DOMPurify.sanitize(input, policy)
    if (maxTextLength === undefined) return clean as SanitizedReportHtml
    if (!Number.isInteger(maxTextLength) || maxTextLength < 0) throw new RangeError('Invalid report text limit')
    const template = document.createElement('template')
    template.innerHTML = clean
    const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT)
    let remaining = maxTextLength
    let node: Node | null
    while ((node = walker.nextNode())) {
        const length = node.textContent?.length ?? 0
        if (length <= remaining) { remaining -= length; continue }
        const range = document.createRange()
        range.setStart(node, remaining)
        range.setEnd(template.content, template.content.childNodes.length)
        range.deleteContents()
        range.insertNode(document.createTextNode('...'))
        break
    }
    return template.innerHTML as SanitizedReportHtml
}

export function renderReportHtml(container: Element, input: string, maxTextLength?: number): void {
    container.innerHTML = sanitizeReportHtml(input, maxTextLength)
}
