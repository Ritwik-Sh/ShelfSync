const express = require('express');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

// Try to import Playwright, but handle gracefully if not installed
let chromium = null;
let playwrightAvailable = false;

try {
    const playwright = require('playwright');
    chromium = playwright.chromium;
    playwrightAvailable = true;
    console.log('✅ Playwright loaded successfully');
} catch (error) {
    console.warn('⚠️ Playwright not available:', error.message);
    console.warn('📝 Run "npx playwright install" to enable web scraping');
}

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
        await fs.mkdir('./db', { recursive: true }).catch(() => {});
        await fs.writeFile('./db/purchases.txt', header);
        console.log('Created purchases.txt file');
    }
}

initializePurchasesFile().catch(console.error);

// Extract store name from Google Maps URL as fallback
function extractStoreNameFromUrl(url) {
    try {
        // Extract from place name in URL
        const placeMatch = url.match(/place\/([^/@]+)/);
        if (placeMatch) {
            return decodeURIComponent(placeMatch[1]).replace(/\+/g, ' ');
        }
        
        // Fallback to domain extraction
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch (error) {
        return 'Unknown Store';
    }
}

// Improved scraping function with better error handling
async function getPlaceDetailsImproved(url) {
    // Check cache first
    if (storeCache.has(url)) {
        console.log('📦 Using cached data for:', url);
        return storeCache.get(url);
    }

    // If Playwright is not available, use URL fallback immediately
    if (!playwrightAvailable) {
        console.log('⚡ Using URL fallback (Playwright not available)');
        const fallbackData = {
            name: extractStoreNameFromUrl(url),
            address: "Address not available (Playwright not installed)",
            rating: "N/A"
        };
        storeCache.set(url, fallbackData);
        return fallbackData;
    }

    let browser = null;
    try {
        console.log('🚀 Attempting to scrape:', url);
        
        // Launch browser with optimized settings
        browser = await chromium.launch({
            headless: true,
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
                '--disable-blink-features=AutomationControlled',
                '--disable-extensions',
                '--disable-plugins',
                '--window-size=1366,768'
            ],
            ignoreDefaultArgs: ['--enable-automation'],
            timeout: 15000 // 15 second browser launch timeout
        });

        const context = await browser.newContext({
            viewport: { width: 1366, height: 768 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            extraHTTPHeaders: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
        });

        const page = await context.newPage();

        // Add stealth scripts
        await page.addInitScript(() => {
            // Remove webdriver property
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            
            // Add chrome object
            if (!window.chrome) {
                window.chrome = { runtime: {} };
            }
            
            // Override plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => Array.from({ length: 4 }, () => ({}))
            });
        });

        console.log('🌐 Navigating to page...');
        
        // Navigate with shorter timeout
        const response = await page.goto(url, {
            waitUntil: 'domcontentloaded', // Changed from networkidle
            timeout: 15000 // Reduced timeout
        });

        if (!response || !response.ok()) {
            throw new Error(`Navigation failed: ${response?.status()}`);
        }

        console.log('⏳ Waiting for content...');
        
        // Wait for elements with timeout
        try {
            await page.waitForSelector('h1, [data-item-id], .DUwDvf', { 
                timeout: 8000,
                state: 'visible'
            });
            console.log('✅ Page elements found');
        } catch (selectorError) {
            console.log('⚠️ Specific selectors not found, proceeding with extraction...');
        }

        // Extract data with comprehensive selectors
        const data = await page.evaluate(() => {
            // Enhanced name extraction
            const nameSelectors = [
                'h1.DUwDvf',
                'h1[data-attrid="title"]',
                'h1.qrShPb',
                'h1.SPZz6b',
                'h1',
                '.fontHeadlineLarge',
                '.fontHeadlineSmall'
            ];

            let name = null;
            for (const selector of nameSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    const text = el?.innerText?.trim();
                    if (text && 
                        text.length > 2 && 
                        !text.includes('Google Maps') && 
                        !text.includes('Search')) {
                        name = text;
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
                '.Io6YTe',
                '.LrzXr',
                '.rogA2c .fontBodyMedium',
                '.CsEnBe',
                '.fontBodyMedium'
            ];

            let address = null;
            for (const selector of addressSelectors) {
                const el = document.querySelector(selector);
                const text = el?.innerText?.trim();
                if (text && text.length > 5) {
                    address = text;
                    break;
                }
            }

            // Enhanced rating extraction
            const ratingSelectors = [
                'div.F7nice span[aria-hidden="true"]',
                '.F7nice span',
                'span.yi40Hd.YrbPuc',
                '.MW4etd',
                '.Aq14fc .yi40Hd',
                '.jANrlb .fontDisplayLarge',
                '.ceNzKf'
            ];

            let rating = null;
            for (const selector of ratingSelectors) {
                const el = document.querySelector(selector);
                const text = el?.innerText?.trim();
                if (text) {
                    const ratingMatch = text.match(/^\d+\.?\d*$/);
                    if (ratingMatch && parseFloat(ratingMatch[0]) <= 5) {
                        rating = ratingMatch[0];
                        break;
                    }
                }
            }

            return {
                name: name || null,
                address: address || null,
                rating: rating || null
            };
        });

        await browser.close();
        browser = null;

        // Prepare final result
        const result = {
            name: data.name || extractStoreNameFromUrl(url),
            address: data.address || "Address not available",
            rating: data.rating || "N/A"
        };

        console.log('🎉 Successfully scraped:', result.name);
        storeCache.set(url, result);
        return result;

    } catch (error) {
        console.log(`❌ Scraping failed: ${error.message}`);
        
        // Use URL fallback
        const fallbackData = {
            name: extractStoreNameFromUrl(url),
            address: "Address not available",
            rating: "N/A"
        };
        
        console.log('🔄 Using fallback data:', fallbackData.name);
        storeCache.set(url, fallbackData);
        return fallbackData;
        
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.error('Error closing browser:', closeError.message);
            }
        }
    }
}

