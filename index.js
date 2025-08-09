// Simple but effective scraping approach
async function getPlaceDetailsSimple(url) {
    if (storeCache.has(url)) {
        return storeCache.get(url);
    }

    let browser;
    try {
        console.log('🚀 Launching simple stealth browser...');
        
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-first-run',
                '--disable-gpu',
                '--single-process',
                '--no-zygote'
            ],
            ignoreDefaultArgs: ['--enable-automation']
        });

        const page = await browser.newPage();
        
        // Basic stealth
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log(`📍 Navigating to: ${url}`);
        
        // Simple navigation
        await page.goto(url, { 
            waitUntil: 'domcontentloaded', 
            timeout: 20000 
        });

        // Wait for content
        await new Promise(resolve => setTimeout(resolve, 4000));

        // Simple extraction
        const data = await page.evaluate(() => {
            // Try to find store name
            let name = document.querySelector('h1')?.innerText?.trim() || 
                      document.querySelector('.qrShPb')?.innerText?.trim() ||
                      "Store Name Not Available";

            // Clean up name
            if (name.includes('Google Maps')) {
                name = "Store Name Not Available";
            }

            // Try to find address
            let address = document.querySelector('[data-item-id="address"]')?.innerText?.trim() ||
                         document.querySelector('.Io6YTe')?.innerText?.trim() ||
                         "Address not available";

            // Try to find rating
            let rating = "N/A";
            const ratingEl = document.querySelector('.F7nice span') || 
                           document.querySelector('.yi40Hd');
            if (ratingEl) {
                const ratingMatch = ratingEl.innerText.match(/\d+\.?\d*/);
                if (ratingMatch) rating = ratingMatch[0];
            }

            return { name, address, rating };
        });

        console.log('✅ Simple extraction result:', data);
        storeCache.set(url, data);
        return data;

    } catch (error) {
        console.error('❌ Simple scraping failed:', error.message);
        throw error;
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (e) {
                console.error('Error closing browser:', e.message);
            }
        }
    }
}

// Enhanced stealth scraping with better anti-detection
async function getPlaceDetails(url) {
    // Check cache first
    if (storeCache.has(url)) {
        console.log('Using cached data for:', url);
        return storeCache.get(url);
    }

    // Try simple approach first (fastest)
    try {
        const result = await getPlaceDetailsSimple(url);
        if (result.name !== "Store Name Not Available") {
            return result;
        }
    } catch (error) {
        console.log('Simple approach failed, trying ultra stealth...');
    }

    // Try ultra stealth if simple fails
    try {
        const result = await getPlaceDetailsUltraStealth(url);
        if (result.name !== "Store Name Not Available") {
            return result;
        }
    } catch (error) {
        console.log('Ultra stealth failed, trying alternative approach...');
    }

    // Finally try the alternative approach
    return await getPlaceDetailsAlternative(url);
}const express = require('express');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();
const puppeteer = require('puppeteer');

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc, setDoc } = require('firebase/firestore');

const app = express();
const PORT = 3000;
console.clear();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

