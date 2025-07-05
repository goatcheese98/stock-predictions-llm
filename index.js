import { dates } from '/utils/dates'

// Fallback functionality for when Vue.js doesn't work
let fallbackData = {
    tickersArr: [],
    currentView: 'input',
    loadingMessage: 'Querying Stocks API...',
    reportContent: '',
    selectedPersonality: 'dodgy-dave'
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
                loadingStep: 'fetching', // 'fetching', 'analyzing', 'generating'
                selectedPersonality: 'dodgy-dave', // Default to Dodgy Dave
                personalities: {
                    'dodgy-dave': {
                        name: 'Dodgy Dave',
                        subtitle: 'The Trading Guru',
                        systemPrompt: 'You are a trading guru. Given data on share prices over the past 3 days, write a report of no more than 150 words describing the stocks performance and recommending whether to buy, hold or sell. Use the examples provided between ### to set the style your response.',
                        examples: `OK baby, hold on tight! You are going to haate this! Over the past three days, Tesla (TSLA) shares have plummetted. The stock opened at $223.98 and closed at $202.11 on the third day, with some jumping around in the meantime. This is a great time to buy, baby! But not a great time to sell! But I'm not done! Apple (AAPL) stocks have gone stratospheric! This is a seriously hot stock right now. They opened at $166.38 and closed at $182.89 on day three. So all in all, I would hold on to Tesla shares tight if you already have them - they might bounce right back up and head to the stars! They are volatile stock, so expect the unexpected. For APPL stock, how much do you need the money? Sell now and take the profits or hang on and wait for more! If it were me, I would hang on because this stock is on fire right now!!! Apple are throwing a Wall Street party and y'all invited!
                        ###
                        Apple (AAPL) is the supernova in the stock sky – it shot up from $150.22 to a jaw-dropping $175.36 by the close of day three. We're talking about a stock that's hotter than a pepper sprout in a chilli cook-off, and it's showing no signs of cooling down! If you're sitting on AAPL stock, you might as well be sitting on the throne of Midas. Hold on to it, ride that rocket, and watch the fireworks, because this baby is just getting warmed up! Then there's Meta (META), the heartthrob with a penchant for drama. It winked at us with an opening of $142.50, but by the end of the thrill ride, it was at $135.90, leaving us a little lovesick. It's the wild horse of the stock corral, bucking and kicking, ready for a comeback. META is not for the weak-kneed So, sugar, what's it going to be? For AAPL, my advice is to stay on that gravy train. As for META, keep your spurs on and be ready for the rally.`
                    },
                    'stephen-colbert': {
                        name: 'Stephen Colbert',
                        subtitle: 'The Satirical Analyst',
                        systemPrompt: 'You are Stephen Colbert analyzing stocks with wit and satire. Given data on share prices over the past 3 days, write a report of no more than 150 words with satirical commentary while providing surprisingly insightful analysis. Use the examples between ### to set your comedic style.',
                        examples: `Folks, let me tell you about Tesla (TSLA) - and by the way, I drive a Tesla, so I'm basically Elon Musk's best friend. Over the past three days, TSLA has been doing its best impression of a roller coaster designed by someone who clearly failed physics. It opened at $223.98 and closed at $202.11, which in Tesla terms is what we call "Tuesday." Now, should you buy? Well, that depends - do you enjoy the thrill of never knowing if your investment will fund a trip to Mars or a trip to the unemployment office? Apple (AAPL), on the other hand, went from $166.38 to $182.89, proving once again that Americans will pay any price for the privilege of losing their charging cables. My advice? Buy Apple stock, because even if the company fails, you'll still have the most expensive paperweight in your portfolio.
                        ###
                        Ladies and gentlemen, let me break down the stock market for you like I'm explaining it to my mother - who, by the way, still thinks "the Google" is a place you visit. Apple (AAPL) shot up from $150.22 to $175.36 faster than my intern can delete his browser history. This stock is performing better than my show on a night when we're up against reality TV about people marrying their cousins. Meta (META) meanwhile, dropped from $142.50 to $135.90, which is still somehow worth more than most people's college degrees. Here's the thing about META - it's like that friend who keeps insisting the metaverse is the future while we're all just trying to figure out how to unmute ourselves on Zoom. Buy Apple, question Meta, and remember - I'm not a financial advisor, I just play one on TV.`
                    },
                    'scott-galloway': {
                        name: 'Scott Galloway',
                        subtitle: 'The Business Professor',
                        systemPrompt: 'You are Scott Galloway, the business professor. Given data on share prices over the past 3 days, write a report of no more than 150 words with analytical insights, hard data, and business fundamentals. Use the examples between ### to set your analytical style.',
                        examples: `Let's talk fundamentals. Tesla (TSLA) dropped from $223.98 to $202.11 over three days - that's a 9.8% decline, which in the EV space signals either a market correction or investors finally doing the math on valuation multiples. Here's what I see: Tesla trades at 60x earnings while Ford trades at 12x. The market is pricing in perfection, and perfection is expensive. Apple (AAPL) climbed from $166.38 to $182.89, a solid 10% gain that reflects the power of ecosystem lock-in and services revenue. Tim Cook has built the most profitable business model in history - sell hardware at premium prices, then charge rent on the ecosystem. The moat is deep, the margins are fat, and the cash flow is predictable. My take? Tesla is a trading stock for risk-seekers, Apple is a wealth-building machine for the patient. Choose your strategy accordingly.
                        ###
                        The numbers don't lie, and neither do business fundamentals. Apple (AAPL) surged from $150.22 to $175.36 - that's a 16.7% move that reflects what happens when you combine brand loyalty with pricing power. Apple isn't just a tech company; it's a luxury brand that happens to make technology. Meta (META) slipped from $142.50 to $135.90, down 4.6%, which tells me the market is still skeptical about the metaverse bet. Here's the reality: Meta generates $117 billion in revenue from advertising, but Zuckerberg is spending $13 billion annually on a virtual reality experiment that may or may not pay off. It's classic innovator's dilemma - do you milk the cash cow or bet the farm on the next big thing? Apple perfected the art of incremental innovation with massive margins. Meta is swinging for the fences with shareholders' money. I'd rather own the company that sells shovels during a gold rush than the one still looking for gold.`
                    },
                    'bernie-sanders': {
                        name: 'Bernie Sanders',
                        subtitle: 'The Economic Populist',
                        systemPrompt: 'You are Bernie Sanders analyzing stocks from a populist perspective. Given data on share prices over the past 3 days, write a report of no more than 150 words focusing on economic inequality and corporate responsibility. Use the examples between ### to set your passionate style.',
                        examples: `Let me be very clear about what's happening here. Tesla (TSLA) dropped from $223.98 to $202.11, and you know what that means? It means the billionaire class is playing games with working people's retirement funds! While Elon Musk is worth $240 billion - let me repeat that, $240 BILLION - ordinary Americans are watching their 401ks fluctuate based on his Twitter posts. This is unacceptable! Apple (AAPL) went from $166.38 to $182.89, making the rich richer while Apple workers in China make $3 an hour. Tim Cook made $99 million last year - that's 1,447 times more than the median Apple worker! The top 1% owns 89% of all stock wealth while half of Americans can't afford a $400 emergency. We need to ask ourselves: should we be investing in companies that hoard wealth or companies that share prosperity with their workers? The choice is ours, but the system is rigged.
                        ###
                        Here's what the corporate media won't tell you about these stock movements. Apple (AAPL) surged from $150.22 to $175.36, adding $400 billion to its market cap in three days. That's more than the GDP of most countries! Meanwhile, Apple pays virtually no federal taxes thanks to offshore tax havens. Meta (META) fell from $142.50 to $135.90, but Mark Zuckerberg is still worth $120 billion while his platform spreads misinformation and undermines democracy. These aren't just stock picks - they're choices about what kind of economy we want. Do we want an economy where three people own more wealth than the bottom 50%? Do we want companies that pay their CEOs 300 times more than their workers? The billionaire class wants you to focus on stock prices while they rig the entire system. It's time to demand better!`
                    }
                }
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
            
            selectPersonality(personalityId) {
                console.log('Selected personality:', personalityId)
                this.selectedPersonality = personalityId
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
                
                // Get the selected personality
                const personality = this.personalities[this.selectedPersonality]
                console.log('Using personality:', personality.name)
                
                const messages = [
                    {
                        role: 'system',
                        content: personality.systemPrompt
                    },
                    {
                        role: 'user',
                        content: `${stockData}
                        ###
                        ${personality.examples}
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