import { dates } from '/utils/dates'

// Fallback functionality for when Vue.js doesn't work
let fallbackData = {
    tickersArr: [],
    currentView: 'input',
    loadingMessage: 'Querying Stocks API...',
    reportContent: ''
}

// Wait for Vue to load before initializing
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Vue === 'undefined') {
        console.error('Vue.js not loaded properly, using fallback')
        initializeFallback()
        return
    }

    const { createApp } = Vue

    createApp({
        data() {
            return {
                currentView: 'input',
                tickerInput: '',
                tickersArr: [],
                loadingMessage: '',
                loadingStep: 'fetching' // 'fetching', 'analyzing', 'generating'
            }
        },
        methods: {
            handleSubmit() {
                console.log('Form submitted with input:', this.tickerInput)
                if (this.tickerInput.length > 2) {
                    const newTickerStr = this.tickerInput
                    this.tickersArr.push(newTickerStr.toUpperCase())
                    this.tickerInput = ''
                    this.resetErrorLabel()
                    console.log('Current tickers:', this.tickersArr)
                } else {
                    this.showError()
                }
            },
            
            showError() {
                const label = document.getElementsByTagName('label')[0]
                label.style.color = 'red'
                label.textContent = 'You must add at least one ticker. A ticker is a 3 letter or more code for a stock. E.g TSLA for Tesla.'
            },
            
            resetErrorLabel() {
                const label = document.getElementsByTagName('label')[0]
                label.style.color = ''
                label.textContent = 'Add up to 3 stock tickers below to get a super accurate stock predictions report👇'
            },
            
            async fetchStockData() {
                console.log('=== FETCH STOCK DATA CALLED ===')
                console.log('Current view before:', this.currentView)
                console.log('Fetching stock data for:', this.tickersArr)
                
                this.currentView = 'loading'
                this.loadingStep = 'fetching'
                this.loadingMessage = 'Connecting to stock data API...'
                
                console.log('Current view after setting to loading:', this.currentView)
                console.log('Loading step:', this.loadingStep)
                console.log('Loading message:', this.loadingMessage)
                
                try {
                    const stockData = await Promise.all(this.tickersArr.map(async (ticker, index) => {
                        const url = `https://polygon-api-worker.jasani-rohan.workers.dev/?ticker=${ticker}&startDate=${dates.startDate}&endDate=${dates.endDate}`;
                        console.log('Fetching from URL:', url)
                        
                        // Update loading message to show progress
                        this.loadingMessage = `Fetching ${ticker} data (${index + 1} of ${this.tickersArr.length})`
                        console.log('Updated loading message:', this.loadingMessage)
                        
                        const response = await fetch(url)

                        if (!response.ok) {
                            const errMsg = await response.text()
                            throw new Error('Worker error: ' + errMsg)
                        }
                        
                        return response.text()
                    }))
                    
                    console.log('Stock data received:', stockData)
                    this.loadingStep = 'analyzing'
                    this.loadingMessage = 'Processing stock data with AI...'
                    
                    console.log('Updated to analyzing step:', this.loadingStep)
                    
                    // Add a small delay to show the step transition
                    await new Promise(resolve => setTimeout(resolve, 800))
                    
                    this.fetchReport(stockData.join(''))
                } catch (err) {
                    console.error('Error fetching stock data:', err)
                    this.loadingMessage = 'Error fetching stock data. Please try again.'
                    // Show error for 3 seconds then go back to input
                    setTimeout(() => {
                        this.goHome()
                    }, 3000)
                }
            },

            async fetchReport(stockData) {
                console.log('Fetching AI report...')
                this.loadingStep = 'generating'
                this.loadingMessage = 'AI is analyzing your stocks and generating insights...'
                
                const messages = [
                    {
                        role: 'system',
                        content: 'You are a trading guru. Given data on share prices over the past 3 days, write a report of no more than 150 words describing the stocks performance and recommending whether to buy, hold or sell. Use the examples provided between ### to set the style your response.'
                    },
                    {
                        role: 'user',
                        content: `${stockData}
                        ###
                        OK baby, hold on tight! You are going to haate this! Over the past three days, Tesla (TSLA) shares have plummetted. The stock opened at $223.98 and closed at $202.11 on the third day, with some jumping around in the meantime. This is a great time to buy, baby! But not a great time to sell! But I'm not done! Apple (AAPL) stocks have gone stratospheric! This is a seriously hot stock right now. They opened at $166.38 and closed at $182.89 on day three. So all in all, I would hold on to Tesla shares tight if you already have them - they might bounce right back up and head to the stars! They are volatile stock, so expect the unexpected. For APPL stock, how much do you need the money? Sell now and take the profits or hang on and wait for more! If it were me, I would hang on because this stock is on fire right now!!! Apple are throwing a Wall Street party and y'all invited!
                        ###
                        Apple (AAPL) is the supernova in the stock sky – it shot up from $150.22 to a jaw-dropping $175.36 by the close of day three. We're talking about a stock that's hotter than a pepper sprout in a chilli cook-off, and it's showing no signs of cooling down! If you're sitting on AAPL stock, you might as well be sitting on the throne of Midas. Hold on to it, ride that rocket, and watch the fireworks, because this baby is just getting warmed up! Then there's Meta (META), the heartthrob with a penchant for drama. It winked at us with an opening of $142.50, but by the end of the thrill ride, it was at $135.90, leaving us a little lovesick. It's the wild horse of the stock corral, bucking and kicking, ready for a comeback. META is not for the weak-kneed So, sugar, what's it going to be? For AAPL, my advice is to stay on that gravy train. As for META, keep your spurs on and be ready for the rally.
                        ###
                        `
                    }
                ]
                
                try {
                    const url = 'https://openai-api-worker.jasani-rohan.workers.dev'
                    
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(messages)
                    })
                    
                    const responseData = await response.json()
                    console.log('AI response received:', responseData)

                    if (!response.ok) {
                        throw new Error(`Worker Error: ${responseData.error}`)
                    }
                    
                    this.loadingMessage = 'Finalizing your report...'
                    
                    // Brief delay before redirect
                    await new Promise(resolve => setTimeout(resolve, 1000))
                    
                    this.renderReport(responseData.content)
                } catch (err) {
                    console.error('Error generating report:', err)
                    this.loadingMessage = 'Error generating AI report. Please try again.'
                    // Show error for 3 seconds then go back to input
                    setTimeout(() => {
                        this.goHome()
                    }, 3000)
                }
            },

            renderReport(output) {
                console.log('Rendering report:', output)
                this.reportContent = output
                
                // Instead of showing the output panel, redirect to report page
                console.log('Redirecting to report page with actual data...')
                const tickers = this.tickersArr.join(', ')
                const encodedReport = encodeURIComponent(output)
                const reportUrl = `report.html?tickers=${encodeURIComponent(tickers)}&report=${encodedReport}`
                
                console.log('Generated report URL:', reportUrl)
                console.log('Redirecting to report page...')
                
                // Redirect to the report page
                window.location.href = reportUrl
            },
            
            goHome() {
                this.currentView = 'input'
                this.reportContent = ''
                this.resetErrorLabel()
            },
            
            generateNewReport() {
                this.tickersArr = []
                this.tickerInput = ''
                this.goHome()
            },
            
            openReportInNewTab() {
                // Create a new window/tab with the report
                const reportWindow = window.open('', '_blank', 'width=800,height=600')
                reportWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Stock Report - Dodgy Dave's Predictions</title>
                        <style>
                            body { 
                                font-family: 'Poppins', sans-serif; 
                                padding: 2em; 
                                background-color: #f6f6f6;
                                line-height: 1.6;
                            }
                            .header { 
                                text-align: center; 
                                margin-bottom: 2em;
                                border-bottom: 2px solid #000;
                                padding-bottom: 1em;
                            }
                            .report-content { 
                                background: white; 
                                padding: 2em; 
                                border: 2px solid #000;
                                border-radius: 8px;
                                font-size: 16px;
                            }
                            .tickers {
                                background: #46ff90;
                                padding: 0.5em 1em;
                                border: 2px solid #000;
                                display: inline-block;
                                margin-bottom: 1em;
                                font-weight: bold;
                            }
                            .disclaimer {
                                text-align: center;
                                font-size: 12px;
                                margin-top: 2em;
                                color: #666;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>📈 Dodgy Dave's Stock Predictions 📈</h1>
                            <div class="tickers">Analyzed Tickers: ${this.tickersArr.join(', ')}</div>
                        </div>
                        <div class="report-content">
                            ${this.reportContent}
                        </div>
                        <div class="disclaimer">
                            © This is not real financial advice! Always correct 15% of the time!
                        </div>
                    </body>
                    </html>
                `)
                reportWindow.document.close()
            },
            
            openReportPage() {
                // Redirect to dedicated report page with URL parameters
                console.log('Opening report page with tickers:', this.tickersArr)
                console.log('Report content length:', this.reportContent.length)
                
                const tickers = this.tickersArr.join(', ')
                const encodedReport = encodeURIComponent(this.reportContent)
                const reportUrl = `report.html?tickers=${encodeURIComponent(tickers)}&report=${encodedReport}`
                
                console.log('Generated report URL:', reportUrl)
                console.log('Opening in new tab...')
                
                // Try multiple methods to ensure it works
                try {
                    const newWindow = window.open(reportUrl, '_blank')
                    if (!newWindow) {
                        console.error('Popup blocked, trying same window...')
                        window.location.href = reportUrl
                    } else {
                        console.log('Successfully opened in new tab')
                    }
                } catch (error) {
                    console.error('Error opening report page:', error)
                    // Fallback: try to open in same window
                    window.location.href = reportUrl
                }
            },
            
            testReportPage() {
                // Test with simple data
                console.log('Testing report page...')
                const testUrl = `test-report.html?tickers=AAPL,TSLA&report=${encodeURIComponent('This is a test report content!')}`
                console.log('Test URL:', testUrl)
                
                try {
                    const newWindow = window.open(testUrl, '_blank')
                    if (!newWindow) {
                        console.error('Popup blocked for test')
                        alert('Popup blocked! Please allow popups for this site.')
                    } else {
                        console.log('Test window opened successfully')
                    }
                } catch (error) {
                    console.error('Error opening test page:', error)
                }
            }
        },
        mounted() {
            console.log('Vue app mounted successfully')
        }
    }).mount('#app')
})

// Fallback functionality
function initializeFallback() {
    console.log('Initializing fallback functionality')
    
    // Add event listeners for fallback
    const form = document.getElementById('ticker-input-form')
    const generateBtn = document.querySelector('.generate-report-btn')
    
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault()
            const input = document.getElementById('ticker-input')
            if (input.value.length > 2) {
                fallbackData.tickersArr.push(input.value.toUpperCase())
                input.value = ''
                updateFallbackUI()
            }
        })
    }
    
    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            if (fallbackData.tickersArr.length > 0) {
                fallbackFetchStockData()
            }
        })
    }
}

function updateFallbackUI() {
    const tickerDisplay = document.querySelector('.ticker-choice-display')
    const generateBtn = document.querySelector('.generate-report-btn')
    
    if (tickerDisplay) {
        tickerDisplay.innerHTML = fallbackData.tickersArr.map(ticker => 
            `<span class="ticker">${ticker}</span>`
        ).join('')
    }
    
    if (generateBtn) {
        generateBtn.disabled = fallbackData.tickersArr.length === 0
    }
}

async function fallbackFetchStockData() {
    console.log('Fallback: Fetching stock data')
    // Show loading panel
    document.querySelector('.action-panel').style.display = 'none'
    document.querySelector('.loading-panel').style.display = 'flex'
    
    try {
        const stockData = await Promise.all(fallbackData.tickersArr.map(async (ticker) => {
            const url = `https://polygon-api-worker.jasani-rohan.workers.dev/?ticker=${ticker}&startDate=${dates.startDate}&endDate=${dates.endDate}`;
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error('API Error')
            }
            return response.text()
        }))
        
        await fallbackFetchReport(stockData.join(''))
    } catch (err) {
        console.error('Fallback error:', err)
        document.querySelector('.loading-panel').innerHTML = '<div>Error fetching data. Please try again.</div>'
    }
}

