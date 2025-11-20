import { dates, getDatesForRange } from '/utils/dates'

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

    const app = createApp({
        data() {
            return {
                currentView: 'input',
                tickerInput: '',
                tickersArr: [],
                loadingMessage: '',
                loadingStep: 'fetching', // 'fetching', 'analyzing', 'generating'
                selectedPersonalities: ['dodgy-dave'], // Array for multi-select
                dayRange: 3, // configurable day range (3-30 days)
                rawStockData: null, // Store raw API data for charts
                // Integrated Confetti System
                confettiSystem: {
                    isDrawing: false,
                    animationIsOk: true,
                    imageKeys: [],
                    explosionKeys: [],
                    imageMap: {},
                    explosionMap: {},
                    lastDistance: 0,
                    startX: 0,
                    startY: 0,
                    currentLine: null,
                    startImage: null,
                    circle: null,
                    wiggle: null,
                    clamper: null,
                    xSetter: null,
                    ySetter: null,
                    currentCursorState: 'confetti', // 'confetti' | 'pointer' | 'default'
                    lastStateChange: 0, // Timestamp to prevent rapid switching
                    stateChangeDelay: 50 // Minimum ms between state changes
                },
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
            
            togglePersonality(personalityId) {
                console.log('Toggling personality:', personalityId)
                const index = this.selectedPersonalities.indexOf(personalityId)
                if (index > -1) {
                    // Remove if already selected (but keep at least one)
                    if (this.selectedPersonalities.length > 1) {
                        this.selectedPersonalities.splice(index, 1)
                    }
                } else {
                    // Add if not selected
                    this.selectedPersonalities.push(personalityId)
                }
                console.log('Current selected personalities:', this.selectedPersonalities)
            },

            isPersonalitySelected(personalityId) {
                return this.selectedPersonalities.includes(personalityId)
            },
            
            async fetchStockData() {
                console.log('=== FETCH STOCK DATA CALLED ===')
                console.log('Current view before:', this.currentView)
                console.log('Fetching stock data for:', this.tickersArr)
                
                // Trigger simple confetti animation for Vue.js area
                if (window.triggerSimpleConfetti) {
                    window.triggerSimpleConfetti()
                }
                
                this.currentView = 'loading'
                this.loadingStep = 'fetching'
                this.loadingMessage = 'Connecting to stock data API...'
                
                console.log('Current view after setting to loading:', this.currentView)
                console.log('Loading step:', this.loadingStep)
                console.log('Loading message:', this.loadingMessage)
                
                try {
                    // Get dynamic date range based on user selection
                    const dateRange = getDatesForRange(this.dayRange)
                    console.log('Using date range:', dateRange)
                    
                    const stockData = await Promise.all(this.tickersArr.map(async (ticker, index) => {
                        const url = `https://polygon-api-worker.jasani-rohan.workers.dev/?ticker=${ticker}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
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
                    
                    // Store raw stock data for chart processing
                    this.rawStockData = stockData
                    
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
                console.log('Fetching AI reports...')
                this.loadingStep = 'generating'
                this.loadingMessage = 'AI is analyzing your stocks and generating insights...'

                const reports = {}
                const url = 'https://openai-api-worker.jasani-rohan.workers.dev'

                try {
                    // Fetch report for each selected personality
                    for (let i = 0; i < this.selectedPersonalities.length; i++) {
                        const personalityId = this.selectedPersonalities[i]
                        const personality = this.personalities[personalityId]
                        console.log(`Generating report for personality: ${personality.name}`)

                        this.loadingMessage = `AI is analyzing your stocks (${i + 1} of ${this.selectedPersonalities.length})...`

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

                        const response = await fetch(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(messages)
                        })

                        const responseData = await response.json()
                        console.log(`AI response received for ${personality.name}:`, responseData)

                        if (!response.ok) {
                            throw new Error(`Worker Error: ${responseData.error}`)
                        }

                        reports[personalityId] = responseData.content

                        // Small delay between API calls
                        if (i < this.selectedPersonalities.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 500))
                        }
                    }

                    this.loadingMessage = 'Finalizing your report...'

                    // Brief delay before redirect
                    await new Promise(resolve => setTimeout(resolve, 1000))

                    this.renderReport(reports)
                } catch (err) {
                    console.error('Error generating report:', err)
                    this.loadingMessage = 'Error generating AI report. Please try again.'
                    // Show error for 3 seconds then go back to input
                    setTimeout(() => {
                        this.goHome()
                    }, 3000)
                }
            },

            renderReport(reports) {
                console.log('Rendering reports:', reports)

                // Store report data in sessionStorage to avoid URL length issues
                const reportData = {
                    tickers: this.tickersArr.join(', '),
                    reports: reports, // Object with personality IDs as keys
                    personalityIds: this.selectedPersonalities, // Array of selected personality IDs
                    timestamp: Date.now(),
                    dayRange: this.dayRange, // Include day range for chart context
                    rawStockData: this.rawStockData // Store raw data for charts
                }
                
                try {
                    sessionStorage.setItem('stockReport', JSON.stringify(reportData))
                    console.log('Report data stored in sessionStorage')
                    
                    // 🎉 Trigger confetti celebration for successful report generation!
                    if (this.confettiSystem.animationIsOk && this.confettiSystem.explosionKeys.length > 0) {
                        // Create a spectacular confetti celebration before navigating
                        const centerX = window.innerWidth / 2
                        const centerY = window.innerHeight / 2
                        
                        // Main central explosion
                        this.createExplosion(centerX, centerY, 600)
                        
                        // Additional explosions for extra celebration
                        setTimeout(() => {
                            this.createExplosion(centerX - 200, centerY - 100, 400)
                            this.createExplosion(centerX + 200, centerY - 100, 400)
                        }, 150)
                        
                        setTimeout(() => {
                            this.createExplosion(centerX - 300, centerY + 50, 300)
                            this.createExplosion(centerX + 300, centerY + 50, 300)
                        }, 300)
                        
                        console.log('🎊 Confetti celebration triggered for report generation!')
                    }
                    
                    // Redirect to report page with just a simple identifier (slight delay to show confetti)
                    const reportUrl = `report.html?id=${Date.now()}`
                    console.log('Redirecting to report page:', reportUrl)
                    setTimeout(() => {
                        window.location.href = reportUrl
                    }, 800) // Allow time for confetti to start
                } catch (error) {
                    console.error('Error storing report data:', error)
                    // Fallback to URL method for smaller reports
                    const tickers = this.tickersArr.join(', ')
                    const encodedReport = encodeURIComponent(output)
                    const reportUrl = `report.html?tickers=${encodeURIComponent(tickers)}&report=${encodedReport}`
                    
                    // Add confetti for fallback method too
                    if (this.confettiSystem.animationIsOk && this.confettiSystem.explosionKeys.length > 0) {
                        const centerX = window.innerWidth / 2
                        const centerY = window.innerHeight / 2
                        this.createExplosion(centerX, centerY, 500)
                        console.log('🎊 Confetti celebration triggered for fallback report generation!')
                    }
                    
                    setTimeout(() => {
                        window.location.href = reportUrl
                    }, 800) // Allow time for confetti to start
                }
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
                // Store report data in sessionStorage and open report page
                console.log('Opening report page with tickers:', this.tickersArr)
                console.log('Report content length:', this.reportContent.length)
                
                const reportData = {
                    tickers: this.tickersArr.join(', '),
                    content: this.reportContent,
                    timestamp: Date.now()
                }
                
                try {
                    sessionStorage.setItem('stockReport', JSON.stringify(reportData))
                    const reportUrl = `report.html?id=${Date.now()}`
                    
                    console.log('Generated report URL:', reportUrl)
                    console.log('Opening in new tab...')
                    
                    const newWindow = window.open(reportUrl, '_blank')
                    if (!newWindow) {
                        console.error('Popup blocked, trying same window...')
                        window.location.href = reportUrl
                    } else {
                        console.log('Successfully opened in new tab')
                        
                        // 🎉 Trigger confetti celebration for successful report generation!
                        if (this.confettiSystem.animationIsOk && this.confettiSystem.explosionKeys.length > 0) {
                            // Create multiple confetti explosions across the screen for a big celebration
                            const centerX = window.innerWidth / 2
                            const centerY = window.innerHeight / 2
                            
                            // Main central explosion
                            this.createExplosion(centerX, centerY, 600)
                            
                            // Additional explosions for extra celebration
                            setTimeout(() => {
                                this.createExplosion(centerX - 200, centerY - 100, 400)
                                this.createExplosion(centerX + 200, centerY - 100, 400)
                            }, 150)
                            
                            setTimeout(() => {
                                this.createExplosion(centerX - 300, centerY + 50, 300)
                                this.createExplosion(centerX + 300, centerY + 50, 300)
                            }, 300)
                            
                            console.log('🎊 Confetti celebration triggered for report generation!')
                        }
                    }
                } catch (error) {
                    console.error('Error opening report page:', error)
                    // Fallback to URL method
                    const tickers = this.tickersArr.join(', ')
                    const encodedReport = encodeURIComponent(this.reportContent)
                    const reportUrl = `report.html?tickers=${encodeURIComponent(tickers)}&report=${encodedReport}`
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
            },
            
            // Integrated Confetti System Methods
            initConfettiSystem() {
                console.log('🎉 Initializing integrated confetti system...')
                
                // Check if GSAP is available
                if (typeof gsap === 'undefined') {
                    console.warn('GSAP not loaded, skipping confetti initialization')
                    return
                }
                
                // Register plugins
                try {
                    gsap.registerPlugin(Observer, CustomEase, CustomWiggle, Physics2DPlugin, ScrollTrigger)
                    console.log('✅ GSAP plugins registered successfully')
                } catch (error) {
                    console.error('❌ Error registering GSAP plugins:', error)
                    return
                }
                
                // Check for reduced motion preference
                this.confettiSystem.animationIsOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
                
                // Build image maps
                this.buildImageMaps()
                
                // Create CustomWiggle and clamper
                this.confettiSystem.wiggle = CustomWiggle.create('myWiggle', { wiggles: 6, type: 'uniform' })
                this.confettiSystem.clamper = gsap.utils.clamp(1, 100)
                
                // Wait for DOM elements to be available, then set up GSAP setters
                this.$nextTick(() => {
                    const cursorElement = document.querySelector('.confetti-cursor')
                    if (cursorElement) {
                        this.confettiSystem.xSetter = gsap.quickSetter('.confetti-cursor', 'x', 'px')
                        this.confettiSystem.ySetter = gsap.quickSetter('.confetti-cursor', 'y', 'px')
                        console.log('✅ GSAP setters initialized')
                    } else {
                        console.error('❌ Confetti cursor element not found')
                    }
                })
                
                // Initialize mouse events
                this.initMouseEvents()
                
                // Initialize Observer for drag interactions
                this.initObserver()
                
                console.log('✅ Integrated confetti system ready!')
            },
            
            buildImageMaps() {
                // Build image maps for confetti pieces
                const preloadImages = document.querySelectorAll('.image-preload img[data-key]')
                const explosionImages = document.querySelectorAll('.explosion-preload img[data-key]')
                
                preloadImages.forEach(img => {
                    const key = img.dataset.key
                    if (key) {
                        this.confettiSystem.imageMap[key] = img
                        this.confettiSystem.imageKeys.push(key)
                    }
                })
                
                explosionImages.forEach(img => {
                    const key = img.dataset.key
                    if (key) {
                        this.confettiSystem.explosionMap[key] = img
                        this.confettiSystem.explosionKeys.push(key)
                    }
                })
                
                console.log('🎯 Image maps built:', {
                    imageKeys: this.confettiSystem.imageKeys.length,
                    explosionKeys: this.confettiSystem.explosionKeys.length
                })
            },
            
            initMouseEvents() {
                if (!this.confettiSystem.animationIsOk || ScrollTrigger.isTouch === 1) {
                    console.log('⚠️ Skipping mouse events (reduced motion or touch device)')
                    return
                }
                
                // Initialize cursor state
                this.setCursorState('confetti')
                
                // Bind methods to preserve 'this' context
                const boundMouseEnter = this.onMouseEnter.bind(this)
                const boundMouseLeave = this.onMouseLeave.bind(this)
                const boundMouseMove = this.onMouseMove.bind(this)
                
                // Add mouse event listeners to the main app
                document.addEventListener('mouseenter', boundMouseEnter)
                document.addEventListener('mouseleave', boundMouseLeave)
                document.addEventListener('mousemove', boundMouseMove)
                
                // Store bound functions for cleanup
                this.confettiSystem.boundMouseEnter = boundMouseEnter
                this.confettiSystem.boundMouseLeave = boundMouseLeave
                this.confettiSystem.boundMouseMove = boundMouseMove
                
                // Initialize interactive element handling
                this.addInteractiveElementEvents()
                
                console.log('✅ Mouse events initialized with centralized cursor management')
            },
            
                        addInteractiveElementEvents() {
                // Note: Cursor state is now handled centrally in updateCursorState()
                // This method is kept for any future interactive element setup
                
                console.log('✅ Interactive element events initialized (cursor handled centrally)')
            },
            
            initObserver() {
                if (!this.confettiSystem.animationIsOk) {
                    console.log('⚠️ Skipping Observer (animation not allowed)')
                    return
                }
                
                const targetElement = document.body
                
                if (ScrollTrigger.isTouch === 1) {
                    console.log('📱 Setting up touch Observer')
                    Observer.create({
                        target: targetElement,
                        type: 'touch',
                        onPress: (e) => {
                            const elementUnderMouse = document.elementFromPoint(e.x, e.y)
                            if (this.isInteractiveElement(elementUnderMouse)) {
                                console.log('⚠️ Touch ignored (interactive element)')
                                return false
                            }
                            if (this.isNoClickElement(elementUnderMouse)) {
                                console.log('⚠️ Touch ignored (no-click zone)')
                                return false
                            }
                            this.clearTextSelection()
                            this.createExplosion(e.x, e.y, 400)
                        }
                    })
                } else {
                    console.log('🖱️ Setting up pointer Observer')
                    Observer.create({
                        target: document.body,
                        type: 'pointer',
                        preventDefault: false,
                        onPress: (e) => {
                            console.log('🖱️ Observer onPress:', { x: e.x, y: e.y })
                            // Check if we're clicking on an interactive element
                            const elementUnderMouse = document.elementFromPoint(e.x, e.y)
                            if (this.isInteractiveElement(elementUnderMouse)) {
                                console.log('⚠️ Press ignored (interactive element)')
                                return false // Don't start drawing
                            }
                            // Check if we're in a no-click zone (but allow drag-through)
                            if (this.isNoClickElement(elementUnderMouse)) {
                                console.log('⚠️ Press ignored (no-click zone)')
                                return false // Don't start drawing on click
                            }
                            console.log('✅ Starting drawing')
                            this.startDrawing(e)
                            return true
                        },
                        onDrag: (e) => {
                            // Allow drag-through even in no-click zones
                            if (this.confettiSystem.isDrawing) {
                                this.updateDrawing(e)
                            }
                        },
                        onDragEnd: (e) => {
                            if (this.confettiSystem.isDrawing) {
                                console.log('🖱️ Observer onDragEnd')
                                this.clearDrawing(e)
                            }
                        },
                        onRelease: (e) => {
                            if (this.confettiSystem.isDrawing) {
                                console.log('🖱️ Observer onRelease')
                                this.clearDrawing(e)
                            }
                        }
                    })
                }
                
                console.log('✅ Observer initialized')
            },
            
            onMouseEnter(e) {
                // Show confetti cursor when entering the page
                gsap.set('.confetti-cursor', { opacity: 1 })
                if (this.confettiSystem.xSetter && this.confettiSystem.ySetter) {
                    this.confettiSystem.xSetter(e.clientX)
                    this.confettiSystem.ySetter(e.clientY)
                }
            },
            
            onMouseLeave(e) {
                // Hide confetti cursor when leaving the page
                gsap.set('.confetti-cursor', { opacity: 0 })
                document.body.style.cursor = 'default'
            },
            
            onMouseMove(e) {
                // Always update confetti cursor position
                if (this.confettiSystem.xSetter && this.confettiSystem.ySetter) {
                    this.confettiSystem.xSetter(e.clientX)
                    this.confettiSystem.ySetter(e.clientY)
                }
                
                // Centralized cursor state management
                this.updateCursorState(e.clientX, e.clientY)
                
                // Debug occasionally to avoid spam
                if (Math.random() < 0.001) {
                    console.log('🖱️ Mouse move:', { 
                        x: e.clientX, 
                        y: e.clientY, 
                        cursorState: this.confettiSystem.currentCursorState 
                    })
                }
            },
            
            isInteractiveElement(element) {
                if (!element) return false
                
                // Check if element or its parents are interactive
                const interactiveSelectors = [
                    'button',
                    'input',
                    'select',
                    'textarea',
                    'a',
                    'label',
                    '.personality-card',
                    '.personality-selection',          // Entire personality selection area
                    '.personality-grid',
                    '.personality-avatar',
                    '.personality-info',
                    '.personality-image',
                    '.slider',
                    '.day-range-selection',           // Entire day range selection area  
                    '.day-range-slider',              // Entire slider container
                    '.generate-report-btn',
                    '.add-ticker-btn',
                    '.ticker',
                    '.form-input-control',
                    '.action-panel'
                ]
                
                // Check the element itself and its parents
                let currentElement = element
                while (currentElement && currentElement !== document.body) {
                    for (const selector of interactiveSelectors) {
                        if (currentElement.matches && currentElement.matches(selector)) {
                            return true
                        }
                    }
                    currentElement = currentElement.parentElement
                }
                
                return false
            },
            
            isInSafeZone(mouseX, mouseY) {
                // Define selectors for elements that should have safe zones
                const safeZoneSelectors = [
                    'button',
                    'input',
                    'select',
                    'textarea',
                    'a',
                    '.personality-card',
                    '.personality-selection',
                    '.day-range-selection',
                    '.day-range-slider',
                    '.slider',
                    '.generate-report-btn',
                    '.add-ticker-btn',
                    'label[for]',
                    '.ticker'
                ]
                
                const safeZoneMargin = 4 // 4px safe zone as requested
                
                // Check each type of interactive element
                for (const selector of safeZoneSelectors) {
                    const elements = document.querySelectorAll(selector)
                    for (const element of elements) {
                        const rect = element.getBoundingClientRect()
                        
                        // Expand the element's bounds by the safe zone margin
                        const expandedRect = {
                            left: rect.left - safeZoneMargin,
                            right: rect.right + safeZoneMargin,
                            top: rect.top - safeZoneMargin,
                            bottom: rect.bottom + safeZoneMargin
                        }
                        
                        // Check if mouse is within the expanded bounds
                        if (mouseX >= expandedRect.left && 
                            mouseX <= expandedRect.right && 
                            mouseY >= expandedRect.top && 
                            mouseY <= expandedRect.bottom) {
                            return true
                        }
                    }
                }
                
                return false
            },
            
            updateCursorState(mouseX, mouseY) {
                const now = Date.now()
                
                // Prevent rapid state changes
                if (now - this.confettiSystem.lastStateChange < this.confettiSystem.stateChangeDelay) {
                    return
                }
                
                // Determine what the cursor state should be
                const elementUnderMouse = document.elementFromPoint(mouseX, mouseY)
                const isOverInteractive = this.isInteractiveElement(elementUnderMouse)
                const isInSafeZone = this.isInSafeZone(mouseX, mouseY)
                
                let desiredState = 'confetti'
                
                if (isOverInteractive) {
                    // Direct hover over interactive element - use pointer
                    desiredState = 'pointer'
                } else if (isInSafeZone) {
                    // In safe zone around interactive element - use default
                    desiredState = 'default'
                } else {
                    // Normal area - use confetti cursor
                    desiredState = 'confetti'
                }
                
                // Only change state if different from current
                if (desiredState !== this.confettiSystem.currentCursorState) {
                    this.setCursorState(desiredState)
                    this.confettiSystem.lastStateChange = now
                }
            },
            
            setCursorState(state) {
                // Update internal state
                this.confettiSystem.currentCursorState = state
                
                // Apply the cursor state
                switch (state) {
                    case 'confetti':
                        gsap.set('.confetti-cursor', { opacity: 1 })
                        document.body.style.cursor = 'none'
                        break
                    case 'pointer':
                        gsap.set('.confetti-cursor', { opacity: 0 })
                        document.body.style.cursor = 'pointer'
                        break
                    case 'default':
                        gsap.set('.confetti-cursor', { opacity: 0 })
                        document.body.style.cursor = 'default'
                        break
                }
                
                // Debug log for state changes
                if (Math.random() < 0.1) { // 10% chance to avoid spam
                    console.log('🎯 Cursor state changed to:', state)
                }
            },
            
            isNoClickElement(element) {
                if (!element) return false
                
                // Areas where confetti clicks should be disabled but drag-through allowed
                const noClickSelectors = [
                    '.personality-selection',
                    '.personality-grid',
                    '.day-range-selection',
                    '.day-range-slider',
                    '.ticker-choice-display',
                    '.form-input-control'
                ]
                
                // Check the element itself and its parents
                let currentElement = element
                while (currentElement && currentElement !== document.body) {
                    for (const selector of noClickSelectors) {
                        if (currentElement.matches && currentElement.matches(selector)) {
                            return true
                        }
                    }
                    currentElement = currentElement.parentElement
                }
                
                return false
            },
            
            clearTextSelection() {
                // Clear any text selection on the page
                if (window.getSelection) {
                    const selection = window.getSelection()
                    if (selection.rangeCount > 0) {
                        selection.removeAllRanges()
                        console.log('🔄 Text selection cleared')
                    }
                } else if (document.selection) {
                    // For older IE browsers
                    document.selection.empty()
                    console.log('🔄 Text selection cleared (IE)')
                }
            },
            
            startDrawing(e) {
                this.confettiSystem.isDrawing = true
                this.confettiSystem.startX = e.x
                this.confettiSystem.startY = e.y + window.scrollY
                
                // Clear any text selection when starting confetti interaction
                this.clearTextSelection()
                
                const canvas = document.querySelector('.confetti-canvas')
                if (!canvas) return
                
                // Create line (exactly like original)
                this.confettiSystem.currentLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
                this.confettiSystem.currentLine.setAttribute('x1', this.confettiSystem.startX)
                this.confettiSystem.currentLine.setAttribute('y1', this.confettiSystem.startY)
                this.confettiSystem.currentLine.setAttribute('x2', this.confettiSystem.startX)
                this.confettiSystem.currentLine.setAttribute('y2', this.confettiSystem.startY)
                this.confettiSystem.currentLine.setAttribute('stroke', '#fffce1')
                this.confettiSystem.currentLine.setAttribute('stroke-width', '2')
                this.confettiSystem.currentLine.setAttribute('stroke-dasharray', '4')
                
                // Create circle (the growing object - use random confetti piece)
                const circleRandomKey = gsap.utils.random(this.confettiSystem.imageKeys)
                const circleOriginal = this.confettiSystem.imageMap[circleRandomKey]
                if (circleOriginal) {
                    this.confettiSystem.circle = document.createElementNS('http://www.w3.org/2000/svg', 'image')
                    this.confettiSystem.circle.setAttribute('x', this.confettiSystem.startX - 25)
                    this.confettiSystem.circle.setAttribute('y', this.confettiSystem.startY - 25)
                    this.confettiSystem.circle.setAttribute('width', '50')
                    this.confettiSystem.circle.setAttribute('height', '50')
                    this.confettiSystem.circle.setAttributeNS('http://www.w3.org/1999/xlink', 'href', circleOriginal.src)
                }
                
                // Create image at start point
                const imageRandomKey = gsap.utils.random(this.confettiSystem.imageKeys)
                const imageOriginal = this.confettiSystem.imageMap[imageRandomKey]
                if (imageOriginal) {
                    this.confettiSystem.startImage = document.createElementNS('http://www.w3.org/2000/svg', 'image')
                    this.confettiSystem.startImage.setAttribute('x', this.confettiSystem.startX - 25)
                    this.confettiSystem.startImage.setAttribute('y', this.confettiSystem.startY - 25)
                    this.confettiSystem.startImage.setAttribute('width', '50')
                    this.confettiSystem.startImage.setAttribute('height', '50')
                    this.confettiSystem.startImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imageOriginal.src)
                    canvas.appendChild(this.confettiSystem.startImage)
                }
                
                // Add elements to canvas
                canvas.appendChild(this.confettiSystem.currentLine)
                canvas.appendChild(this.confettiSystem.circle)
                
                // Update cursor state
                gsap.set('.confetti-cursor .cursor-drag', { opacity: 1 })
                gsap.set('.confetti-cursor .cursor-handle', { opacity: 1 })
                gsap.set('.confetti-cursor .cursor-pink-pucker', { opacity: 1 })
                gsap.set('.confetti-cursor .cursor-rock', { opacity: 0 })
                
                // Prevent text selection during drag
                document.body.classList.add('confetti-dragging')
                
                console.log('🎨 Drawing started with circle and image')
            },
            
            updateDrawing(e) {
                if (!this.confettiSystem.currentLine || !this.confettiSystem.startImage) return
                
                let cursorX = e.x
                let cursorY = e.y + window.scrollY
                
                let dx = cursorX - this.confettiSystem.startX
                let dy = cursorY - this.confettiSystem.startY
                let distance = Math.sqrt(dx * dx + dy * dy)
                
                // Calculate shrink for line (like original)
                let shrink = (distance - 30) / distance
                let x2 = this.confettiSystem.startX + dx * shrink
                let y2 = this.confettiSystem.startY + dy * shrink
                
                if (distance < 30) {
                    x2 = this.confettiSystem.startX
                    y2 = this.confettiSystem.startY
                }
                
                // Calculate angle for rotation
                let angle = Math.atan2(dy, dx) * (180 / Math.PI)
                
                // Update line
                gsap.to(this.confettiSystem.currentLine, {
                    attr: { x2, y2 },
                    duration: 0.1,
                    ease: 'none'
                })
                
                // Scale both image and circle based on distance (like original)
                let raw = distance / 100
                let eased = Math.pow(raw, 0.5)
                let clamped = this.confettiSystem.clamper(eased)
                
                gsap.set([this.confettiSystem.startImage, this.confettiSystem.circle], {
                    scale: clamped,
                    rotation: `${angle + -45}_short`,
                    transformOrigin: 'center center'
                })
                
                // Move & rotate hand cursor
                gsap.to('.confetti-cursor', {
                    rotation: `${angle + -90}_short`,
                    duration: 0.1,
                    ease: 'none'
                })
                
                this.confettiSystem.lastDistance = distance
            },
            
            clearDrawing(e) {
                if (!this.confettiSystem.isDrawing) return
                
                // Create explosion at start position
                this.createExplosion(this.confettiSystem.startX, this.confettiSystem.startY, this.confettiSystem.lastDistance)
                
                // Update cursor state
                gsap.set('.confetti-cursor .cursor-drag', { opacity: 0 })
                gsap.set('.confetti-cursor .cursor-handle', { opacity: 0 })
                gsap.set('.confetti-cursor .cursor-pink-pucker', { opacity: 0 })
                gsap.set('.confetti-cursor .cursor-rock', { opacity: 1 })
                
                // Remove text selection prevention
                document.body.classList.remove('confetti-dragging')
                
                // Animate cursor rock with wiggle
                gsap.to('.confetti-cursor .cursor-rock', {
                    duration: 0.4,
                    rotation: '+=30',
                    ease: this.confettiSystem.wiggle,
                    onComplete: () => {
                        gsap.set('.confetti-cursor .cursor-rock', { opacity: 0 })
                        gsap.set('.confetti-cursor', { rotation: 0, overwrite: 'auto' })
                        gsap.set('.confetti-cursor .cursor-drag', { opacity: 1 })
                    }
                })
                
                this.confettiSystem.isDrawing = false
                
                // Clear all SVG elements
                const canvas = document.querySelector('.confetti-canvas')
                if (canvas) {
                    canvas.innerHTML = ''
                }
                
                // Reset references
                this.confettiSystem.currentLine = null
                this.confettiSystem.startImage = null
                this.confettiSystem.circle = null
            },
            


            createExplosion(x, y, distance = 100) {
                console.log('🎆 Creating explosion:', { x, y, distance, explosionKeys: this.confettiSystem.explosionKeys.length })
                
                if (this.confettiSystem.explosionKeys.length === 0) {
                    console.warn('❌ No explosion images available')
                    console.log('Available explosion map:', this.confettiSystem.explosionMap)
                    return
                }
                
                const count = Math.round(gsap.utils.clamp(3, 100, distance / 20))
                const explosion = gsap.timeline()
                const speed = gsap.utils.mapRange(0, 500, 0.3, 1.5, distance)
                const sizeRange = gsap.utils.mapRange(0, 500, 20, 60, distance)
                
                for (let i = 0; i < count; i++) {
                    const randomKey = gsap.utils.random(this.confettiSystem.explosionKeys)
                    const original = this.confettiSystem.explosionMap[randomKey]
                    if (!original) continue
                    
                    const img = original.cloneNode(true)
                    img.className = 'confetti-piece'
                    img.style.position = 'fixed'
                    img.style.pointerEvents = 'none'
                    img.style.height = `${gsap.utils.random(20, sizeRange)}px`
                    img.style.left = `${x}px`
                    img.style.top = `${y}px`
                    img.style.zIndex = 9999
                    
                    document.body.appendChild(img)
                    
                    const angle = Math.random() * Math.PI * 2
                    const velocity = gsap.utils.random(500, 1500) * speed
                    
                    explosion
                        .to(img, {
                            physics2D: {
                                angle: angle * (180 / Math.PI),
                                velocity: velocity,
                                gravity: 3000
                            },
                            rotation: gsap.utils.random(-180, 180),
                            duration: 1 + Math.random()
                        }, 0)
                        .to(img, {
                            opacity: 0,
                            duration: 0.2,
                            ease: 'power1.out',
                            onComplete: () => img.remove()
                        }, 1)
                }
                
                return explosion
            },
            
            // Test function for confetti
            testConfetti() {
                console.log('🧪 Testing integrated confetti system')
                console.log('Confetti system state:', this.confettiSystem)
                this.createExplosion(100, 100, 500)
            },
            
            // Force show cursor for testing
            testCursor() {
                console.log('🧪 Testing confetti cursor')
                gsap.set('.confetti-cursor', { opacity: 1, x: 200, y: 200 })
                document.body.style.cursor = 'none'
            },
            
            // Test explosion without safe zone check
            testExplosionDirect() {
                console.log('🧪 Testing direct explosion')
                this.createExplosion(window.innerWidth / 2, window.innerHeight / 2, 400)
            },
            
            // Initialize ticker placeholder animation with custom scramble text reveal
            initTickerPlaceholderAnimation() {
                const placeholder = document.getElementById('ticker-placeholder')
                if (!placeholder) {
                    console.log('⚠️ Ticker placeholder not found')
                    return
                }
                
                console.log('🎨 Initializing ticker placeholder scramble animation')
                
                // Store original text
                const originalText = placeholder.textContent
                
                // Character sets for scrambling
                const scrambleChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()'.split('')
                const getRandomChar = () => scrambleChars[Math.floor(Math.random() * scrambleChars.length)]
                
                // Split text manually into character spans
                const chars = originalText.split('').map((char, index) => {
                    const span = document.createElement('span')
                    span.textContent = char
                    span.style.display = 'inline-block'
                    span.classList.add('scramble-char')
                    span.dataset.original = char
                    span.dataset.index = index
                    return span
                })
                
                // Replace placeholder content with character spans
                placeholder.innerHTML = ''
                chars.forEach(char => placeholder.appendChild(char))
                
                // Add subtle color pulse animation
                gsap.to(placeholder, {
                    color: "#2dd665",
                    duration: 3,
                    ease: "power2.inOut",
                    repeat: -1,
                    yoyo: true
                })
                
                // Initially scramble all characters
                chars.forEach(char => {
                    if (char.dataset.original !== ' ') { // Don't scramble spaces
                        char.textContent = getRandomChar()
                    }
                })
                
                // Start the reveal animation after 1 second delay
                gsap.delayedCall(1, () => {
                    console.log('🎯 Starting custom scramble text reveal')
                    
                    // Reveal each character with custom scramble effect
                    chars.forEach((char, index) => {
                        if (char.dataset.original === ' ') {
                            // Skip spaces
                            return
                        }
                        
                        const revealDelay = index * 0.08 // Stagger the reveals
                        
                        // Create scramble timeline for this character
                        const tl = gsap.timeline({ delay: revealDelay })
                        
                        // Scramble phase (0.3 seconds of random characters)
                        const scrambleInterval = setInterval(() => {
                            char.textContent = getRandomChar()
                        }, 50)
                        
                        // Stop scrambling and reveal original character
                        tl.call(() => {
                            clearInterval(scrambleInterval)
                            char.textContent = char.dataset.original
                        }, [], 0.3)
                        
                        // Add a subtle scale effect on reveal
                        tl.fromTo(char, {
                            scale: 1.2,
                            opacity: 0.7
                        }, {
                            scale: 1,
                            opacity: 1,
                            duration: 0.3,
                            ease: "back.out(1.7)"
                        }, 0.3)
                    })
                })
                
                console.log('✅ Ticker placeholder scramble animation initialized')
            },

            animateDayRangeNumber(newValue, oldValue) {
                const numberElement = document.querySelector('.day-range-number')
                if (!numberElement) return
                
                // Set data attributes for shadows
                const prevNumber = Math.max(3, newValue - 1)
                const nextNumber = Math.min(30, newValue + 1)
                
                numberElement.setAttribute('data-prev', prevNumber)
                numberElement.setAttribute('data-next', nextNumber)
                
                // Determine animation direction
                const isIncreasing = newValue > oldValue
                const direction = isIncreasing ? -1 : 1
                
                // GSAP animation
                gsap.fromTo(numberElement, {
                    y: direction * 20,
                    opacity: 0.7,
                    scale: 0.95
                }, {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    duration: 0.4,
                    ease: "back.out(1.7)"
                })
            }
        },
        watch: {
            dayRange(newValue, oldValue) {
                if (oldValue !== undefined && newValue !== oldValue) {
                    this.animateDayRangeNumber(newValue, oldValue)
                }
            }
        },
        mounted() {
            console.log('Vue app mounted successfully')
            
            // Initialize integrated confetti system
            this.$nextTick(() => {
                this.initConfettiSystem()
                this.initTickerPlaceholderAnimation()
                
                // Initialize day range number attributes
                const numberElement = document.querySelector('.day-range-number')
                if (numberElement) {
                    numberElement.setAttribute('data-prev', Math.max(3, this.dayRange - 1))
                    numberElement.setAttribute('data-next', Math.min(30, this.dayRange + 1))
                }
            })
        }
    }).mount('#app')
    
    // Make Vue app globally accessible for testing
    window.vueApp = app
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
        
        // Store report data and redirect to report page
        console.log('Fallback: Redirecting to report page...')
        const reportData = {
            tickers: fallbackData.tickersArr.join(', '),
            content: responseData.content,
            timestamp: Date.now()
        }
        
        try {
            sessionStorage.setItem('stockReport', JSON.stringify(reportData))
            const reportUrl = `report.html?id=${Date.now()}`
            console.log('Fallback report URL:', reportUrl)
            window.location.href = reportUrl
        } catch (error) {
            console.error('Fallback sessionStorage error:', error)
            // Fallback to URL method
            const tickers = fallbackData.tickersArr.join(', ')
            const encodedReport = encodeURIComponent(responseData.content)
            const reportUrl = `report.html?tickers=${encodeURIComponent(tickers)}&report=${encodedReport}`
            window.location.href = reportUrl
        }
        
    } catch (err) {
        console.error('Fallback AI error:', err)
        document.querySelector('.loading-panel').innerHTML = '<div>Error generating report. Please try again.</div>'
    }
}

function openReportInNewPage() {
    const reportData = {
        tickers: fallbackData.tickersArr.join(', '),
        content: fallbackData.reportContent,
        timestamp: Date.now()
    }
    
    try {
        sessionStorage.setItem('stockReport', JSON.stringify(reportData))
        const reportUrl = `report.html?id=${Date.now()}`
        window.open(reportUrl, '_blank')
    } catch (error) {
        console.error('Error with sessionStorage:', error)
        // Fallback to URL method
        const tickers = fallbackData.tickersArr.join(', ')
        const encodedReport = encodeURIComponent(fallbackData.reportContent)
        const reportUrl = `report.html?tickers=${encodeURIComponent(tickers)}&report=${encodedReport}`
        window.open(reportUrl, '_blank')
    }
}