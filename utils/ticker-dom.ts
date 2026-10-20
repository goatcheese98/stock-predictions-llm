export function renderTickers(container: Element, tickers: string[]): void {
    const nodes = tickers.map(ticker => {
        const span = container.ownerDocument.createElement('span')
        span.className = 'ticker'
        span.textContent = ticker
        return span
    })
    container.replaceChildren(...nodes)
}

// Static legacy markup can keep its layout. Dynamic text is inserted only after
// parsing, through DOM text/attribute setters, never through the HTML parser.
export function createTextTemplate() {
    const values: string[] = []
    const prefix = `__ticker_${crypto.randomUUID()}_`
    function text(value: string): string {
        values.push(value)
        return `${prefix}${values.length - 1}__`
    }
    function render(container: Element, markup: string): void {
        const template = container.ownerDocument.createElement('template')
        template.innerHTML = markup
        const pattern = new RegExp(`${prefix}(\\d+)__`, 'g')
        const replace = (value: string) => value.replace(pattern, (_, index: string) => values[Number(index)] ?? '')
        const walker = container.ownerDocument.createTreeWalker(template.content, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
        let node: Node | null
        while ((node = walker.nextNode())) {
            if (node.nodeType === Node.TEXT_NODE) node.textContent = replace(node.textContent ?? '')
            if (node instanceof Element) {
                for (const attribute of [...node.attributes]) {
                    const value = replace(attribute.value)
                    if (value !== attribute.value) node.setAttribute(attribute.name, value)
                }
            }
        }
        container.replaceChildren(template.content)
    }
    return { text, render }
}
