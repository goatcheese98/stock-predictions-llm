import { sanitizeReportHtml, type SanitizedReportHtml } from './utils/report-html'
import { createApp } from './runtime/vue-runtime'
import { createStockCharts } from './charts'
import { readReportState } from './utils/report-state'
import type { ReportState } from './utils/report-state'
interface ReportData extends ReportState {
    hasError: boolean
    errorMessage: string
    personalityNames: Record<string, string>
}
export interface ReportViewModel {
    readonly tickers: string
    readonly reportData: string
    readonly dayRange: number
    readonly isCarouselMode: boolean
    readonly currentPersonalityReport: string
    loadReportData(): void
}
// Vue's generic App.mount return loses the Options API component shape. Check
// the public read/control boundary used by printing instead of casting to any.
function isReportViewModel(value: unknown): value is ReportViewModel {
    return typeof value === 'object' && value !== null &&
        'tickers' in value && typeof value.tickers === 'string' &&
        'reportData' in value && typeof value.reportData === 'string' &&
        'dayRange' in value && typeof value.dayRange === 'number' &&
        'isCarouselMode' in value && typeof value.isCarouselMode === 'boolean' &&
        'currentPersonalityReport' in value && typeof value.currentPersonalityReport === 'string' &&
        'loadReportData' in value && typeof value.loadReportData === 'function'
}
const images: Record<string, string> = {
    'dodgy-dave': 'images/Dody_Dave.png',
    'stephen-colbert': 'images/Stephen_Colbert.png',
    'scott-galloway': 'images/Scott_Galloway.png',
    'bernie-sanders': 'images/Bernie_Sanders.png'
}
function personalityImageUrl(id: string): string {
    return new URL((Object.hasOwn(images, id) ? images[id] : images['dodgy-dave']) ?? '', window.location.href).href
}
export function mountReportApp(openPrintDialog: () => void): ReportViewModel {
    const instance = createApp({
            data(): ReportData {
                return {
                    isLoading: true,
                    hasError: false,
                    errorMessage: '',
                    tickers: '',
                    reportData: '',
                    reports: {}, // For multiple personalities
                    personalityIds: [], // Array of personality IDs
                    currentPersonalityIndex: 0, // Current slide in carousel
                    rawStockData: [],
                    dayRange: 3,
                    hasChartData: false,
                    personality: 'dodgy-dave',
                    personalityNames: {
                        'dodgy-dave': 'Dodgy Dave - The Trading Guru',
                        'stephen-colbert': 'Stephen Colbert - The Satirical Analyst',
                        'scott-galloway': 'Scott Galloway - The Business Professor',
                        'bernie-sanders': 'Bernie Sanders - The Economic Populist'
                    }
                }
            },
            computed: {
                formattedReport(): SanitizedReportHtml { return sanitizeReportHtml(this.reportData) },
                formattedPersonalityReport(): SanitizedReportHtml { return sanitizeReportHtml(this.currentPersonalityReport) },
                isCarouselMode(): boolean {
                    return this.personalityIds && this.personalityIds.length > 1;
                },
                currentPersonalityId(): string {
                    return this.personalityIds[this.currentPersonalityIndex] ?? 'dodgy-dave';
                },
                currentPersonalityReport(): string {
                    return this.reports[this.currentPersonalityId] || '';
                },
                currentPersonalityName(): string {
                    return Object.hasOwn(this.personalityNames, this.currentPersonalityId) ? this.personalityNames[this.currentPersonalityId] ?? this.currentPersonalityId : this.currentPersonalityId;
                },
                currentPersonalityImage(): string {
                    return personalityImageUrl(this.currentPersonalityId)
                },
                personalityImage(): string {
                    return personalityImageUrl(this.personality)

                }
            },
            mounted() {
                this.loadReportData();
            },
            methods: {
                loadReportData() {
                    const state = readReportState(window.location.search)
                    if (!state) {
                        this.hasError = true
                        this.errorMessage = 'No report data found. Please generate a report first.'
                        this.isLoading = false
                        return
                    }
                    this.hasError = false
                    this.errorMessage = ''
                    Object.assign(this, state)
                    if (state.hasChartData) {
                        this.$nextTick(() => {
                            void createStockCharts(state.rawStockData, state.tickers.split(', '), state.dayRange)
                        })
                    }
                },

                nextPersonality() {
                    if (this.currentPersonalityIndex < this.personalityIds.length - 1) {
                        this.animateSlide('next');
                        this.currentPersonalityIndex++;
                        this.personality = this.currentPersonalityId;
                    }
                },
                previousPersonality() {
                    if (this.currentPersonalityIndex > 0) {
                        this.animateSlide('prev');
                        this.currentPersonalityIndex--;
                        this.personality = this.currentPersonalityId;
                    }
                },
                goToPersonality(index: number) {
                    if (index >= 0 && index < this.personalityIds.length) {
                        if (index > this.currentPersonalityIndex) {
                            this.animateSlide('next');
                        } else if (index < this.currentPersonalityIndex) {
                            this.animateSlide('prev');
                        }
                        this.currentPersonalityIndex = index;
                        this.personality = this.currentPersonalityId;
                    }
                },
                animateSlide(direction: 'next' | 'prev') {
                    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
                    const slide = document.querySelector('.carousel-slide');
                    if (slide) {
                        // Remove previous animation classes
                        slide.classList.remove('slide-left', 'slide-right');

                        // Add appropriate animation class
                        if (direction === 'next') {
                            slide.classList.add('slide-left');
                        } else if (direction === 'prev') {
                            slide.classList.add('slide-right');
                        }

                        // Remove animation class after animation completes to allow re-animation
                        setTimeout(() => {
                            slide.classList.remove('slide-left', 'slide-right');
                        }, 400);
                    }
                },
                goHome() {
                    window.location.href = 'index.html';
                },
                printReport() {
                    openPrintDialog();
                },
                shareReport() {
                    if (navigator.share) {
                        navigator.share({
                            title: 'Stock Report - Dodgy Dave\'s Predictions',
                            text: 'Check out this stock analysis report!',
                            url: window.location.href
                        }).catch(console.error);
                    } else {
                        // Fallback: copy URL to clipboard
                        navigator.clipboard.writeText(window.location.href).then(() => {
                            alert('Report URL copied to clipboard!');
                        }).catch(() => {
                            alert('URL: ' + window.location.href);
                        });
                    }
                },
                handleImageError(event: Event) {
                    const image = event.target
                    if (!(image instanceof HTMLImageElement)) return
                    image.style.display = 'none'
                    const placeholder = document.createElement('div')
                    placeholder.className = 'personality-placeholder'
                    placeholder.textContent = '📊'
                    image.parentElement?.replaceChildren(placeholder)
                }
            }
        }).mount('#reportApp');
    if (!isReportViewModel(instance)) throw new Error('Report component did not expose its expected data boundary')
    return instance

}