async function fallbackFetchReport(data) {
    // Same AI call as Vue version
    const messages = [
        {
            role: 'system',
            content: 'You are a trading guru. Given data on share prices over the past 3 days, write a report of no more than 150 words describing the stocks performance and recommending whether to buy, hold or sell.'
        },
        {
            role: 'user',
            content: data
        }
    ]
    
    try {
        const response = await fetch('https://openai-api-worker.jasani-rohan.workers.dev', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messages)
        })
        
        const responseData = await response.json()
        
        if (!response.ok) {
            throw new Error('AI Error')
        }
        
        // Redirect to report page instead of showing inline
        console.log('Fallback: Redirecting to report page...')
        const tickers = fallbackData.tickersArr.join(', ')
        const encodedReport = encodeURIComponent(responseData.content)
        const reportUrl = `report.html?tickers=${encodeURIComponent(tickers)}&report=${encodedReport}`
        
        console.log('Fallback report URL:', reportUrl)
        window.location.href = reportUrl
        
    } catch (err) {
        console.error('Fallback AI error:', err)
        document.querySelector('.loading-panel').innerHTML = '<div>Error generating report. Please try again.</div>'
    }
}

function openReportInNewPage() {
    const tickers = fallbackData.tickersArr.join(', ')
    const encodedReport = encodeURIComponent(fallbackData.reportContent)
    const reportUrl = `report.html?tickers=${encodeURIComponent(tickers)}&report=${encodedReport}`
    window.open(reportUrl, '_blank')
}