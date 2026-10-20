import { printableChartImage, destroyCharts, refreshChartTheme, allStockData, allTickerNames } from './charts'
import { createTextTemplate } from './utils/ticker-dom.ts'
import { mountReportApp } from './report-app'
import { renderReportHtml } from './utils/report-html'
import { printMetrics } from './utils/print-metrics'
import { openPrintPreview } from './utils/report-popup'
import { Lifecycle } from './utils/lifecycle'
const timers = new Lifecycle()
let printOpener: HTMLElement | null = null
const reportApp = mountReportApp(openPrintDialog)

function requiredElement(id: string): HTMLElement {
    const element = document.getElementById(id)
    if (!element) throw new Error(`Missing print control: ${id}`)
    return element
}
        // Custom Print Dialog Functions
        function openPrintDialog() {
            const safe = createTextTemplate();
            const dialog = requiredElement('printDialog');
            const stockCheckboxes = requiredElement('stockCheckboxes');

            // Populate stock checkboxes
            const tickerNames = allTickerNames.length > 0 ? allTickerNames :
                reportApp.tickers.split(', ');

            stockCheckboxes.innerHTML = '';
            tickerNames.forEach((ticker, index) => {
                const checkboxDiv = document.createElement('div');
                checkboxDiv.className = 'stock-checkbox';
                safe.render(checkboxDiv, `
                    <input type="checkbox" id="stock-${index}" value="${safe.text(ticker)}" checked>
                    <label for="stock-${index}">${safe.text(ticker)}</label>
                `);

                // Add click handler to the entire div for better UX
                checkboxDiv.addEventListener('click', function (e) {
                    if (e.target instanceof Element && e.target.tagName !== 'INPUT') {
                        const checkbox = this.querySelector<HTMLInputElement>('input[type="checkbox"]');
                        if (checkbox) checkbox.checked = !checkbox.checked;
                    }
                });

                stockCheckboxes.appendChild(checkboxDiv);
            });

            printOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null
            dialog.style.display = 'block';
            requiredElement('closePrintDialogButton').focus()
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }

        function closePrintDialog() {
            const dialog = requiredElement('printDialog');
            dialog.style.display = 'none';
            document.body.style.overflow = 'auto';
            printOpener?.focus()
            printOpener=null
        }

        function togglePrintOption(optionId: string) {
            const card = requiredElement(optionId + 'Card');
            card.classList.toggle('active');
            card.setAttribute('aria-pressed', String(card.classList.contains('active')))
        }

        function generateCustomPrint() {
            const selectedStocks: string[] = [];
            const stockCheckboxes = document.querySelectorAll<HTMLInputElement>('#stockCheckboxes input[type="checkbox"]:checked');
            stockCheckboxes.forEach(checkbox => {
                selectedStocks.push(checkbox.value);
            });

            if (selectedStocks.length === 0) {
                alert('Please select at least one stock to include in the report.');
                return;
            }

            const includeAnalysis = requiredElement('includeAnalysisCard').classList.contains('active');
            const includeMetadata = requiredElement('includeMetadataCard').classList.contains('active');
            const includeChartData = includeMetadata; // Always include chart data when metadata is included

            generatePrintContent(selectedStocks, includeAnalysis, includeMetadata, includeChartData);
            closePrintDialog();

            // Wait a moment for content generation, then print
            timers.timeout(() => {
                window.print();

                // Hide print content after printing
                timers.timeout(() => {
                    requiredElement('printContent').style.display = 'none';
                }, 1000);
            }, 500);
        }

        function generatePrintContent(selectedStocks: string[], includeAnalysis: boolean, includeMetadata: boolean, includeChartData: boolean): void {
            const safe = createTextTemplate();
            const printContent = requiredElement('printContent');
            const vueApp = reportApp;
            const analysis = vueApp.isCarouselMode ? vueApp.currentPersonalityReport : vueApp.reportData

            let html = '';

            // Generate each stock chart as a separate page
            selectedStocks.forEach((ticker, index) => {
                const stockData = allStockData[allTickerNames.indexOf(ticker)];
                const chartCanvas = document.querySelector(`canvas[id*="${ticker.replace(/[^a-zA-Z0-9]/g, '')}"]`);

                // Each chart gets its own page with header
                html += `
                    <div class="print-chart-page">
                        <div class="print-page-header">
                            <h1 class="print-title">Stock Analysis Report</h1>
                            <p class="print-subtitle">Generated by Dodgy Dave's Stock Predictions</p>
                            ${includeMetadata ? `
                                <p class="print-subtitle">
                                    Analysis Period: <span class="print-day-highlight">${safe.text(String(vueApp.dayRange || 3))} DAYS</span> |
                                    Generated: ${new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}
                                </p>
                            ` : ''}
                        </div>

                        <div class="print-chart-container">
                            <div class="print-chart-ticker-overlay">${safe.text(ticker)}</div>
                            <h3 class="print-chart-title">${safe.text(ticker)} - Stock Performance Analysis</h3>
                `;

                const chartImage = printableChartImage(chartCanvas)
                if (chartImage) {
                    html += `<img src="${chartImage}" alt="${safe.text(ticker)} Chart" class="print-chart-canvas">`
                } else {
                    html += '<p class="chart-error">Chart rendering is unavailable for this print. Report text and source metrics remain available.</p>'
                }

                if (includeChartData && stockData) {
                    try {
                        const metrics = printMetrics(stockData)
                        if (metrics) {
                            html += `
                                <div class="print-chart-metrics">
                                    <strong>Key Metrics for ${safe.text(ticker)}:</strong><br>
                                    Latest Close: $${safe.text(metrics.latestClose)} |
                                    Period Change: ${metrics.direction} ${metrics.percentChange}% |
                                    High: $${safe.text(metrics.high)} |
                                    Low: $${safe.text(metrics.low)}
                                </div>
                            `
                        }
                    } catch (error) {
                        console.warn('Could not parse stock data for metrics:', error);
                    }
                }

                html += `
                        </div>

                        <div class="print-page-footer">
                            <p>© Dodgy Dave's Stock Predictions | This is not real financial advice! Always correct 15% of the time!</p>
                        </div>
                    </div>
                `;
            });

            // Add AI analysis as a separate page if requested
            if (includeAnalysis && analysis) {
                html += `
                    <div class="print-analysis-page">
                        <div class="print-page-header">
                            <h1 class="print-title">AI Analysis & Market Insights</h1>
                            <p class="print-subtitle">Generated by Dodgy Dave's Stock Predictions</p>
                            ${includeMetadata ? `
                                <p class="print-subtitle">
                                    Analysis Period: <span class="print-day-highlight">${safe.text(String(vueApp.dayRange || 3))} DAYS</span> |
                                    Generated: ${new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}
                                </p>
                            ` : ''}
                        </div>

                        <div class="print-analysis-content">

                        </div>

                        <div class="print-page-footer">
                            <p>© Dodgy Dave's Stock Predictions | This is not real financial advice! Always correct 15% of the time!</p>
                        </div>
                    </div>
                `;
            }

            safe.render(printContent, html);
            const analysisElement = printContent.querySelector('.print-analysis-content')
            if (analysisElement) renderReportHtml(analysisElement, analysis, 1200)
            printContent.style.display = 'block';
        }

        function previewPrint() {
            const selectedStocks: string[] = [];
            const stockCheckboxes = document.querySelectorAll<HTMLInputElement>('#stockCheckboxes input[type="checkbox"]:checked');
            stockCheckboxes.forEach(checkbox => {
                selectedStocks.push(checkbox.value);
            });

            if (selectedStocks.length === 0) {
                alert('Please select at least one stock to preview.');
                return;
            }

            const includeAnalysis = requiredElement('includeAnalysisCard').classList.contains('active');
            const includeMetadata = requiredElement('includeMetadataCard').classList.contains('active');
            const includeChartData = includeMetadata; // Always include chart data when metadata is included

            generatePrintContent(selectedStocks, includeAnalysis, includeMetadata, includeChartData);

            const printContent = requiredElement('printContent')
            openPrintPreview(printContent, document)

            // Hide print content after preview
            timers.timeout(() => {
                requiredElement('printContent').style.display = 'none';
            }, 500);
        }

        // Close dialog when clicking outside
        document.addEventListener('click', function (event) {
            const dialog = requiredElement('printDialog');
            const dialogContent = document.querySelector('.print-dialog');

            if (event.target === dialog && dialogContent && event.target instanceof Node && !dialogContent.contains(event.target)) {
                closePrintDialog();
            }
        });

        // Close dialog with Escape key
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closePrintDialog();
            }
        });

        // Handle print events for cleanup
        window.addEventListener('beforeprint', function () {
            console.log('🖨️ Preparing print content...');
        });

        window.addEventListener('afterprint', function () {
            console.log('🖨️ Print dialog closed');
            // Ensure print content is hidden after printing
            timers.timeout(() => {
                const printContent = requiredElement('printContent');
                if (printContent) {
                    printContent.style.display = 'none';
                }
            }, 500);
        });

        // Preserve the existing public print controls for integrations and regression checks.
        Object.assign(window, { closePrintDialog, generateCustomPrint, previewPrint, togglePrintOption });

