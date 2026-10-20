import type { Chart as ChartInstance } from 'chart.js'
import { createTextTemplate } from './utils/ticker-dom'
import { parseStockResponse } from './utils/report-api'
import { loadChartRuntime } from './runtime/load-chart'

type PriceChart = ChartInstance<'line', number[], Date>
interface ChartDay { x: Date; o: number; h: number; l: number; c: number; v: number }
interface ChartConfig { canvasId: string; ticker: string; chartData: ChartDay[]; allChartData: ChartDay[]; showHighLow: boolean; index: number }
let charts: PriceChart[] = []
let renderVersion = 0
export function getCharts(): readonly PriceChart[] { return charts }
export function printableChartImage(canvas: Element | null): string | null {
    if (!(canvas instanceof HTMLCanvasElement)) return null
    const chart = charts.find(chart => chart.canvas === canvas)
    if (!chart) return null
    try {
        chart.stop()
        chart.update('none')
        const target = document.createElement('canvas')
        target.width = 800
        target.height = 670
        const context = target.getContext('2d')
        if (!context) return null
        context.drawImage(canvas, 0, 0, target.width, target.height)
        return target.toDataURL('image/png', 0.9)
    } catch (error) {
        console.warn('Chart image unavailable for printing', error)
        return null
    }
}
export function destroyCharts(): void {
    renderVersion++
    charts.forEach(chart => chart.destroy())
    charts = []
}
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Unknown chart error'

