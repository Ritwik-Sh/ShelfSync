const express = require('express');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();
const puppeteer = require('puppeteer');

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc, setDoc } = require('firebase/firestore');

const app = express();
const PORT = 3000 || process.env.PORT;
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

// Simplified place details scraping
async function getPlaceDetails(url) {
    // Check cache first
    if (storeCache.has(url)) {
        return storeCache.get(url);
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });

        // Simple wait instead of waitForTimeout
        await new Promise(resolve => setTimeout(resolve, 3000));

        const data = await page.evaluate(() => {
            const name = document.querySelector('h1.DUwDvf')?.innerText ||
                document.querySelector('h1')?.innerText || "Unknown Store";

            const address = document.querySelector('button[data-item-id="address"] div.Io6YTe')?.innerText ||
                document.querySelector('.Io6YTe')?.innerText || "Address not available";

            const rating = document.querySelector('div.F7nice span[aria-hidden="true"]')?.innerText ||
                document.querySelector('.MW4etd')?.innerText || "N/A";

            return { name, address, rating };
        });

        // Cache the result
        storeCache.set(url, data);
        return data;

    } catch (error) {
        console.error(`Error scraping ${url}:`, error.message);
        // Return fallback data instead of throwing
        const fallbackData = {
            name: "Store Name Not Available",
            address: "Address not available",
            rating: "N/A"
        };
        storeCache.set(url, fallbackData);
        return fallbackData;
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

app.get('/getPlaceDetails', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).send('Missing URL parameter');
    }

    try {
        const placeDetails = await getPlaceDetails(url);
        res.json(placeDetails);
    } catch (error) {
        console.error('Error fetching place details:', error);
        res.status(500).send('Internal Server Error');
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
    const { userName, password, fullName, email, address } = req.body;

    // Updated validation to include address
    if (!userName || !password || !fullName || !email || !address) {
        return res.status(400).send('Missing required fields');
    }

    // Additional validation for address
    if (address.trim().length < 10) {
        return res.status(400).send('Address must be at least 10 characters long');
    }

    try {
        const userRef = collection(db, 'sfhs-code', 'accounts', 'users');
        const q = query(userRef, where('username', '==', userName));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            return res.status(400).send('Username already exists');
        }

        // Check if email already exists
        const emailQuery = query(userRef, where('email', '==', email));
        const emailSnapshot = await getDocs(emailQuery);
        
        if (!emailSnapshot.empty) {
            return res.status(400).send('Email already registered');
        }

        // Create new user with address field included
        await addDoc(userRef, {
            username: userName,
            password,
            fullName,
            email,
            address: address.trim(), // NEW: Store the address
            userType: 'customer',
            createdAt: new Date().toISOString()
        });

        console.log(`New customer registered: ${userName} with address: ${address.substring(0, 50)}...`);
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
        const data = await getPlaceDetails(url);
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

// FIXED: Get all registered stores - process one at a time instead of Promise.all
app.get('/getStores', async (req, res) => {
    try {
        const storeRef = collection(db, 'sfhs-code', 'accounts', 'stores');
        const snapshot = await getDocs(storeRef);

        if (snapshot.empty) {
            return res.json([]);
        }

        const stores = [];

        // Process stores ONE AT A TIME to avoid resource issues
        for (const doc of snapshot.docs) {
            const storeData = doc.data();
            if (storeData.url) {
                try {
                    console.log(`Scraping: ${storeData.username}`);
                    const details = await getPlaceDetails(storeData.url);
                    stores.push({
                        id: doc.id,
                        username: storeData.username,
                        url: storeData.url,
                        name: details.name,
                        address: details.address,
                        rating: details.rating
                    });
                    // Small delay between requests
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (error) {
                    console.error(`Error with store ${storeData.username}:`, error);
                    stores.push({
                        id: doc.id,
                        username: storeData.username,
                        url: storeData.url,
                        name: storeData.storeName || 'Unknown Store',
                        address: 'Address not available',
                        rating: 'N/A'
                    });
                }
            }
        }

        res.json(stores);

    } catch (error) {
        console.error('Error fetching stores:', error);
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