window.addEventListener('pagehide', () => {timers.dispose(); destroyCharts(); closePrintDialog(); requiredElement('printContent').style.display='none'})

window.addEventListener('pageshow', event => {
    if (event.persisted) {timers.renew(); reportApp.loadReportData()}
})

matchMedia('(prefers-color-scheme:dark)').addEventListener('change', refreshChartTheme)
void document.fonts.ready.then(refreshChartTheme)
for(const [id, handler] of [
    ['closePrintDialogButton', closePrintDialog],
    ['generateCustomPrintButton', generateCustomPrint],
    ['previewPrintButton', previewPrint]
] as const) requiredElement(id).addEventListener('click', handler)
for(const card of document.querySelectorAll<HTMLElement>('[data-print-option]')) {
    card.setAttribute('aria-pressed', String(card.classList.contains('active')))
    const toggle = () => {if(card.dataset.printOption) togglePrintOption(card.dataset.printOption)}
    card.addEventListener('click', toggle)
    card.addEventListener('keydown', event => {if(event.key==='Enter' || event.key===' ') {event.preventDefault(); toggle()}})
}

requiredElement('printDialog').addEventListener('keydown', event => {
    if(event.key !== 'Tab') return
    const controls = [...requiredElement('printDialog').querySelectorAll<HTMLElement>('button, input, [tabindex="0"]')]
    const first=controls[0], last=controls.at(-1)
    if(event.shiftKey && document.activeElement===first) {event.preventDefault(); last?.focus()}
    else if(!event.shiftKey && document.activeElement===last) {event.preventDefault(); first?.focus()}
})