const firebaseConfig = {
    apiKey: process.env.firebaseAPI,
    authDomain: process.env.firebaseAuthDomain,
    databaseURL: process.env.firebaseDatabaseURL,
    projectId: process.env.firebaseProjectId,
    storageBucket: process.env.firebaseStorageBucket,
    messagingSenderId: process.env.firebaseMessagingSenderId,
    appId: process.env.firebaseAppId,
    measurementId: process.env.firebaseMeasurementId
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Cache to avoid re-scraping
const storeCache = new Map();

// Initialize purchases.txt if it doesn't exist
async function initializePurchasesFile() {
    try {
        await fs.access('./db/purchases.txt');
    } catch (error) {
        const header = 'TIMESTAMP|CUSTOMER_USERNAME|STORE_USERNAME|ITEM_NAME|QUANTITY|UNIT_PRICE|TOTAL_AMOUNT|CUSTOMER_EMAIL|STORE_NAME|TRANSACTION_ID\n';
        await fs.writeFile('./db/purchases.txt', header);
        console.log('Created purchases.txt file');
    }
}

initializePurchasesFile().catch(console.error);

// Enhanced stealth scraping with better anti-detection
async function getPlaceDetails(url) {
    // Check cache first
    if (storeCache.has(url)) {
        console.log('Using cached data for:', url);
        return storeCache.get(url);
    }

    // Try the most aggressive stealth approach first
    try {
        const result = await getPlaceDetailsUltraStealth(url);
        if (result.name !== "Store Name Not Available") {
            return result;
        }
    } catch (error) {
        console.log('Ultra stealth failed, trying alternative approach...');
    }

    return await getPlaceDetailsAlternative(url);
}

// Ultra stealth function with maximum evasion
async function getPlaceDetailsUltraStealth(url) {
    let browser;
    try {
        console.log('🥷 Launching ultra-stealth browser...');
        
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-features=TranslateUI,BlinkGenPropertyTrees,VizDisplayCompositor',
                '--disable-blink-features=AutomationControlled',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-default-apps',
                '--disable-component-extensions-with-background-pages',
                '--disable-client-side-phishing-detection',
                '--disable-sync',
                '--disable-background-networking',
                '--disable-software-rasterizer',
                '--mute-audio',
                '--no-default-browser-check',
                '--autoplay-policy=user-gesture-required',
                '--disable-features=AudioServiceOutOfProcess',
                '--window-size=1366,768',
                '--user-data-dir=/tmp/chrome-user-data-' + Math.random().toString(36).substring(7)
            ],
            ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=IdleDetection'],
            defaultViewport: { width: 1366, height: 768 }
        });

        const page = await browser.newPage();

        // Ultra-stealth page setup
        await page.evaluateOnNewDocument(() => {
            // Completely remove automation traces
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => Array.from({ length: 4 }, (_, i) => ({})) });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
            Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
            Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
            
            // Mock Chrome runtime
            if (!window.chrome) {
                window.chrome = {};
            }
            window.chrome.runtime = {
                onConnect: undefined,
                onMessage: undefined
            };

            // Remove automation flags
            delete navigator.__proto__.webdriver;
            
            // Mock permissions API
            const originalQuery = window.navigator.permissions?.query;
            if (originalQuery) {
                window.navigator.permissions.query = (params) => {
                    if (params.name === 'notifications') {
                        return Promise.resolve({ state: 'default' });
                    }
                    return originalQuery(params);
                };
            }
        });

        // Set ultra-realistic user agent and headers
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await page.setExtraHTTPHeaders({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'DNT': '1',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        });

        // Simulate human behavior with mouse movements
        await page.evaluateOnNewDocument(() => {
            // Add random mouse movements
            let mouseX = Math.random() * window.innerWidth;
            let mouseY = Math.random() * window.innerHeight;
            
            const moveInterval = setInterval(() => {
                mouseX += (Math.random() - 0.5) * 50;
                mouseY += (Math.random() - 0.5) * 50;
                
                mouseX = Math.max(0, Math.min(window.innerWidth, mouseX));
                mouseY = Math.max(0, Math.min(window.innerHeight, mouseY));
                
                document.dispatchEvent(new MouseEvent('mousemove', {
                    clientX: mouseX,
                    clientY: mouseY
                }));
            }, 1000 + Math.random() * 2000);

            // Clear interval after 10 seconds
            setTimeout(() => clearInterval(moveInterval), 10000);
        });

        console.log(`🌐 Navigating to: ${url}`);
        
        // Navigate with human-like delay
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        
        const response = await page.goto(url, { 
            waitUntil: 'networkidle0', 
            timeout: 25000 
        });

        if (!response || !response.ok()) {
            throw new Error(`Navigation failed with status: ${response?.status()}`);
        }

        console.log('✅ Page loaded successfully');

        // Wait for content with human-like pauses
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

        // Multiple attempts to find elements
        let elementFound = false;
        const attempts = 3;
        
        for (let i = 0; i < attempts; i++) {
            try {
                await page.waitForSelector('h1, [data-item-id], .DUwDvf, .qrShPb', { 
                    timeout: 3000,
                    visible: true 
                });
                elementFound = true;
                console.log(`✅ Elements found on attempt ${i + 1}`);
                break;
            } catch (e) {
                console.log(`⏳ Attempt ${i + 1} failed, waiting...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (!elementFound) {
            console.log('⚠️ No specific elements found, proceeding with extraction...');
        }

        // Enhanced data extraction with debugging
        const data = await page.evaluate(() => {
            console.log('🔍 Starting enhanced data extraction...');
            
            // Debug: Log page title and URL
            console.log('Page title:', document.title);
            console.log('Current URL:', window.location.href);
            
            // Get page content for debugging
            const bodyText = document.body?.innerText?.substring(0, 500) || 'No body text';
            console.log('Body preview:', bodyText);

            // Enhanced name extraction with more selectors
            const nameSelectors = [
                'h1.DUwDvf',
                'h1[data-attrid="title"]',
                '.x3AX1-LfntMc-header-title-title',
                'h1.qrShPb',
                '[data-attrid="title"] h1',
                'h1.SPZz6b',
                'h1',
                '.qrShPb span',
                '[data-value="title"]',
                '.fontHeadlineSmall',
                '.fontHeadlineLarge'
            ];

            let name = null;
            for (const selector of nameSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    if (el?.innerText?.trim() && 
                        !el.innerText.includes('Google Maps') && 
                        !el.innerText.includes('Search') &&
                        el.innerText.length > 2) {
                        name = el.innerText.trim();
                        console.log(`📍 Found name with ${selector}:`, name);
                        break;
                    }
                }
                if (name) break;
            }

            // Enhanced address extraction
            const addressSelectors = [
                'button[data-item-id="address"] div.Io6YTe',
                'button[data-item-id="address"] .Io6YTe',
                '[data-item-id="address"] .fontBodyMedium',
                '[data-item-id="address"]',
                '.Io6YTe',
                '[data-attrid*="address"] .LrzXr',
                '.LrzXr',
                '.rogA2c .fontBodyMedium',
                '[data-value="address"]',
                '.CsEnBe',
                '.fontBodyMedium'
            ];

            let address = null;
            for (const selector of addressSelectors) {
                const el = document.querySelector(selector);
                if (el?.innerText?.trim() && el.innerText.length > 5) {
                    address = el.innerText.trim();
                    console.log(`📍 Found address with ${selector}:`, address);
                    break;
                }
            }

            // Enhanced rating extraction
            const ratingSelectors = [
                'div.F7nice span[aria-hidden="true"]',
                '.F7nice span',
                'span.yi40Hd.YrbPuc',
                '.MW4etd',
                '[data-attrid*="rating"] span',
                '.Aq14fc .yi40Hd',
                '.jANrlb .fontDisplayLarge',
                '.ceNzKf'
            ];

            let rating = null;
            for (const selector of ratingSelectors) {
                const el = document.querySelector(selector);
                if (el?.innerText?.trim()) {
                    const ratingText = el.innerText.trim();
                    const ratingMatch = ratingText.match(/^\d+\.?\d*$/);
                    if (ratingMatch && parseFloat(ratingMatch[0]) <= 5) {
                        rating = ratingMatch[0];
                        console.log(`⭐ Found rating with ${selector}:`, rating);
                        break;
                    }
                }
            }

            const result = {
                name: name || "Store Name Not Available",
                address: address || "Address not available", 
                rating: rating || "N/A"
            };

            console.log('🎯 Final extraction result:', result);
            return result;
        });

        console.log('🎉 Successfully extracted data:', data);
        
        // Cache and return
        storeCache.set(url, data);
        await browser.close();
        return data;

    } catch (error) {
        console.error(`❌ Ultra stealth failed:`, error.message);
        throw error;
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (e) {
                console.error('Error closing browser:', e.message);
            }
        }
    }
}

// Alternative scraping function using a different approach
async function getPlaceDetailsAlternative(url) {
    if (storeCache.has(url)) {
        return storeCache.get(url);
    }

    let browser;
    try {
        console.log('Launching browser with maximum stealth...');
        
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-features=TranslateUI,BlinkGenPropertyTrees',
                '--disable-blink-features=AutomationControlled',
                '--no-default-browser-check',
                '--disable-hang-monitor',
                '--disable-prompt-on-repost',
                '--disable-sync',
                '--disable-translate',
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--disable-component-extensions-with-background-pages',
                '--use-gl=swiftshader',
                '--window-size=1920,1080'
            ],
            ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=IdleDetection'],
            defaultViewport: null
        });

        const page = await browser.newPage();

        // Maximum stealth setup
        await page.evaluateOnNewDocument(() => {
            // Remove webdriver traces
            delete Object.getPrototypeOf(navigator).webdriver;
            
            // Mock chrome object
            window.chrome = {
                runtime: {},
                loadTimes: function() {},
                csi: function() {},
                app: {}
            };

            // Mock permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );

            // Override the `plugins` property to use a custom getter
            Object.defineProperty(navigator, 'plugins', {
                get: function() {
                    return [
                        {
                            0: {
                                type: "application/x-google-chrome-pdf",
                                suffixes: "pdf",
                                description: "Portable Document Format",
                                enabledPlugin: Plugin
                            },
                            description: "Portable Document Format",
                            filename: "internal-pdf-viewer",
                            length: 1,
                            name: "Chrome PDF Plugin"
                        }
                    ];
                }
            });

            // Override the `mimeTypes` property
            Object.defineProperty(navigator, 'mimeTypes', {
                get: function() {
                    return [
                        {
                            type: "application/pdf",
                            suffixes: "pdf",
                            description: "",
                            enabledPlugin: {
                                description: "Portable Document Format",
                                filename: "internal-pdf-viewer",
                                length: 1,
                                name: "Chrome PDF Plugin"
                            }
                        }
                    ];
                }
            });
        });

        // Set more realistic headers
        await page.setExtraHTTPHeaders({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        // Random delay before navigation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

        // Navigate to the page
        const response = await page.goto(url, { 
            waitUntil: 'networkidle2', 
            timeout: 30000 
        });

        if (!response) {
            throw new Error('Failed to load page');
        }

        console.log('Page loaded, status:', response.status());

        // Wait for dynamic content
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Try to wait for specific elements
        try {
            await Promise.race([
                page.waitForSelector('h1.DUwDvf', { timeout: 5000 }),
                page.waitForSelector('h1', { timeout: 5000 }),
                page.waitForSelector('.qrShPb', { timeout: 5000 })
            ]);
        } catch (selectorError) {
            console.log('Selectors not found, proceeding anyway...');
        }

        // Enhanced data extraction
        const data = await page.evaluate(() => {
            console.log('Starting data extraction...');
            
            // Get all possible elements for debugging
            const allH1 = Array.from(document.querySelectorAll('h1')).map(el => el.innerText);
            const allWithAddress = Array.from(document.querySelectorAll('[data-item-id*="address"]')).map(el => el.innerText);
            
            console.log('Found H1 elements:', allH1);
            console.log('Found address elements:', allWithAddress);

            // Try multiple selectors for name
            const nameSelectors = [
                'h1.DUwDvf',
                'h1[data-attrid="title"]', 
                '.x3AX1-LfntMc-header-title-title',
                'h1.qrShPb',
                '[data-attrid="title"] h1',
                'h1',
                '.SPZz6b h1',
                '.qrShPb span'
            ];

            let name = null;
            for (const selector of nameSelectors) {
                const el = document.querySelector(selector);
                if (el && el.innerText && el.innerText.trim() && !el.innerText.includes('Google Maps')) {
                    name = el.innerText.trim();
                    console.log(`Found name with selector ${selector}:`, name);
                    break;
                }
            }

            // Try multiple selectors for address
            const addressSelectors = [
                'button[data-item-id="address"] div.Io6YTe',
                'button[data-item-id="address"] .Io6YTe',
                '[data-item-id="address"] .fontBodyMedium',
                '.Io6YTe',
                '[data-attrid*="address"] .LrzXr',
                '.LrzXr',
                '.rogA2c .fontBodyMedium',
                '[data-value="address"]'
            ];

            let address = null;
            for (const selector of addressSelectors) {
                const el = document.querySelector(selector);
                if (el && el.innerText && el.innerText.trim()) {
                    address = el.innerText.trim();
                    console.log(`Found address with selector ${selector}:`, address);
                    break;
                }
            }

            // Try multiple selectors for rating
            const ratingSelectors = [
                'div.F7nice span[aria-hidden="true"]',
                '.F7nice span',
                'span.yi40Hd.YrbPuc',
                '.MW4etd',
                '[data-attrid*="rating"] span',
                '.Aq14fc .yi40Hd',
                '.jANrlb .fontDisplayLarge'
            ];

            let rating = null;
            for (const selector of ratingSelectors) {
                const el = document.querySelector(selector);
                if (el && el.innerText && el.innerText.trim()) {
                    const ratingText = el.innerText.trim();
                    const ratingMatch = ratingText.match(/^\d+\.?\d*$/);
                    if (ratingMatch) {
                        rating = ratingMatch[0];
                        console.log(`Found rating with selector ${selector}:`, rating);
                        break;
                    }
                }
            }

            const result = {
                name: name || "Store Name Not Available",
                address: address || "Address not available", 
                rating: rating || "N/A"
            };

            console.log('Final extracted data:', result);
            return result;
        });

        console.log('Successfully extracted data:', data);
        
        // Cache the result
        storeCache.set(url, data);
        return data;

    } catch (error) {
        console.error(`Error in alternative scraping:`, error.message);
        
        // Final fallback - extract from URL
        try {
            const placeMatch = url.match(/place\/([^/@]+)/);
            const nameFromUrl = placeMatch ? decodeURIComponent(placeMatch[1]).replace(/\+/g, ' ') : 'Unknown Store';
            
            const fallbackData = {
                name: nameFromUrl,
                address: "Address not available",
                rating: "N/A"
            };
            
            console.log('Using URL fallback data:', fallbackData);
            storeCache.set(url, fallbackData);
            return fallbackData;
        } catch (urlError) {
            const errorData = {
                name: "Store Name Not Available",
                address: "Address not available", 
                rating: "N/A"
            };
            storeCache.set(url, errorData);
            return errorData;
        }
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (e) {
                console.error('Error closing browser:', e.message);
            }
        }
    }
}

// Use the enhanced scraping function with fallback chain
app.get('/getPlaceDetails', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).send('Missing URL parameter');
    }

    try {
        console.log('🎯 Getting place details for:', url);
        const placeDetails = await getPlaceDetails(url);
        console.log('📊 Returning place details:', placeDetails);
        res.json(placeDetails);
    } catch (error) {
        console.error('❌ Error fetching place details:', error);
        res.status(500).json({ 
            error: 'Internal Server Error',
            details: error.message 
        });
    }
});

// LOGIN
app.get('/login', async (req, res) => {
    const { userName, password, userType } = req.query;
    let ref;
    if (userType === 'store') {
        ref = collection(db, 'sfhs-code', 'accounts', 'stores');
    } else if (userType === 'customer') {
        ref = collection(db, 'sfhs-code', 'accounts', 'users');
    }

    try {
        const q = query(ref, where('username', '==', userName), where('password', '==', password));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            res.status(401).send('Unauthorized');
        } else {
            res.status(200).send('Login successful');
        }
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Register regular user
app.post('/registerUser', async (req, res) => {
    const { userName, password, fullName, email } = req.body;

    if (!userName || !password || !fullName || !email) {
        return res.status(400).send('Missing required fields');
    }

    try {
        const userRef = collection(db, 'sfhs-code', 'accounts', 'users');
        const q = query(userRef, where('username', '==', userName));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            return res.status(400).send('Username already exists');
        }

        await addDoc(userRef, {
            username: userName,
            password,
            fullName,
            email,
            userType: 'customer'
        });

        res.send('User registration successful');
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/registerStore', async (req, res) => {
    let { url, username, password, storeName } = req.body;

    if (!url) {
        return res.status(400).send('Missing URL');
    }
    if (!storeName) {
        const data = await getPlaceDetailsAlternative(url);
        storeName = data.name;
    }

    try {
        const storeRef = collection(db, 'sfhs-code', 'accounts', 'stores');
        const urlQuery = query(storeRef, where('url', '==', url));
        const urlSnapshot = await getDocs(urlQuery);
        if (!urlSnapshot.empty) {
            return res.status(400).send('Store with this URL already exists');
        }

        const usernameQuery = query(storeRef, where('username', '==', username));
        const usernameSnapshot = await getDocs(usernameQuery);
        if (!usernameSnapshot.empty) {
            return res.status(400).send('Store with this username already exists');
        }

        await addDoc(storeRef, { username, password, url, storeName });
        res.send('Store registration successful');
    } catch (error) {
        console.error('Error registering store:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Enhanced store loading with better error handling
app.get('/getStores', async (req, res) => {
    try {
        const storeRef = collection(db, 'sfhs-code', 'accounts', 'stores');
        const snapshot = await getDocs(storeRef);

        if (snapshot.empty) {
            return res.json([]);
        }

        const stores = [];
        let successCount = 0;
        let failCount = 0;

        console.log(`Processing ${snapshot.docs.length} stores...`);

        // Process stores one at a time with better error handling
        for (const docSnap of snapshot.docs) {
            const storeData = docSnap.data();
            console.log(`\n--- Processing store: ${storeData.username} ---`);
            
            if (storeData.url) {
                try {
                    const details = await getPlaceDetailsAlternative(storeData.url);
                    
                    stores.push({
                        id: docSnap.id,
                        username: storeData.username,
                        url: storeData.url,
                        name: details.name,
                        address: details.address,
                        rating: details.rating
                    });
                    
                    successCount++;
                    console.log(`✓ Success: ${storeData.username} -> ${details.name}`);
                    
                    // Delay between requests to be respectful
                    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
                    
                } catch (error) {
                    console.error(`✗ Failed: ${storeData.username} - ${error.message}`);
                    failCount++;
                    
                    // Use store name from registration if scraping fails
                    stores.push({
                        id: docSnap.id,
                        username: storeData.username,
                        url: storeData.url,
                        name: storeData.storeName || 'Unknown Store',
                        address: 'Address not available',
                        rating: 'N/A'
                    });
                }
            } else {
                console.log(`⚠ No URL for store: ${storeData.username}`);
                stores.push({
                    id: docSnap.id,
                    username: storeData.username,
                    url: '',
                    name: storeData.storeName || 'Unknown Store',
                    address: 'No URL provided',
                    rating: 'N/A'
                });
            }
        }

        console.log(`\n=== Summary ===`);
        console.log(`Total stores: ${stores.length}`);
        console.log(`Successful scrapes: ${successCount}`);
        console.log(`Failed scrapes: ${failCount}`);
        console.log(`Cache size: ${storeCache.size}`);

        res.json(stores);

    } catch (error) {
        console.error('Error fetching stores:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Clear cache endpoint for debugging
app.post('/clearCache', (req, res) => {
    storeCache.clear();
    console.log('Cache cleared');
    res.send('Cache cleared successfully');
});

// Debug endpoint to check cache
app.get('/debugCache', (req, res) => {
    const cacheData = {};
    for (const [key, value] of storeCache.entries()) {
        cacheData[key] = value;
    }
    res.json({
        cacheSize: storeCache.size,
        cacheData
    });
});

// ===== STOCK MANAGEMENT ENDPOINTS =====
app.get('/getStock', async (req, res) => {
    const { username } = req.query;
    if (!username) {
        return res.status(400).send('Missing username parameter');
    }

    try {
        const stockRef = collection(db, 'sfhs-code', 'stock', username);
        const snapshot = await getDocs(stockRef);
        const stockItems = [];
        snapshot.forEach((doc) => {
            stockItems.push({ id: doc.id, ...doc.data() });
        });
        res.json(stockItems);
    } catch (error) {
        console.error('Error fetching stock:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/getStoreStock', async (req, res) => {
    const { storeUsername } = req.query;
    if (!storeUsername) {
        return res.status(400).send('Missing storeUsername parameter');
    }

    try {
        const stockRef = collection(db, 'sfhs-code', 'stock', storeUsername);
        const snapshot = await getDocs(stockRef);
        const stockItems = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            stockItems.push({
                id: doc.id,
                name: data.name,
                price: data.price,
                quantity: data.quantity,
                image: data.image,
                addedDate: data.addedDate
            });
        });
        res.json(stockItems);
    } catch (error) {
        console.error('Error fetching store stock:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/addStock', async (req, res) => {
    const { username, name, quantity, price, image } = req.body;
    if (!username || !name || !quantity || !price) {
        return res.status(400).send('Missing required fields');
    }

    try {
        const stockRef = collection(db, 'sfhs-code', 'stock', username);
        const existingQuery = query(stockRef, where('name', '==', name));
        const existingSnapshot = await getDocs(existingQuery);

        if (!existingSnapshot.empty) {
            const existingDoc = existingSnapshot.docs[0];
            const existingData = existingDoc.data();

            await updateDoc(doc(db, 'sfhs-code', 'stock', username, existingDoc.id), {
                quantity: existingData.quantity + parseInt(quantity),
                price: parseFloat(price),
                image: image || existingData.image,
                updatedDate: new Date().toISOString()
            });
            res.send('Stock updated successfully');
        } else {
            await addDoc(stockRef, {
                name,
                quantity: parseInt(quantity),
                price: parseFloat(price),
                image: image || null,
                addedDate: new Date().toISOString()
            });
            res.send('Stock added successfully');
        }
    } catch (error) {
        console.error('Error adding/updating stock:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/removeStock', async (req, res) => {
    const { username, itemId, quantity } = req.body;
    if (!username || !itemId || !quantity) {
        return res.status(400).send('Missing required fields');
    }

    try {
        const itemRef = doc(db, 'sfhs-code', 'stock', username, itemId);
        const itemDoc = await getDocs(query(collection(db, 'sfhs-code', 'stock', username), where('__name__', '==', itemId)));

        if (itemDoc.empty) {
            return res.status(404).send('Item not found');
        }

        const itemData = itemDoc.docs[0].data();
        const newQuantity = itemData.quantity - parseInt(quantity);

        if (newQuantity <= 0) {
            await deleteDoc(itemRef);
            res.send('Item removed from stock');
        } else {
            await updateDoc(itemRef, {
                quantity: newQuantity,
                updatedDate: new Date().toISOString()
            });
            res.send('Stock quantity updated');
        }
    } catch (error) {
        console.error('Error removing stock:', error);
        res.status(500).send('Internal Server Error');
    }
});


// ================Purchases===================
// Fixed backend endpoints for purchase handling
// Add these to replace the existing purchase endpoints in your server.js

// NEW: Process cart purchase with multiple items
app.post('/processCartPurchase', async (req, res) => {
    const { customerUsername, storeUsername, items, customerEmail } = req.body;

    console.log('Processing cart purchase:', { customerUsername, storeUsername, items: items?.length, customerEmail });

    if (!customerUsername || !storeUsername || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).send('Missing required fields or empty cart');
    }

    try {
        // Get store details
        const storeRef = collection(db, 'sfhs-code', 'accounts', 'stores');
        const storeQuery = query(storeRef, where('username', '==', storeUsername));
        const storeSnapshot = await getDocs(storeQuery);
        const storeData = storeSnapshot.docs[0]?.data();
        const storeName = storeData?.storeName || 'Unknown Store';

        // Generate single transaction ID for the entire cart
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date().toISOString();

        console.log('Cart purchase details:', {
            transactionId,
            timestamp,
            storeName,
            itemCount: items.length
        });

        // Validate and process each item
        const processedItems = [];
        let totalCartAmount = 0;
        const stockRef = collection(db, 'sfhs-code', 'stock', storeUsername);

        // First, validate all items and check stock
        for (const item of items) {
            const { itemId, quantity, name, price } = item;
            
            if (!itemId || !quantity || quantity <= 0) {
                throw new Error(`Invalid item data: ${JSON.stringify(item)}`);
            }

            // Get current stock from Firebase
            const itemDoc = await getDocs(query(stockRef, where('__name__', '==', itemId)));
            
            if (itemDoc.empty) {
                throw new Error(`Item not found: ${name || itemId}`);
            }

            const itemData = itemDoc.docs[0].data();
            const requestedQuantity = parseInt(quantity);

            console.log(`Validating item ${name}:`, {
                requested: requestedQuantity,
                available: itemData.quantity,
                price: itemData.price
            });

            if (itemData.quantity < requestedQuantity) {
                throw new Error(`Insufficient stock for ${itemData.name}. Available: ${itemData.quantity}, Requested: ${requestedQuantity}`);
            }

            // Calculate item total
            const unitPrice = parseFloat(itemData.price);
            const itemTotal = unitPrice * requestedQuantity;
            totalCartAmount += itemTotal;

            processedItems.push({
                docRef: itemDoc.docs[0],
                itemData,
                requestedQuantity,
                unitPrice,
                itemTotal,
                originalItem: item
            });
        }

        console.log('All items validated. Total cart amount:', totalCartAmount);

        // If validation successful, update stock and create purchase records
        const purchaseRecords = [];

        for (const processedItem of processedItems) {
            const { docRef, itemData, requestedQuantity, unitPrice, itemTotal } = processedItem;

            // Update stock in Firebase
            const newQuantity = itemData.quantity - requestedQuantity;
            if (newQuantity <= 0) {
                await deleteDoc(doc(db, 'sfhs-code', 'stock', storeUsername, docRef.id));
                console.log(`Item ${itemData.name} removed from stock (quantity became 0)`);
            } else {
                await updateDoc(doc(db, 'sfhs-code', 'stock', storeUsername, docRef.id), {
                    quantity: newQuantity,
                    updatedDate: timestamp
                });
                console.log(`Stock updated for ${itemData.name}: ${itemData.quantity} -> ${newQuantity}`);
            }

            // Create purchase record for this item
            const purchaseRecord = `${timestamp}|${customerUsername}|${storeUsername}|${itemData.name}|${requestedQuantity}|${unitPrice}|${itemTotal}|${customerEmail || 'N/A'}|${storeName}|${transactionId}\n`;
            
            purchaseRecords.push(purchaseRecord);
        }

        console.log(`Writing ${purchaseRecords.length} purchase records`);

        // Ensure directory exists
        try {
            await fs.access('./db');
        } catch (error) {
            await fs.mkdir('./db', { recursive: true });
        }

        // Write all purchase records to file
        for (const record of purchaseRecords) {
            await fs.appendFile('./db/purchases.txt', record);
        }

        console.log('All purchase records written successfully');

        const response = {
            success: true,
            message: 'Cart purchase completed successfully',
            transactionId,
            totalAmount: totalCartAmount,
            itemCount: processedItems.length,
            items: processedItems.map(item => ({
                name: item.itemData.name,
                quantity: item.requestedQuantity,
                unitPrice: item.unitPrice,
                total: item.itemTotal
            }))
        };

        console.log('Sending cart purchase response:', response);
        res.json(response);

    } catch (error) {
        console.error('Error processing cart purchase:', error);
        res.status(500).send(`Internal Server Error: ${error.message}`);
    }
});

// ENHANCED: Get store purchases with better cart grouping support
app.get('/getStorePurchases', async (req, res) => {
    const { storeUsername } = req.query;
    if (!storeUsername) {
        return res.status(400).send('Missing storeUsername parameter');
    }

    console.log(`Loading purchases for store: ${storeUsername}`);

    try {
        // Check if purchases.txt exists
        try {
            await fs.access('./db/purchases.txt');
        } catch (error) {
            console.log('purchases.txt does not exist, creating empty file');
            const header = 'TIMESTAMP|CUSTOMER_USERNAME|STORE_USERNAME|ITEM_NAME|QUANTITY|UNIT_PRICE|TOTAL_AMOUNT|CUSTOMER_EMAIL|STORE_NAME|TRANSACTION_ID\n';
            await fs.writeFile('./db/purchases.txt', header);
            return res.json([]);
        }

        const data = await fs.readFile('./db/purchases.txt', 'utf8');
        console.log(`Raw file content (first 500 chars): ${data.substring(0, 500)}`);

        const lines = data.split('\n');
        console.log(`Total lines in file: ${lines.length}`);

        // Skip header line (first line) and filter empty lines
        const dataLines = lines.slice(1).filter(line => line.trim());
        console.log(`Data lines after filtering: ${dataLines.length}`);

        // Filter for the specific store and parse
        const storePurchases = [];

        for (let i = 0; i < dataLines.length; i++) {
            const line = dataLines[i].trim();
            if (!line) continue;

            console.log(`Processing line ${i + 1}: ${line}`);

            try {
                const parts = line.split('|');
                console.log(`Split into ${parts.length} parts:`, parts);

                if (parts.length !== 10) {
                    console.warn(`Line ${i + 1} has incorrect number of parts (${parts.length}), skipping`);
                    continue;
                }

                const [timestamp, customerUsername, storeUsernameFromFile, itemName, quantity, unitPrice, totalAmount, customerEmail, storeName, transactionId] = parts;

                // Check if this purchase belongs to the requested store
                if (storeUsernameFromFile === storeUsername) {
                    const purchase = {
                        timestamp: timestamp.trim(),
                        customerUsername: customerUsername.trim(),
                        storeUsername: storeUsernameFromFile.trim(),
                        itemName: itemName.trim(),
                        quantity: parseInt(quantity.trim()) || 0,
                        unitPrice: parseFloat(unitPrice.trim()) || 0,
                        totalAmount: parseFloat(totalAmount.trim()) || 0,
                        customerEmail: customerEmail.trim(),
                        storeName: storeName.trim(),
                        transactionId: transactionId.trim()
                    };

                    console.log(`Adding purchase for ${storeUsername}:`, purchase);
                    storePurchases.push(purchase);
                }
            } catch (parseError) {
                console.error(`Error parsing line ${i + 1}:`, parseError);
                console.error(`Line content: ${line}`);
            }
        }

        // Sort by timestamp (most recent first) and limit to last 100
        const sortedPurchases = storePurchases
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 100);

        console.log(`Returning ${sortedPurchases.length} purchases for store ${storeUsername}`);
        
        // Group by transaction ID to identify cart orders
        const transactionGroups = {};
        sortedPurchases.forEach(purchase => {
            const txnId = purchase.transactionId;
            if (!transactionGroups[txnId]) {
                transactionGroups[txnId] = [];
            }
            transactionGroups[txnId].push(purchase);
        });

        const cartOrders = Object.values(transactionGroups).filter(group => group.length > 1).length;
        const singleItems = Object.values(transactionGroups).filter(group => group.length === 1).length;

        console.log(`Cart orders: ${cartOrders}, Single items: ${singleItems}`);
        console.log('Sample purchase:', sortedPurchases[0]);

        res.json(sortedPurchases);

    } catch (error) {
        console.error('Error reading purchases file:', error);
        res.status(500).send(`Internal Server Error: ${error.message}`);
    }
});

// ENHANCED: Get customer purchases with cart grouping
app.get('/getCustomerPurchases', async (req, res) => {
    const { customerUsername } = req.query;
    if (!customerUsername) {
        return res.status(400).send('Missing customerUsername parameter');
    }

    console.log(`Loading purchases for customer: ${customerUsername}`);

    try {
        // Check if purchases.txt exists
        try {
            await fs.access('./db/purchases.txt');
        } catch (error) {
            console.log('purchases.txt does not exist, returning empty array');
            return res.json([]);
        }

        const data = await fs.readFile('./db/purchases.txt', 'utf8');
        const lines = data.split('\n');

        // Skip header line and filter empty lines
        const dataLines = lines.slice(1).filter(line => line.trim());

        const customerPurchases = [];

        for (let i = 0; i < dataLines.length; i++) {
            const line = dataLines[i].trim();
            if (!line) continue;

            try {
                const parts = line.split('|');

                if (parts.length !== 10) {
                    console.warn(`Line ${i + 1} has incorrect number of parts, skipping`);
                    continue;
                }

                const [timestamp, customerUsernameFromFile, storeUsername, itemName, quantity, unitPrice, totalAmount, customerEmail, storeName, transactionId] = parts;

                // Check if this purchase belongs to the requested customer
                if (customerUsernameFromFile.trim() === customerUsername) {
                    customerPurchases.push({
                        timestamp: timestamp.trim(),
                        customerUsername: customerUsernameFromFile.trim(),
                        storeUsername: storeUsername.trim(),
                        itemName: itemName.trim(),
                        quantity: parseInt(quantity.trim()) || 0,
                        unitPrice: parseFloat(unitPrice.trim()) || 0,
                        totalAmount: parseFloat(totalAmount.trim()) || 0,
                        customerEmail: customerEmail.trim(),
                        storeName: storeName.trim(),
                        transactionId: transactionId.trim()
                    });
                }
            } catch (parseError) {
                console.error(`Error parsing line ${i + 1}:`, parseError);
            }
        }

        // Sort by timestamp (most recent first)
        const sortedPurchases = customerPurchases
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        console.log(`Returning ${sortedPurchases.length} purchases for customer ${customerUsername}`);
        res.json(sortedPurchases);

    } catch (error) {
        console.error('Error reading purchases file:', error);
        res.status(500).send(`Internal Server Error: ${error.message}`);
    }
});

// FIXED: Process purchase with better validation and logging
app.post('/processPurchase', async (req, res) => {
    const { customerUsername, storeUsername, itemId, quantity, customerEmail } = req.body;

    console.log('Processing purchase:', { customerUsername, storeUsername, itemId, quantity, customerEmail });

    if (!customerUsername || !storeUsername || !itemId || !quantity) {
        return res.status(400).send('Missing required fields');
    }

    try {
        // Get item details from Firebase
        const stockRef = collection(db, 'sfhs-code', 'stock', storeUsername);
        const itemDoc = await getDocs(query(stockRef, where('__name__', '==', itemId)));

        if (itemDoc.empty) {
            console.error('Item not found:', itemId);
            return res.status(404).send('Item not found');
        }

        const itemData = itemDoc.docs[0].data();
        const requestedQuantity = parseInt(quantity);

        console.log('Item data:', itemData);
        console.log('Requested quantity:', requestedQuantity);

        if (itemData.quantity < requestedQuantity) {
            console.error('Insufficient stock:', { available: itemData.quantity, requested: requestedQuantity });
            return res.status(400).send('Insufficient stock');
        }

        // Get store details
        const storeRef = collection(db, 'sfhs-code', 'accounts', 'stores');
        const storeQuery = query(storeRef, where('username', '==', storeUsername));
        const storeSnapshot = await getDocs(storeQuery);
        const storeData = storeSnapshot.docs[0]?.data();
        const storeName = storeData?.storeName || 'Unknown Store';

        // Calculate prices
        const unitPrice = parseFloat(itemData.price);
        const totalAmount = unitPrice * requestedQuantity;
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        console.log('Purchase details:', {
            itemName: itemData.name,
            unitPrice,
            totalAmount,
            transactionId,
            storeName
        });

        // Create purchase record - EXACT format to match your example
        const purchaseRecord = `${new Date().toISOString()}|${customerUsername}|${storeUsername}|${itemData.name}|${requestedQuantity}|${unitPrice}|${totalAmount}|${customerEmail || 'N/A'}|${storeName}|${transactionId}\n`;

        console.log('Writing purchase record:', purchaseRecord);

        // Ensure directory exists
        try {
            await fs.access('./db');
        } catch (error) {
            await fs.mkdir('./db', { recursive: true });
        }

        // Write to purchases.txt
        await fs.appendFile('./db/purchases.txt', purchaseRecord);
        console.log('Purchase record written successfully');

        // Update stock in Firebase
        const newQuantity = itemData.quantity - requestedQuantity;
        if (newQuantity <= 0) {
            await deleteDoc(doc(db, 'sfhs-code', 'stock', storeUsername, itemDoc.docs[0].id));
            console.log('Item removed from stock (quantity became 0)');
        } else {
            await updateDoc(doc(db, 'sfhs-code', 'stock', storeUsername, itemDoc.docs[0].id), {
                quantity: newQuantity,
                updatedDate: new Date().toISOString()
            });
            console.log(`Stock updated: ${itemData.quantity} -> ${newQuantity}`);
        }

        const response = {
            success: true,
            message: 'Purchase completed successfully',
            transactionId,
            totalAmount,
            itemName: itemData.name,
            quantity: requestedQuantity
        };

        console.log('Sending response:', response);
        res.json(response);

    } catch (error) {
        console.error('Error processing purchase:', error);
        res.status(500).send(`Internal Server Error: ${error.message}`);
    }
});

// DEBUG ENDPOINT: Get raw purchases file content
app.get('/debugPurchases', async (req, res) => {
    try {
        const data = await fs.readFile('./db/purchases.txt', 'utf8');
        const lines = data.split('\n');

        res.json({
            totalLines: lines.length,
            header: lines[0],
            sampleLines: lines.slice(1, 6), // First 5 data lines
            allLines: lines // Include all lines for complete debugging
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});