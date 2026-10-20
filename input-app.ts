import { InputAnimations, confettiState } from './input-animations';
import { loadAnimationRuntime } from './runtime/load-animation';
import { Lifecycle } from './utils/lifecycle';
import type * as VueRuntime from './runtime/vue-runtime';
import type * as AnimationRuntime from './runtime/animation-runtime';
import type { Message } from './utils/report-api';
import { openLegacyReportPopup } from './utils/report-popup';
import { PERSONALITIES } from './personalities';
import { generatePersonalityReports } from './utils/generate-reports';
import { fetchStock, fetchReportContent, storeReport } from './utils/report-api.ts';
import { renderTickers } from './utils/ticker-dom.ts';
import { dates, getDatesForRange } from './utils/dates.ts';
interface InputData {
    currentView: string;
    tickerInput: string;
    tickersArr: string[];
    loadingMessage: string;
    loadingStep: string;
    selectedPersonalities: string[];
    dayRange: number;
    rawStockData: string[] | undefined;
    confettiSystem: ReturnType<typeof confettiState>;
    reportContent: string;
    personalities: typeof PERSONALITIES;
}
// Runtimes are explicit dependencies; a failed Vue chunk keeps the native fallback.
export function initializeApp(vue: typeof VueRuntime | null, runtime: typeof AnimationRuntime | null): void {
    const lifecycle = new Lifecycle();
    const requests = new Lifecycle();
    if (!vue) {
        initializeFallback(lifecycle, requests);
        return;
    }
    const { createApp, defineComponent } = vue;
    const state = confettiState();
    let animations = runtime ? new InputAnimations(runtime, state) : null;
    const app = createApp(defineComponent({
        data(): InputData {
            return {
                currentView: 'input',
                tickerInput: '',
                tickersArr: [] as string[],
                loadingMessage: '',
                loadingStep: 'fetching', // 'fetching', 'analyzing', 'generating'
                selectedPersonalities: ['dodgy-dave'], // Array for multi-select
                dayRange: 3, // configurable day range (3-30 days)
                rawStockData: undefined as string[] | undefined, // Store raw API data for charts
                confettiSystem: state,
                reportContent: '',
                personalities: PERSONALITIES
            };
        },
        methods: {
            handleSubmit() {
                if (this.tickerInput.length > 2) {
                    const newTickerStr = this.tickerInput;
                    this.tickersArr.push(newTickerStr.toUpperCase());
                    this.tickerInput = '';
                    this.resetErrorLabel();
                }
                else {
                    this.showError();
                }
            },
            showError() {
                const label = document.getElementsByTagName('label')[0];
                if (!label)
                    return;
                label.classList.add('input-error');
                label.setAttribute('role', 'alert');
                label.textContent = 'You must add at least one ticker. A ticker is a 3 letter or more code for a stock. E.g TSLA for Tesla.';
            },
            resetErrorLabel() {
                const label = document.getElementsByTagName('label')[0];
                if (!label)
                    return;
                label.classList.remove('input-error');
                label.removeAttribute('role');
                label.textContent = 'Add up to 3 stock tickers below to get a super accurate stock predictions report👇';
            },
            togglePersonality(personalityId: string) {
                const index = this.selectedPersonalities.indexOf(personalityId);
                if (index > -1) {
                    // Remove if already selected (but keep at least one)
                    if (this.selectedPersonalities.length > 1) {
                        this.selectedPersonalities.splice(index, 1);
                    }
                }
                else {
                    // Add if not selected
                    this.selectedPersonalities.push(personalityId);
                }
            },
            isPersonalitySelected(personalityId: string) {
                return this.selectedPersonalities.includes(personalityId);
            },
            async fetchStockData() {
                const version = requests.version;
                // Trigger simple confetti animation for Vue.js area
                this.currentView = 'loading';
                this.loadingStep = 'fetching';
                this.loadingMessage = 'Connecting to stock data API...';
                try {
                    // Get dynamic date range based on user selection
                    const dateRange = getDatesForRange(this.dayRange);
                    const stockData = await Promise.all(this.tickersArr.map(async (ticker: string, index: number) => {
                        this.loadingMessage = `Fetching ${ticker} data (${index + 1} of ${this.tickersArr.length})`;
                        return fetchStock(ticker, dateRange, requests.fetch);
                    }));
                    // Store raw stock data for chart processing
                    if (requests.disposed || requests.version !== version)
                        return;
                    this.rawStockData = stockData;
                    this.loadingStep = 'analyzing';
                    this.loadingMessage = 'Processing stock data with AI...';
                    // Add a small delay to show the step transition
                    await requests.pause(800);
                    await this.fetchReport(stockData.join(''));
                }
                catch (err) {
                    if (requests.disposed || requests.version !== version)
                        return;
                    console.error('Error fetching stock data:', err);
                    this.loadingMessage = 'Error fetching stock data. Please try again.';
                    // Show error for 3 seconds then go back to input
                    requests.timeout(() => {
                        this.goHome();
                    }, 3000);
                }
            },
            async fetchReport(stockData: string) {
                const version = requests.version;
                this.loadingStep = 'generating';
                this.loadingMessage = 'AI is analyzing your stocks and generating insights...';
                try {
                    const reports = await generatePersonalityReports(stockData, this.selectedPersonalities, this.personalities, (index, total) => {
                        this.loadingMessage = `AI is analyzing your stocks (${index + 1} of ${total})...`;
                    }, requests.fetch, ms => requests.pause(ms));
                    if (requests.disposed || requests.version !== version)
                        return;
                    this.loadingMessage = 'Finalizing your report...';
                    // Brief delay before redirect
                    await requests.pause(1000);
                    this.renderReport(reports);
                }
                catch (err) {
                    if (requests.disposed || requests.version !== version)
                        return;
                    console.error('Error generating report:', err);
                    this.loadingMessage = 'Error generating AI report. Please try again.';
                    // Show error for 3 seconds then go back to input
                    requests.timeout(() => {
                        this.goHome();
                    }, 3000);
                }
            },
            renderReport(reports: Record<string, string>) {
                if (requests.disposed)
                    return;
                // Store report data in sessionStorage to avoid URL length issues
                const reportData = {
                    tickers: this.tickersArr.join(', '),
                    reports: reports, // Object with personality IDs as keys
                    personalityIds: this.selectedPersonalities, // Array of selected personality IDs
                    timestamp: Date.now(),
                    dayRange: this.dayRange, // Include day range for chart context
                    rawStockData: this.rawStockData // Store raw data for charts
                };
                try {
                    storeReport(reportData);
                    // 🎉 Trigger confetti celebration for successful report generation!
                    if (this.confettiSystem.animationIsOk && this.confettiSystem.explosionKeys.length > 0) {
                        // Create a spectacular confetti celebration before navigating
                        const centerX = window.innerWidth / 2;
                        const centerY = window.innerHeight / 2;
                        // Main central explosion
                        this.createExplosion(centerX, centerY, 600);
                        // Additional explosions for extra celebration
                        requests.timeout(() => {
                            this.createExplosion(centerX - 200, centerY - 100, 400);
                            this.createExplosion(centerX + 200, centerY - 100, 400);
                        }, 150);
                        requests.timeout(() => {
                            this.createExplosion(centerX - 300, centerY + 50, 300);
                            this.createExplosion(centerX + 300, centerY + 50, 300);
                        }, 300);
                    }
                    // Redirect to report page with just a simple identifier (slight delay to show confetti)
                    const reportUrl = `report.html?id=${Date.now()}`;
                    requests.timeout(() => {
                        window.location.href = reportUrl;
                    }, 800); // Allow time for confetti to start
                }
                catch (error) {
                    console.error('Error storing report data:', error);
                    // Fallback to URL method for smaller reports
                    const tickers = this.tickersArr.join(', ');
                    const encodedReport = encodeURIComponent(reports[this.selectedPersonalities[0] ?? ''] || '');
                    const reportUrl = `report.html?tickers=${encodeURIComponent(tickers)}&report=${encodedReport}`;
                    // Add confetti for fallback method too
                    if (this.confettiSystem.animationIsOk && this.confettiSystem.explosionKeys.length > 0) {
                        const centerX = window.innerWidth / 2;
                        const centerY = window.innerHeight / 2;
                        this.createExplosion(centerX, centerY, 500);
                    }
                    requests.timeout(() => {
                        window.location.href = reportUrl;
                    }, 800); // Allow time for confetti to start
                }
            },
            goHome() {
                this.currentView = 'input';
                this.reportContent = '';
                this.resetErrorLabel();
            },
            generateNewReport() {
                this.tickersArr = [];
                this.tickerInput = '';
                this.goHome();
            },
            openReportInNewTab() {
                openLegacyReportPopup(this.tickersArr, this.reportContent);
            },
            openReportPage() {
                const reportData = {
                    tickers: this.tickersArr.join(', '),
                    content: this.reportContent,
                    timestamp: Date.now()
                };
                try {
                    storeReport(reportData);
                    const reportUrl = `report.html?id=${Date.now()}`;
                    const newWindow = window.open(reportUrl, '_blank');
                    if (!newWindow) {
                        console.error('Popup blocked, trying same window...');
                        window.location.href = reportUrl;
                    }
                    else {
                        // 🎉 Trigger confetti celebration for successful report generation!
                        if (this.confettiSystem.animationIsOk && this.confettiSystem.explosionKeys.length > 0) {
                            // Create multiple confetti explosions across the screen for a big celebration
                            const centerX = window.innerWidth / 2;
                            const centerY = window.innerHeight / 2;
                            // Main central explosion
                            this.createExplosion(centerX, centerY, 600);
                            // Additional explosions for extra celebration
                            requests.timeout(() => {
                                this.createExplosion(centerX - 200, centerY - 100, 400);
                                this.createExplosion(centerX + 200, centerY - 100, 400);
                            }, 150);
                            requests.timeout(() => {
                                this.createExplosion(centerX - 300, centerY + 50, 300);
                                this.createExplosion(centerX + 300, centerY + 50, 300);
                            }, 300);
                        }
                    }
                }
                catch (error) {
                    console.error('Error opening report page:', error);
                    // Fallback to URL method
                    const tickers = this.tickersArr.join(', ');
                    const encodedReport = encodeURIComponent(this.reportContent);
                    const reportUrl = `report.html?tickers=${encodeURIComponent(tickers)}&report=${encodedReport}`;
                    window.location.href = reportUrl;
                }
            },
            createExplosion(x: number, y: number, distance = 100) { return animations?.createExplosion(x, y, distance); },
            animateDayRangeNumber(newValue: number, oldValue: number) { animations?.animateDayRangeNumber(newValue, oldValue); }
        },
        watch: {
            dayRange(newValue: number, oldValue: number) {
                if (oldValue !== undefined && newValue !== oldValue) {
                    this.animateDayRangeNumber(newValue, oldValue);
                }
            }
        },
        beforeUnmount() { animations?.stop(); requests.dispose(); lifecycle.dispose(); },
        mounted() {
            // Initialize integrated confetti system
            this.$nextTick(() => {
                animations?.start();
                // Initialize day range number attributes
                const numberElement = document.querySelector('.day-range-number');
                if (numberElement) {
                    numberElement.setAttribute('data-prev', String(Math.max(3, this.dayRange - 1)));
                    numberElement.setAttribute('data-next', String(Math.min(30, this.dayRange + 1)));
                }
            });
        }
    })).mount('#app');
    // Make Vue app globally accessible for testing
    Object.assign(window, { vueApp: app });
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let active = true;
    lifecycle.media(motion, () => {
        if(motion.matches) {animations?.stop(); return}
        if(animations) {if(active) animations.start(); return}
        void loadAnimationRuntime().then(engine => {
            if(!engine || motion.matches || !active || lifecycle.disposed) return
            animations = new InputAnimations(engine, state)
            animations.start()
        })
    });
    lifecycle.window('pagehide', () => { active=false; requests.dispose(); animations?.stop(); });
    lifecycle.window('pageshow', event => { if (event.persisted) {
        active=true;
        requests.renew();
        if ('goHome' in app && typeof app.goHome === 'function')
            app.goHome();
        if (!motion.matches)
            animations?.start();
    } });
}
// Fallback functionality
function initializeFallback(lifecycle: Lifecycle, requests: Lifecycle): void {
    lifecycle.window('pagehide', () => requests.dispose());
    lifecycle.window('pageshow', event => {
        if (!event.persisted) return;
        requests.renew();
        const action = document.querySelector<HTMLElement>('.action-panel');
        const loading = document.querySelector<HTMLElement>('.loading-panel');
        if (action) action.style.display = '';
        if (loading) loading.style.display = 'none';
        updateFallbackUI();
    });
    // Add event listeners for fallback
    const form = document.getElementById('ticker-input-form');
    const generateBtn = document.querySelector<HTMLButtonElement>('.generate-report-btn');
    if (form) {
        lifecycle.element(form, 'submit', (e) => {
            e.preventDefault();
            const input = document.querySelector<HTMLInputElement>('#ticker-input');
            if (input && input.value.length > 2) {
                fallbackData.tickersArr.push(input.value.toUpperCase());
                input.value = '';
                updateFallbackUI();
            }
        });
    }
    if (generateBtn) {
        lifecycle.element(generateBtn, 'click', () => {
            if (fallbackData.tickersArr.length > 0) {
                fallbackFetchStockData(requests);
            }
        });
    }
}
function updateFallbackUI() {
    const tickerDisplay = document.querySelector('.ticker-choice-display');
    const generateBtn = document.querySelector<HTMLButtonElement>('.generate-report-btn');
    if (tickerDisplay) {
        renderTickers(tickerDisplay, fallbackData.tickersArr);
    }
    if (generateBtn) {
        generateBtn.disabled = fallbackData.tickersArr.length === 0;
    }
}
async function fallbackFetchStockData(requests: Lifecycle): Promise<void> {
    const version = requests.version;
    // Show loading panel
    const action = document.querySelector<HTMLElement>('.action-panel');
    const loading = document.querySelector<HTMLElement>('.loading-panel');
    if (action)
        action.style.display = 'none';
    if (loading)
        loading.style.display = 'flex';
    try {
        const stockData = await Promise.all(fallbackData.tickersArr.map(async (ticker) => {
            return fetchStock(ticker, dates, requests.fetch);
        }));
        if (!requests.disposed && requests.version === version)
            await fallbackFetchReport(stockData.join(''), requests);
    }
    catch (err) {
        console.error('Fallback error:', err);
        if (!requests.disposed && requests.version === version)
            setFallbackError('Error fetching data. Please try again.');
    }
}
async function fallbackFetchReport(data: string, requests: Lifecycle): Promise<void> {
    const version = requests.version;
    // Same AI call as Vue version
    const messages: Message[] = [
        {
            role: 'system',
            content: 'You are a trading guru. Given data on share prices over the past 3 days, write a report of no more than 150 words describing the stocks performance and recommending whether to buy, hold or sell.'
        },
        {
            role: 'user',
            content: data
        }
    ];
    try {
        const responseData = { content: await fetchReportContent(messages, requests.fetch) };
        if (requests.disposed || requests.version !== version)
            return;
        const reportData = {
            tickers: fallbackData.tickersArr.join(', '),
            content: responseData.content,
            timestamp: Date.now()
        };
        try {
            storeReport(reportData);
            const reportUrl = `report.html?id=${Date.now()}`;
            window.location.href = reportUrl;
        }
        catch (error) {
            console.error('Fallback sessionStorage error:', error);
            // Fallback to URL method
            const tickers = fallbackData.tickersArr.join(', ');
            const encodedReport = encodeURIComponent(responseData.content);
            const reportUrl = `report.html?tickers=${encodeURIComponent(tickers)}&report=${encodedReport}`;
            window.location.href = reportUrl;
        }
    }
    catch (err) {
        console.error('Fallback AI error:', err);
        if (!requests.disposed && requests.version === version)
            setFallbackError('Error generating report. Please try again.');
    }
}
const fallbackData = { tickersArr: [] as string[] };
function setFallbackError(message: string): void {
    const panel = document.querySelector('.loading-panel');
    if (panel)
        panel.textContent = message;
}
