async function startReport(): Promise<void> {
    try {
        await import('./report-view')
    } catch (error) {
        console.error('Report UI runtime unavailable', error)
        const root = document.getElementById('reportApp')
        if (root) {
            root.removeAttribute('v-cloak')
            const notice = document.createElement('p')
            notice.setAttribute('role', 'alert')
            notice.textContent = 'The report interface could not load. Your saved report has been kept. Please reload to try again.'
            const back = document.createElement('a')
            back.href = 'index.html'
            back.textContent = 'Back to Home'
            root.replaceChildren(notice, back)
        }
    }
}
void startReport()