// Main function to get place details
async function getPlaceDetails(url) {
    return await getPlaceDetailsImproved(url);
}

// API endpoint for place details
app.get('/getPlaceDetails', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).send('Missing URL parameter');
    }

    try {
        const placeDetails = await getPlaceDetails(url);
        res.json(placeDetails);
    } catch (error) {
        console.error('Error in getPlaceDetails endpoint:', error);
        res.status(500).json({ 
            error: 'Internal Server Error',
            details: error.message 
        });
    }
});

// Enhanced store loading with better performance
app.get('/getStores', async (req, res) => {
    try {
        const storeRef = collection(db, 'sfhs-code', 'accounts', 'stores');
        const snapshot = await getDocs(storeRef);

        if (snapshot.empty) {
            return res.json([]);
        }

        const stores = [];
        console.log(`📊 Processing ${snapshot.docs.length} stores...`);

        // Process stores with limited concurrency to avoid overwhelming
        const processStore = async (docSnap) => {
            const storeData = docSnap.data();
            console.log(`\n🏪 Processing: ${storeData.username}`);
            
            if (storeData.url) {
                try {
                    const details = await getPlaceDetails(storeData.url);
                    
                    return {
                        id: docSnap.id,
                        username: storeData.username,
                        url: storeData.url,
                        name: details.name,
                        address: details.address,
                        rating: details.rating
                    };
                    
                } catch (error) {
                    console.error(`❌ Error processing ${storeData.username}:`, error.message);
                    
                    return {
                        id: docSnap.id,
                        username: storeData.username,
                        url: storeData.url,
                        name: storeData.storeName || extractStoreNameFromUrl(storeData.url),
                        address: 'Address not available',
                        rating: 'N/A'
                    };
                }
            } else {
                return {
                    id: docSnap.id,
                    username: storeData.username,
                    url: '',
                    name: storeData.storeName || 'Unknown Store',
                    address: 'No URL provided',
                    rating: 'N/A'
                };
            }
        };

        // Process stores with controlled concurrency
        const BATCH_SIZE = 3;
        const docs = snapshot.docs;
        
        for (let i = 0; i < docs.length; i += BATCH_SIZE) {
            const batch = docs.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(processStore);
            const batchResults = await Promise.all(batchPromises);
            stores.push(...batchResults);
            
            // Add delay between batches
            if (i + BATCH_SIZE < docs.length) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.log(`\n📈 Summary: ${stores.length} stores processed, cache size: ${storeCache.size}`);
        res.json(stores);

    } catch (error) {
        console.error('Error fetching stores:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        playwrightAvailable,
        cacheSize: storeCache.size,
        timestamp: new Date().toISOString()
    });
});

// Clear cache endpoint
app.post('/clearCache', (req, res) => {
    const oldSize = storeCache.size;
    storeCache.clear();
    console.log(`🗑️ Cache cleared: ${oldSize} items removed`);
    res.json({ message: 'Cache cleared successfully', previousSize: oldSize });
});

// Debug cache endpoint
app.get('/debugCache', (req, res) => {
    const cacheData = {};
    for (const [key, value] of storeCache.entries()) {
        cacheData[key] = value;
    }
    res.json({
        cacheSize: storeCache.size,
        playwrightAvailable,
        cacheData
    });
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
    
    if (!storeName && url) {
        try {
            const data = await getPlaceDetails(url);
            storeName = data.name;
        } catch (error) {
            storeName = extractStoreNameFromUrl(url);
        }
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

// ===== PURCHASE ENDPOINTS =====

// Process cart purchase with multiple items
app.post('/processCartPurchase', async (req, res) => {
    const { customerUsername, storeUsername, items, customerEmail } = req.body;

    console.log('🛒 Processing cart purchase:', { customerUsername, storeUsername, items: items?.length, customerEmail });

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

        // Generate transaction ID for the entire cart
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date().toISOString();

        console.log('🆔 Cart details:', { transactionId, storeName, itemCount: items.length });

        // Process each item
        const processedItems = [];
        let totalCartAmount = 0;
        const stockRef = collection(db, 'sfhs-code', 'stock', storeUsername);

        // Validate all items first
        for (const item of items) {
            const { itemId, quantity, name, price } = item;
            
            if (!itemId || !quantity || quantity <= 0) {
                throw new Error(`Invalid item data: ${JSON.stringify(item)}`);
            }

            const itemDoc = await getDocs(query(stockRef, where('__name__', '==', itemId)));
            
            if (itemDoc.empty) {
                throw new Error(`Item not found: ${name || itemId}`);
            }

            const itemData = itemDoc.docs[0].data();
            const requestedQuantity = parseInt(quantity);

            if (itemData.quantity < requestedQuantity) {
                throw new Error(`Insufficient stock for ${itemData.name}. Available: ${itemData.quantity}, Requested: ${requestedQuantity}`);
            }

            const unitPrice = parseFloat(itemData.price);
            const itemTotal = unitPrice * requestedQuantity;
            totalCartAmount += itemTotal;

            processedItems.push({
                docRef: itemDoc.docs[0],
                itemData,
                requestedQuantity,
                unitPrice,
                itemTotal
            });
        }

        console.log('✅ All items validated. Total: $' + totalCartAmount.toFixed(2));

        // Update stock and create purchase records
        const purchaseRecords = [];

        for (const processedItem of processedItems) {
            const { docRef, itemData, requestedQuantity, unitPrice, itemTotal } = processedItem;

            // Update stock
            const newQuantity = itemData.quantity - requestedQuantity;
            if (newQuantity <= 0) {
                await deleteDoc(doc(db, 'sfhs-code', 'stock', storeUsername, docRef.id));
                console.log(`📦 Removed ${itemData.name} from stock (quantity became 0)`);
            } else {
                await updateDoc(doc(db, 'sfhs-code', 'stock', storeUsername, docRef.id), {
                    quantity: newQuantity,
                    updatedDate: timestamp
                });
                console.log(`📦 Updated ${itemData.name}: ${itemData.quantity} → ${newQuantity}`);
            }

            // Create purchase record
            const purchaseRecord = `${timestamp}|${customerUsername}|${storeUsername}|${itemData.name}|${requestedQuantity}|${unitPrice}|${itemTotal}|${customerEmail || 'N/A'}|${storeName}|${transactionId}\n`;
            purchaseRecords.push(purchaseRecord);
        }

        // Write all purchase records
        for (const record of purchaseRecords) {
            await fs.appendFile('./db/purchases.txt', record);
        }

        console.log('📝 All purchase records written successfully');

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

        res.json(response);

    } catch (error) {
        console.error('❌ Cart purchase error:', error);
        res.status(500).send(`Internal Server Error: ${error.message}`);
    }
});

// Get store purchases
app.get('/getStorePurchases', async (req, res) => {
    const { storeUsername } = req.query;
    if (!storeUsername) {
        return res.status(400).send('Missing storeUsername parameter');
    }

    try {
        const data = await fs.readFile('./db/purchases.txt', 'utf8');
        const lines = data.split('\n');
        const dataLines = lines.slice(1).filter(line => line.trim());
        const storePurchases = [];

        for (const line of dataLines) {
            try {
                const parts = line.split('|');
                if (parts.length !== 10) continue;

                const [timestamp, customerUsername, storeUsernameFromFile, itemName, quantity, unitPrice, totalAmount, customerEmail, storeName, transactionId] = parts;

                if (storeUsernameFromFile === storeUsername) {
                    storePurchases.push({
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
                    });
                }
            } catch (parseError) {
                console.error('Error parsing purchase line:', parseError);
            }
        }

        const sortedPurchases = storePurchases
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 100);

        res.json(sortedPurchases);

    } catch (error) {
        console.error('Error reading purchases:', error);
        res.status(500).send(`Internal Server Error: ${error.message}`);
    }
});

// Get customer purchases
app.get('/getCustomerPurchases', async (req, res) => {
    const { customerUsername } = req.query;
    if (!customerUsername) {
        return res.status(400).send('Missing customerUsername parameter');
    }

    try {
        const data = await fs.readFile('./db/purchases.txt', 'utf8');
        const lines = data.split('\n');
        const dataLines = lines.slice(1).filter(line => line.trim());
        const customerPurchases = [];

        for (const line of dataLines) {
            try {
                const parts = line.split('|');
                if (parts.length !== 10) continue;

                const [timestamp, customerUsernameFromFile, storeUsername, itemName, quantity, unitPrice, totalAmount, customerEmail, storeName, transactionId] = parts;

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
                console.error('Error parsing purchase line:', parseError);
            }
        }

        const sortedPurchases = customerPurchases
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json(sortedPurchases);

    } catch (error) {
        console.error('Error reading purchases:', error);
        res.status(500).send(`Internal Server Error: ${error.message}`);
    }
});

// Process single item purchase
app.post('/processPurchase', async (req, res) => {
    const { customerUsername, storeUsername, itemId, quantity, customerEmail } = req.body;

    console.log('🛍️ Processing single purchase:', { customerUsername, storeUsername, itemId, quantity });

    if (!customerUsername || !storeUsername || !itemId || !quantity) {
        return res.status(400).send('Missing required fields');
    }

    try {
        // Get item details
        const stockRef = collection(db, 'sfhs-code', 'stock', storeUsername);
        const itemDoc = await getDocs(query(stockRef, where('__name__', '==', itemId)));

        if (itemDoc.empty) {
            return res.status(404).send('Item not found');
        }

        const itemData = itemDoc.docs[0].data();
        const requestedQuantity = parseInt(quantity);

        if (itemData.quantity < requestedQuantity) {
            return res.status(400).send('Insufficient stock');
        }

        // Get store details
        const storeRef = collection(db, 'sfhs-code', 'accounts', 'stores');
        const storeQuery = query(storeRef, where('username', '==', storeUsername));
        const storeSnapshot = await getDocs(storeQuery);
        const storeData = storeSnapshot.docs[0]?.data();
        const storeName = storeData?.storeName || 'Unknown Store';

        // Calculate totals
        const unitPrice = parseFloat(itemData.price);
        const totalAmount = unitPrice * requestedQuantity;
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create purchase record
        const purchaseRecord = `${new Date().toISOString()}|${customerUsername}|${storeUsername}|${itemData.name}|${requestedQuantity}|${unitPrice}|${totalAmount}|${customerEmail || 'N/A'}|${storeName}|${transactionId}\n`;

        // Write purchase record
        await fs.appendFile('./db/purchases.txt', purchaseRecord);

        // Update stock
        const newQuantity = itemData.quantity - requestedQuantity;
        if (newQuantity <= 0) {
            await deleteDoc(doc(db, 'sfhs-code', 'stock', storeUsername, itemDoc.docs[0].id));
        } else {
            await updateDoc(doc(db, 'sfhs-code', 'stock', storeUsername, itemDoc.docs[0].id), {
                quantity: newQuantity,
                updatedDate: new Date().toISOString()
            });
        }

        const response = {
            success: true,
            message: 'Purchase completed successfully',
            transactionId,
            totalAmount,
            itemName: itemData.name,
            quantity: requestedQuantity
        };

        res.json(response);

    } catch (error) {
        console.error('❌ Purchase error:', error);
        res.status(500).send(`Internal Server Error: ${error.message}`);
    }
});

// Debug endpoint for purchases file
app.get('/debugPurchases', async (req, res) => {
    try {
        const data = await fs.readFile('./db/purchases.txt', 'utf8');
        const lines = data.split('\n');

        res.json({
            totalLines: lines.length,
            header: lines[0],
            sampleLines: lines.slice(1, 6),
            fileSize: Buffer.byteLength(data, 'utf8'),
            lastModified: (await fs.stat('./db/purchases.txt')).mtime
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});