function theme(token: string): string {return getComputedStyle(document.documentElement).getPropertyValue(token).trim()}
export function refreshChartTheme(): void {
    for(const chart of charts) {
        for(const scale of Object.values(chart.options.scales ?? {})) {
            if(!scale) continue
            if(scale.ticks) scale.ticks.color=theme('--fg')
            if(scale.grid) scale.grid.color=theme('--line')
            if(scale.border) scale.border.color=theme('--line')
        }
        const legend=chart.options.plugins?.legend
        if(legend && legend.labels) legend.labels.color=theme('--fg')
        const tooltip=chart.options.plugins?.tooltip
        if(tooltip) {tooltip.backgroundColor=theme('--panel'); tooltip.bodyColor=theme('--fg'); tooltip.titleColor=theme('--acc'); tooltip.borderColor=theme('--acc')}
        chart.update('none')
    }
}
function parseChartPayload(value: unknown): ReturnType<typeof parseStockResponse> {
    if (value && typeof value === 'object' && 'results' in value && Array.isArray(value.results) && value.results.length === 0) {
        return { results: [] }
    }
    return parseStockResponse(value)
}
        // Enhanced Chart creation functionality
        export async function createStockCharts(stockDataArray: string[], tickerNames: string[], dayRange: number): Promise<void> {
            const safe = createTextTemplate();
            // Use the passed dayRange parameter (from Vue app) or fallback to current value
            const selectedDayRange = dayRange || currentDayRange;

            console.log('🎨 Creating enhanced charts for:', tickerNames, 'with', selectedDayRange, 'days');

            const chartsContainer = document.getElementById('chartsContainer');
            if (!chartsContainer) {
                console.error('❌ Charts container not found');
                return;
            }

            // Store data globally for dynamic re-rendering
            allStockData = stockDataArray;
            allTickerNames = tickerNames;

            // Update global current day range with the selected value
            currentDayRange = selectedDayRange;

            // Clear existing charts
            chartsContainer.innerHTML = '';

            // Reset charts array
            destroyCharts();
            const version = renderVersion
            Object.defineProperty(window, 'stockCharts', { configurable: true, get: getCharts })

            // Parse all stock data first and collect valid chart configs
            const validChartConfigs: ChartConfig[] = [];
            let allChartsHtml = '';

            stockDataArray.forEach((stockDataText, index) => {
                try {
                    let stockData: ReturnType<typeof parseStockResponse>;

                    // Try to parse as markdown-wrapped JSON first (from AI reports)
                    const jsonMatch = stockDataText.match(/```json\s*([\s\S]*?)\s*```/);
                    if (jsonMatch) {
                        console.log('📋 Found markdown-wrapped JSON data');
                        stockData = parseChartPayload(JSON.parse(jsonMatch[1] ?? ''));
                    } else {
                        // Try to parse as pure JSON (from API)
                        console.log('📋 Attempting to parse as pure JSON');
                        try {
                            stockData = parseChartPayload(JSON.parse(stockDataText));
                            console.log('✅ Successfully parsed pure JSON data');
                        } catch (parseError) {
                            console.error('❌ Failed to parse JSON for ticker:', (tickerNames[index] ?? ''), parseError);
                            // Add error message to HTML
                            const errorHtml = `
                                <div class="chart-error">
                                    <h3>${safe.text((tickerNames[index] ?? ''))} - Data Parse Error</h3>
                                    <p>Unable to parse chart data for this ticker.</p>
                                    <p><strong>Parse Error:</strong> ${safe.text(errorMessage(parseError))}</p>
                                </div>
                            `;
                            allChartsHtml += errorHtml;
                            return;
                        }
                    }
                    const ticker = (tickerNames[index] ?? '');

                    if (!stockData.results || stockData.results.length === 0) {
                        console.error('❌ No results data for ticker:', ticker);
                        const errorHtml = `
                            <div class="chart-error">
                                <h3>${safe.text(ticker)} - No Data Available</h3>
                                <p>No stock data found for the selected date range.</p>
                            </div>
                        `;
                        allChartsHtml += errorHtml;
                        return;
                    }

                    // Prepare data for Chart.js with better date handling
                    const allChartData = stockData.results.map(day => ({
                        x: new Date(day.t),
                        o: day.o, // open
                        h: day.h, // high
                        l: day.l, // low
                        c: day.c, // close
                        v: day.v || 0 // volume
                    })).sort((a, b) => a.x.getTime() - b.x.getTime()); // Sort by date

                    // Filter data to show only the requested number of trading days
                    // We want the most recent N trading days based on selectedDayRange
                    const chartData = allChartData.slice(-selectedDayRange);

                    // Create individual chart container with cartoonish styling
                    const canvasId = `chart-${ticker.replace(/[^a-zA-Z0-9]/g, '')}-${index}`;
                    const totalDataPoints = allChartData.length;
                    const displayedDataPoints = chartData.length;
                    const chartHtml = `
                        <div class="individual-chart-container" data-ticker="${safe.text(ticker)}" data-index="${index}">
                            <div class="chart-header">
                                <h3 class="chart-ticker-title">
                                    <svg class="fund-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91 2.84.69 4.18 1.9 4.18 3.91-.01 1.83-1.38 2.83-3.12 3.16z" fill="currentColor"/>
                                    </svg>
                                    ${safe.text(ticker)} Stock Performance
                                </h3>
                                <div class="chart-info">
                                    ${displayedDataPoints < 3 ? '<span class="data-note">Limited data due to weekends/holidays</span>' : ''}
                                    ${displayedDataPoints > 30 ? '<span class="data-note">High/Low lines hidden for clarity (30+ days)</span>' : ''}
                                </div>
                            </div>
                            <div class="individual-chart-controls">
                                <button class="individual-day-btn" id="removeDay-${index}" aria-label="Remove trading day">−</button>
                                <span class="individual-day-counter">
                                    <span id="currentDayCount-${index}">${selectedDayRange}</span> days
                                </span>
                                <button class="individual-day-btn" id="addDay-${index}" aria-label="Add trading day">+</button>
                            </div>
                            <div class="chart-canvas-wrapper">
                                <canvas id="${canvasId}" class="chart-canvas"></canvas>
                            </div>
                        </div>
                    `;

                    // Add to HTML collection
                    allChartsHtml += chartHtml;

                    // Initialize individual day range for this chart
                    individualDayRanges[index] = selectedDayRange;

                    // Store valid chart configuration for later creation
                    validChartConfigs.push({
                        canvasId: canvasId,
                        ticker: ticker,
                        chartData: chartData,
                        allChartData: allChartData,
                        showHighLow: chartData.length <= 30,
                        index: index
                    });

                } catch (error) {
                    console.error(`❌ Error processing chart for ${(tickerNames[index] ?? '')}:`, error);
                    // Add error message to HTML
                    const errorHtml = `
                        <div class="chart-error">
                            <h3>${safe.text((tickerNames[index] ?? ''))} - Error Loading Chart</h3>
                            <p>Technical error: ${safe.text(errorMessage(error))}</p>
                        </div>
                    `;
                    allChartsHtml += errorHtml;
                }
            });

            // Set all HTML at once to avoid DOM invalidation issues
            safe.render(chartsContainer, allChartsHtml);

            if (validChartConfigs.length === 0) return

            // Create all charts after DOM is stable
            let Chart: Awaited<ReturnType<typeof loadChartRuntime>>
            try {
                Chart = await loadChartRuntime()
            } catch (error) {
                if (version !== renderVersion) return
                const notice = document.createElement('p')
                notice.className = 'chart-error'
                notice.setAttribute('role', 'status')
                notice.textContent = 'Chart rendering is unavailable. Your report and source data are still available.'
                chartsContainer.append(notice)
                chartsContainer.querySelectorAll('button').forEach(button => { button.disabled = true })
                return
            }
            if (version !== renderVersion) return
            requestAnimationFrame(() => {
                if (version !== renderVersion) return
                const failedCharts = new Set<number>()
                validChartConfigs.forEach(config => {
                    try {
                        // Use individual day range for this chart
                        const chartDayRange = individualDayRanges[config.index] || selectedDayRange;
                        const chartData = config.allChartData.slice(-chartDayRange);

                        const canvas = document.getElementById(config.canvasId)
                        if (!(canvas instanceof HTMLCanvasElement)) return
                        const ctx = canvas.getContext('2d')
                        if (!ctx) throw new Error('2D canvas context unavailable')
                        const chart = new Chart<'line', number[], Date>(ctx, {
                            type: 'line',
                            data: {
                                labels: chartData.map(d => d.x),
                                datasets: [{
                                    label: `💰 ${config.ticker} Close Price`,
                                    data: chartData.map(d => d.c),
                                    borderColor: '#000',
                                    backgroundColor: 'rgba(70, 255, 144, 0.3)',
                                    borderWidth: 4,
                                    fill: true,
                                    tension: 0.2,
                                    pointBackgroundColor: '#46ff90',
                                    pointBorderColor: '#000',
                                    pointBorderWidth: 3,
                                    pointRadius: 8,
                                    pointHoverRadius: 12,
                                    pointHoverBorderWidth: 4,
                                    pointHoverBackgroundColor: '#46ff90',
                                    pointHoverBorderColor: '#000'
                                }, ...(chartData.length <= 30 ? [{
                                    label: `${config.ticker} High`,
                                    data: chartData.map(d => d.h),
                                    borderColor: '#ff4757',
                                    backgroundColor: 'rgba(255, 71, 87, 0.1)',
                                    borderWidth: 3,
                                    fill: false,
                                    tension: 0.2,
                                    pointBackgroundColor: '#ff4757',
                                    pointBorderColor: '#000',
                                    pointBorderWidth: 2,
                                    pointRadius: 6,
                                    pointHoverRadius: 10,
                                    borderDash: [8, 4]
                                }, {
                                    label: `${config.ticker} Low`,
                                    data: chartData.map(d => d.l),
                                    borderColor: '#3742fa',
                                    backgroundColor: 'rgba(55, 66, 250, 0.1)',
                                    borderWidth: 3,
                                    fill: false,
                                    tension: 0.2,
                                    pointBackgroundColor: '#3742fa',
                                    pointBorderColor: '#000',
                                    pointBorderWidth: 2,
                                    pointRadius: 6,
                                    pointHoverRadius: 10,
                                    borderDash: [12, 6]
                                }] : [])]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                layout: {
                                    padding: () => matchMedia('(max-width:600px)').matches ?
                                        {top:10,right:5,bottom:20,left:0} : {top:10,right:30,bottom:60,left:25}
                                },
                                scales: {
                                    x: {
                                        type: 'time',
                                        time: {
                                            unit: 'day',
                                            displayFormats: {
                                                day: 'MMM dd',
                                                hour: 'HH:mm'
                                            },
                                            tooltipFormat: 'MMM dd, yyyy'
                                        },
                                        grid: {
                                            color: theme('--line'),
                                            lineWidth: 2,
                                        },
                                        ticks: {
                                            color: theme('--fg'),
                                            font: {
                                                family: 'Geist Mono Variable',
                                                size: 13,
                                                weight: 'bold'
                                            },
                                            padding: 10,
                                            maxTicksLimit: 8,
                                            callback: function (value, index, values) {
                                                const date = new Date(value);
                                                return date.toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric'
                                                });
                                            }
                                        },
                                        title: {
                                            display: false
                                        },
                                        border: {
                                            color: theme('--fg'),
                                            width: 3
                                        }
                                    },
                                    y: {
                                        grid: {
                                            color: theme('--line'),
                                            lineWidth: 2,
                                        },
                                        ticks: {
                                            color: theme('--fg'),
                                            font: {
                                                family: 'Geist Mono Variable',
                                                size: 13,
                                                weight: 'bold'
                                            },
                                            padding: 10,
                                            callback: function (value) {
                                                return '$' + Number(value).toFixed(2);
                                            }
                                        },
                                        title: {
                                            display: false
                                        },
                                        border: {
                                            color: theme('--fg'),
                                            width: 3
                                        }
                                    }
                                },
                                plugins: {
                                    legend: {
                                        display: true,
                                        position: 'bottom',
                                        align: 'center',
                                        labels: {
                                            color: theme('--fg'),
                                            font: () => ({family:'Geist Mono Variable', size:matchMedia('(max-width:600px)').matches ? 11 : 16, weight:'bold'}),
                                            padding: 20,
                                            usePointStyle: true,
                                            pointStyle: 'circle',
                                            boxWidth: 20,
                                            boxHeight: 20
                                        }
                                    },
                                    tooltip: {
                                        backgroundColor: theme('--panel'),
                                        titleColor: theme('--acc'),
                                        bodyColor: theme('--fg'),
                                        borderColor: theme('--acc'),
                                        borderWidth: 3,
                                        cornerRadius: 12,
                                        titleFont: {
                                            family: 'Geist Mono Variable',
                                            size: 16,
                                            weight: 'bold'
                                        },
                                        bodyFont: {
                                            family: 'Geist Mono Variable',
                                            size: 14
                                        },
                                        padding: 15,
                                        displayColors: true,
                                        callbacks: {
                                            title: function (context) {
                                                const date = new Date((context[0]?.parsed.x ?? 0));
                                                return '📅 ' + date.toLocaleDateString('en-US', {
                                                    weekday: 'short',
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                });
                                            },
                                            label: function (context) {
                                                return context.dataset.label + ': $' + (context.parsed.y ?? 0).toFixed(2);
                                            },
                                            afterBody: function (context) {
                                                const dataIndex = (context[0]?.dataIndex ?? 0);
                                                const volume = config.allChartData.slice(-(individualDayRanges[config.index] ?? selectedDayRange))[dataIndex]?.v || 0;
                                                return volume > 0 ? ['', '📦 Volume: ' + volume.toLocaleString()] : [];
                                            }
                                        }
                                    }
                                },
                                interaction: {
                                    intersect: false,
                                    mode: 'index'
                                },
                                animation: {
                                    duration: 800,
                                    easing: 'easeInOutQuart'
                                }
                            }
                        });

                        // Store chart reference for zoom controls
                        if (!charts) {
                            destroyCharts();
            const version = renderVersion
            Object.defineProperty(window, 'stockCharts', { configurable: true, get: getCharts })
                        }
                        charts.push(chart);

                        console.log(`✅ Enhanced chart created for ${config.ticker}`);
                    } catch (error) {
                        failedCharts.add(config.index)
                        console.error(`Error creating chart for ${config.ticker}:`, error);
                        const notice = document.createElement('p')
                        notice.className = 'chart-error'
                        notice.setAttribute('role', 'status')
                        notice.textContent = 'Chart rendering is unavailable. Your report and source data are still available.'
                        document.getElementById(config.canvasId)?.parentElement?.append(notice)
                    }
                });

                // Add event listeners for individual chart controls
                validChartConfigs.forEach(config => {
                    const index = config.index;
                    const addBtn = document.querySelector<HTMLButtonElement>(`#addDay-${index}`);
                    const removeBtn = document.querySelector<HTMLButtonElement>(`#removeDay-${index}`);
                    const dayCountSpan = document.getElementById(`currentDayCount-${index}`);
                    if (failedCharts.has(index)) {
                        if (addBtn) addBtn.disabled = true
                        if (removeBtn) removeBtn.disabled = true
                        return
                    }

                    if (addBtn) {
                        addBtn.addEventListener('click', function () {
                            if ((individualDayRanges[index] ?? selectedDayRange) < 30) {
                                individualDayRanges[index] = (individualDayRanges[index] ?? selectedDayRange) + 1;
                                updateIndividualChart(index, config);
                                updateIndividualButtons(index);
                            }
                        });
                    }

                    if (removeBtn) {
                        removeBtn.addEventListener('click', function () {
                            if ((individualDayRanges[index] ?? selectedDayRange) > 1) {
                                individualDayRanges[index] = (individualDayRanges[index] ?? selectedDayRange) - 1;
                                updateIndividualChart(index, config);
                                updateIndividualButtons(index);
                            }
                        });
                    }

                    // Initialize button states
                    updateIndividualButtons(index);
                });
            });
        }

        // Helper functions for individual chart controls
        function updateIndividualChart(index: number, config: ChartConfig): void {
            const chartDayRange = individualDayRanges[index] ?? currentDayRange;
            const chartData = config.allChartData.slice(-chartDayRange);

            // Find the chart by canvas ID
            const chart = charts.find(c => c.canvas.id === config.canvasId);
            if (chart) {
                chart.data.labels = chartData.map(d => d.x);
                chart.data.datasets[0]!.data = chartData.map(d => d.c);

                // Update high/low lines if they exist
                if (chart.data.datasets.length > 1) {
                    chart.data.datasets[1]!.data = chartData.map(d => d.h);
                    chart.data.datasets[2]!.data = chartData.map(d => d.l);
                }

                // Hide high/low lines if more than 30 days
                if (chartData.length > 30) {
                    chart.data.datasets.forEach((dataset, i) => {
                        if (i > 0) dataset.hidden = true;
                    });
                } else {
                    chart.data.datasets.forEach((dataset, i) => {
                        if (i > 0) dataset.hidden = false;
                    });
                }

                chart.update('none');
            }

            // Update day counter
            const dayCountSpan = document.getElementById(`currentDayCount-${index}`);
            if (dayCountSpan) {
                dayCountSpan.textContent = String(chartDayRange);
            }
        }

        function updateIndividualButtons(index: number): void {
            const addBtn = document.querySelector<HTMLButtonElement>(`#addDay-${index}`);
            const removeBtn = document.querySelector<HTMLButtonElement>(`#removeDay-${index}`);
            const dayRange = individualDayRanges[index] ?? currentDayRange;

            if (addBtn) {
                addBtn.disabled = dayRange >= 30;
            }
            if (removeBtn) {
                removeBtn.disabled = dayRange <= 1;
            }
        }


        // Global variables for dynamic day management
        let currentDayRange = 3; // Default value, will be updated from Vue
        export let allStockData: string[] = []; // Pre-loaded stock data
        export let allTickerNames: string[] = [];
        const individualDayRanges: Record<number, number> = {}; // Store individual day ranges for each chart
