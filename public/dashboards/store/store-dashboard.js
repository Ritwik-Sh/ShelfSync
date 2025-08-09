// store-dashboard.js - Enhanced version with cart purchase display
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements - Fixed to match actual HTML IDs
    const elements = {
        usernameDisplay: document.getElementById('usernameDisplay'),
        stockList: document.getElementById('stockList'),
        stockOverview: document.getElementById('stockOverview'),
        purchasesContainer: document.getElementById('purchasesContainer'),
        totalAmount: document.getElementById('totalAmount'),
        alertContainer: document.getElementById('alertContainer'),
        addStockModal: document.getElementById('addStockModal'),
        removeStockModal: document.getElementById('removeStockModal'),
        addStockForm: document.getElementById('addStockForm'),
        removeStockForm: document.getElementById('removeStockForm'),
        selectItemToRemove: document.getElementById('selectItemToRemove'),
        availableQuantity: document.getElementById('availableQuantity'),
        itemNameInput: document.getElementById('itemName'),
        quantityInput: document.getElementById('itemQuantity'),
        priceInput: document.getElementById('itemPrice'),
        imageUrlInput: document.getElementById('itemImage'),
    };

    // Check if critical elements exist
    const checkElements = () => {
        const missing = [];
        Object.entries(elements).forEach(([key, element]) => {
            if (!element) {
                missing.push(key);
                console.error(`Missing element: ${key}`);
            }
        });
        if (missing.length > 0) {
            console.error('Missing DOM elements:', missing);
            showAlert(`Missing form elements: ${missing.join(', ')}. Check your HTML.`, 'error');
            return false;
        }
        return true;
    };

    // Application state
    let currentUser = null;
    let stockData = [];
    let purchasesData = [];

    // API endpoints with better error handling
    const API = {
        getStock: async (username) => {
            try {
                const response = await fetch(`/getStock?username=${username}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return await response.json();
            } catch (error) {
                console.error('API getStock error:', error);
                throw error;
            }
        },
        addStock: async (data) => {
            try {
                console.log('Sending stock data:', data);
                const response = await fetch('/addStock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
                
                return response;
            } catch (error) {
                console.error('API addStock error:', error);
                throw error;
            }
        },
        removeStock: async (data) => {
            try {
                const response = await fetch('/removeStock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
                return response;
            } catch (error) {
                console.error('API removeStock error:', error);
                throw error;
            }
        },
        // Updated to use the correct purchase endpoint format
        getPurchases: async (username) => {
            try {
                const response = await fetch(`/getStorePurchases?storeUsername=${username}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const rawPurchases = await response.json();
                
                console.log('Raw purchases data:', rawPurchases);
                return rawPurchases;
            } catch (error) {
                console.error('API getPurchases error:', error);
                throw error;
            }
        }
    };

    // Utility functions
    const showAlert = (message, type = 'info') => {
        if (!elements.alertContainer) {
            console.error('Alert container not found');
            alert(message);
            return;
        }

        const alertStyles = {
            success: { bg: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30', text: 'text-green-400', icon: 'fa-check-circle' },
            error: { bg: 'from-red-500/20 to-red-600/10', border: 'border-red-500/30', text: 'text-red-400', icon: 'fa-exclamation-circle' },
            info: { bg: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30', text: 'text-blue-400', icon: 'fa-info-circle' }
        };
        const style = alertStyles[type];
        const alert = document.createElement('div');
        alert.className = `bg-gradient-to-r ${style.bg} border ${style.border} ${style.text} p-4 rounded-lg shadow-lg mb-4 flex items-center animate-fade-in`;
        alert.innerHTML = `
            <i class="fas ${style.icon} mr-3"></i>
            <span class="flex-1">${message}</span>
            <button onclick="this.parentElement.remove()" class="ml-3 text-current hover:opacity-70">
                <i class="fas fa-times"></i>
            </button>
        `;
        elements.alertContainer.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    };

    const formatCurrency = (amount) => `₹${amount.toFixed(2)}`;

    // Better date formatting function
    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            return {
                date: date.toLocaleDateString('en-IN', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                }),
                time: date.toLocaleTimeString('en-IN', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })
            };
        } catch (error) {
            console.error('Error formatting date:', error);
            return { date: 'Invalid Date', time: '' };
        }
    };

    // Authentication check
    const checkAuth = () => {
        if (typeof autoLoginInstance === 'undefined') {
            console.error('autoLoginInstance not found - authentication system not loaded');
            showAlert('Authentication system not loaded', 'error');
            return false;
        }

        if (!autoLoginInstance.isLoggedIn()) {
            window.location.href = '/accounts/login/index.html';
            return false;
        }
        
        currentUser = autoLoginInstance.getCurrentUser();
        if (!currentUser || currentUser.userType !== 'store') {
            showAlert('Access denied. Store account required.', 'error');
            setTimeout(() => window.location.href = '/accounts/login/index.html', 2000);
            return false;
        }
        
        if (elements.usernameDisplay) {
            elements.usernameDisplay.textContent = currentUser.username;
        }
        return true;
    };

    // Data loading functions
    const loadData = async () => {
        try {
            const [stock, purchases] = await Promise.all([
                API.getStock(currentUser.username),
                API.getPurchases(currentUser.username)
            ]);
           
            stockData = Array.isArray(stock) ? stock : [];
            purchasesData = Array.isArray(purchases) ? purchases : [];
           
            console.log('Loaded stock data:', stockData);
            console.log('Loaded purchases data:', purchasesData);
           
            renderAll();
        } catch (error) {
            console.error('Error loading data:', error);
            showAlert(`Error loading data: ${error.message}`, 'error');
        }
    };

    // Rendering functions
    const renderStock = () => {
        if (!elements.stockList) return;
        
        if (stockData.length === 0) {
            elements.stockList.innerHTML = '<div class="text-center text-gray-500 py-8">No stock items found</div>';
            document.getElementById('noStock')?.classList.remove('hidden');
            return;
        }
        
        document.getElementById('noStock')?.classList.add('hidden');
        elements.stockList.innerHTML = stockData.map(item => `
            <div class="flex items-center bg-background/30 rounded-lg p-3 border border-primary/20">
                <div class="w-10 h-10 bg-gradient-to-br from-primary/20 to-accent/10 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                    ${item.image ?
                        `<img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover rounded-lg">` :
                        '<i class="fas fa-box text-primary text-sm"></i>'
                    }
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-text font-medium text-sm truncate">${item.name}</h4>
                    <p class="text-text/70 text-xs">${formatCurrency(item.price)}</p>
                </div>
                <div class="text-accent font-semibold text-sm">x${item.quantity}</div>
            </div>
        `).join('');
    };

    const renderStockOverview = () => {
        if (!elements.stockOverview) return;
        
        if (stockData.length === 0) {
            elements.stockOverview.innerHTML = '<div class="text-center text-gray-500 py-8">No stock overview available</div>';
            document.getElementById('noStockOverview')?.classList.remove('hidden');
            return;
        }
        
        document.getElementById('noStockOverview')?.classList.add('hidden');
       
        const totalItems = stockData.reduce((sum, item) => sum + item.quantity, 0);
        const totalValue = stockData.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const topItems = [...stockData].sort((a, b) => b.quantity - a.quantity).slice(0, 3);
        
        elements.stockOverview.innerHTML = `
            <div class="space-y-4">
                <div class="bg-background/30 rounded-lg p-4 border border-primary/20">
                    <div class="flex items-center justify-between">
                        <span class="text-text/70 text-sm">Total Items</span>
                        <span class="text-accent font-semibold">${totalItems}</span>
                    </div>
                </div>
                <div class="bg-background/30 rounded-lg p-4 border border-primary/20">
                    <div class="flex items-center justify-between">
                        <span class="text-text/70 text-sm">Stock Value</span>
                        <span class="text-primary font-semibold">${formatCurrency(totalValue)}</span>
                    </div>
                </div>
                <div class="bg-background/30 rounded-lg p-4 border border-primary/20">
                    <div class="flex items-center justify-between">
                        <span class="text-text/70 text-sm">Unique Products</span>
                        <span class="text-text font-semibold">${stockData.length}</span>
                    </div>
                </div>
            </div>
            ${topItems.length > 0 ? `
                <div class="mt-6">
                    <h4 class="text-sm font-medium text-text mb-3">Top Stock Items</h4>
                    <div class="space-y-2">
                        ${topItems.map(item => `
                            <div class="bg-background/30 rounded-lg p-3 border border-primary/20">
                                <div class="flex items-center justify-between">
                                    <span class="text-text text-sm truncate mr-2">${item.name}</span>
                                    <span class="text-accent font-medium text-sm">x${item.quantity}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    };

    // NEW: Enhanced purchase rendering function with cart grouping
    const renderPurchases = () => {
        if (!elements.purchasesContainer || !elements.totalAmount) return;
        
        console.log('Rendering purchases. Data:', purchasesData);
        
        if (purchasesData.length === 0) {
            elements.purchasesContainer.innerHTML = '<div class="text-center text-gray-500 py-8">No purchases found</div>';
            document.getElementById('noPurchases')?.classList.remove('hidden');
            elements.totalAmount.textContent = formatCurrency(0);
            return;
        }
        
        document.getElementById('noPurchases')?.classList.add('hidden');
       
        // Group purchases by transaction ID (cart orders) or customer+timestamp for single items
        const groupedPurchases = groupPurchasesForDisplay();
        
        // Calculate total revenue
        const total = purchasesData.reduce((sum, purchase) => {
            const amount = parseFloat(purchase.totalAmount) || 0;
            return sum + amount;
        }, 0);
        
        console.log('Total calculated:', total);
        console.log('Grouped purchases:', groupedPurchases);
       
        // Render grouped purchase cards
        elements.purchasesContainer.innerHTML = groupedPurchases.map((group, index) => {
            try {
                const dateInfo = formatDate(group.timestamp);
                
                return `
                    <div class="bg-background/30 rounded-lg border border-primary/20 p-4 hover:border-accent/50 transition-all duration-200">
                        <!-- Customer Header -->
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center">
                                <div class="w-8 h-8 bg-gradient-to-br from-primary/30 to-accent/20 rounded-full flex items-center justify-center mr-3">
                                    <i class="fas fa-user text-primary text-sm"></i>
                                </div>
                                <div>
                                    <h4 class="text-text font-semibold text-sm">${group.customerUsername}</h4>
                                    <p class="text-text/50 text-xs">${dateInfo.date} at ${dateInfo.time}</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-accent font-bold text-lg">${formatCurrency(group.totalAmount)}</div>
                                <div class="text-text/50 text-xs">${group.items.length} item${group.items.length > 1 ? 's' : ''}</div>
                            </div>
                        </div>
                        
                        <!-- Items Horizontal Scroll -->
                        <div class="overflow-x-auto">
                            <div class="flex gap-3 min-w-max pb-2">
                                ${group.items.map(item => `
                                    <div class="flex-shrink-0 bg-background/50 rounded-lg p-3 border border-primary/10 min-w-[200px]">
                                        <div class="flex items-center mb-2">
                                            <div class="w-8 h-8 bg-gradient-to-br from-primary/20 to-accent/10 rounded-md flex items-center justify-center mr-2">
                                                <i class="fas fa-box text-primary text-xs"></i>
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <h5 class="text-text font-medium text-xs truncate" title="${item.itemName}">${item.itemName}</h5>
                                                <p class="text-text/70 text-xs">Qty: ${item.quantity}</p>
                                            </div>
                                        </div>
                                        <div class="flex items-center justify-between">
                                            <span class="text-primary text-xs">₹${parseFloat(item.unitPrice || 0).toFixed(2)}/unit</span>
                                            <span class="text-accent font-semibold text-sm">₹${parseFloat(item.totalAmount || 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Transaction Info -->
                        <div class="mt-3 pt-3 border-t border-primary/10 flex items-center justify-between text-xs text-text/50">
                            <span>Transaction: ${group.transactionId.substring(0, 12)}...</span>
                            <span>${group.isCartOrder ? 'Cart Order' : 'Single Item'}</span>
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error(`Error rendering purchase group ${index}:`, error, group);
                return `
                    <div class="bg-background/30 rounded-lg border border-red-500/20 p-4">
                        <div class="text-center text-red-400 text-sm">
                            <i class="fas fa-exclamation-triangle mb-2"></i>
                            <div>Error rendering purchase</div>
                        </div>
                    </div>
                `;
            }
        }).join('');
        
        elements.totalAmount.textContent = formatCurrency(total);
        console.log('Total amount displayed:', formatCurrency(total));
    };

    // NEW: Function to group purchases by transaction/customer for cart display
    const groupPurchasesForDisplay = () => {
        const groups = {};
        
        purchasesData.forEach(purchase => {
            // Use transaction ID as the primary grouping key
            const groupKey = purchase.transactionId || `${purchase.customerUsername}_${purchase.timestamp}`;
            
            if (!groups[groupKey]) {
                groups[groupKey] = {
                    transactionId: purchase.transactionId || 'N/A',
                    customerUsername: purchase.customerUsername,
                    timestamp: purchase.timestamp,
                    items: [],
                    totalAmount: 0,
                    isCartOrder: false
                };
            }
            
            // Add item to group
            groups[groupKey].items.push({
                itemName: purchase.itemName,
                quantity: purchase.quantity,
                unitPrice: purchase.unitPrice,
                totalAmount: purchase.totalAmount
            });
            
            // Update group total
            groups[groupKey].totalAmount += parseFloat(purchase.totalAmount) || 0;
        });
        
        // Convert to array and determine if cart orders
        const groupArray = Object.values(groups).map(group => ({
            ...group,
            isCartOrder: group.items.length > 1
        }));
        
        // Sort by timestamp (most recent first)
        return groupArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    };

    const renderAll = () => {
        renderStock();
        renderStockOverview();
        renderPurchases();
        updateRemoveStockOptions();
    };

    // Modal functions
    const modals = {
        openAdd: () => {
            if (!elements.addStockModal) {
                console.error('Add stock modal not found');
                return;
            }
            elements.addStockModal.classList.remove('hidden');
            elements.addStockModal.classList.add('flex');
            if (elements.itemNameInput) {
                elements.itemNameInput.focus();
            }
        },
        closeAdd: () => {
            if (!elements.addStockModal || !elements.addStockForm) return;
            elements.addStockModal.classList.add('hidden');
            elements.addStockModal.classList.remove('flex');
            elements.addStockForm.reset();
        },
        openRemove: () => {
            if (stockData.length === 0) {
                showAlert('No items available to remove', 'error');
                return;
            }
            if (!elements.removeStockModal) {
                console.error('Remove stock modal not found');
                return;
            }
            updateRemoveStockOptions();
            elements.removeStockModal.classList.remove('hidden');
            elements.removeStockModal.classList.add('flex');
        },
        closeRemove: () => {
            if (!elements.removeStockModal || !elements.removeStockForm) return;
            elements.removeStockModal.classList.add('hidden');
            elements.removeStockModal.classList.remove('flex');
            elements.removeStockForm.reset();
        }
    };

    // Update remove stock dropdown
    const updateRemoveStockOptions = () => {
        if (!elements.selectItemToRemove) return;
        
        elements.selectItemToRemove.innerHTML = '<option value="">Choose an item to remove</option>';
        stockData.forEach((item, index) => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${item.name} (${item.quantity} available)`;
            elements.selectItemToRemove.appendChild(option);
        });
    };

    // Event handlers
    const handleAddStock = async (e) => {
        e.preventDefault();
        
        console.log('Add stock form submitted');
        
        if (!elements.itemNameInput || !elements.quantityInput || !elements.priceInput) {
            console.error('Form inputs not found in elements object:', {
                name: !!elements.itemNameInput,
                quantity: !!elements.quantityInput,
                price: !!elements.priceInput
            });
            showAlert('Form inputs not found. Check your HTML form fields.', 'error');
            return;
        }
        
        const name = elements.itemNameInput.value.trim();
        const quantity = parseInt(elements.quantityInput.value);
        const price = parseFloat(elements.priceInput.value);
        const image = elements.imageUrlInput ? elements.imageUrlInput.value.trim() : '';
        
        console.log('Form values:', { name, quantity, price, image });
        
        if (!name) {
            showAlert('Please enter item name', 'error');
            elements.itemNameInput.focus();
            return;
        }
        
        if (isNaN(quantity) || quantity <= 0) {
            showAlert('Please enter a valid quantity', 'error');
            elements.quantityInput.focus();
            return;
        }
        
        if (isNaN(price) || price <= 0) {
            showAlert('Please enter a valid price', 'error');
            elements.priceInput.focus();
            return;
        }
        
        const stockDataToSend = {
            username: currentUser.username,
            name: name,
            quantity: quantity,
            price: price,
            image: image || null
        };
        
        console.log('Submitting stock data:', stockDataToSend);
        
        try {
            const response = await API.addStock(stockDataToSend);
            console.log('Add stock response:', response);
            
            showAlert('Stock added/updated successfully', 'success');
            modals.closeAdd();
            await loadData();
        } catch (error) {
            console.error('Error adding stock:', error);
            showAlert(`Error adding stock: ${error.message}`, 'error');
        }
    };

    const handleRemoveStock = async (e) => {
        e.preventDefault();
        const itemId = elements.selectItemToRemove.value;
        const quantityInput = document.getElementById('removeQuantity');
        const quantity = quantityInput ? parseInt(quantityInput.value) : null;
       
        if (!itemId || !quantity) {
            showAlert('Please select an item and enter quantity', 'error');
            return;
        }
        
        try {
            const response = await API.removeStock({
                username: currentUser.username,
                itemId,
                quantity
            });
            
            showAlert('Stock updated successfully', 'success');
            modals.closeRemove();
            await loadData();
        } catch (error) {
            console.error('Error removing stock:', error);
            showAlert(`Error updating stock: ${error.message}`, 'error');
        }
    };

    const handleItemSelection = () => {
        if (!elements.selectItemToRemove || !elements.availableQuantity) return;
        
        const selectedId = elements.selectItemToRemove.value;
        if (selectedId) {
            const selectedItem = stockData.find(item => item.id === selectedId);
            if (selectedItem) {
                elements.availableQuantity.textContent = selectedItem.quantity;
                const removeQuantityInput = document.getElementById('removeQuantity');
                if (removeQuantityInput) {
                    removeQuantityInput.max = selectedItem.quantity;
                }
            }
        } else {
            elements.availableQuantity.textContent = '0';
        }
    };

    const logout = () => {
        if (typeof autoLoginInstance !== 'undefined') {
            autoLoginInstance.clearUserCookies();
        }
        showAlert('Logged out successfully', 'success');
        setTimeout(() => window.location.href = '/accounts/login/index.html', 1000);
    };

    // Event listeners setup
    const setupEventListeners = () => {
        if (elements.addStockForm) {
            elements.addStockForm.addEventListener('submit', handleAddStock);
            console.log('Add stock form event listener attached');
        } else {
            console.error('Add stock form not found - event listener not attached');
        }
        
        if (elements.removeStockForm) {
            elements.removeStockForm.addEventListener('submit', handleRemoveStock);
        }
        
        if (elements.selectItemToRemove) {
            elements.selectItemToRemove.addEventListener('change', handleItemSelection);
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modals.closeAdd();
                modals.closeRemove();
            }
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                modals.openAdd();
            }
        });
    };

    // Global functions for HTML onclick handlers
    window.openAddStockModal = modals.openAdd;
    window.closeAddStockModal = modals.closeAdd;
    window.openRemoveStockModal = modals.openRemove;
    window.closeRemoveStockModal = modals.closeRemove;
    window.logout = logout;

    // Add refresh button functionality
    window.refreshData = async () => {
        showAlert('Refreshing data...', 'info');
        await loadData();
        showAlert('Data refreshed successfully', 'success');
    };

    // Debug function to test purchase data format
    window.debugPurchases = () => {
        console.log('=== PURCHASE DEBUG INFO ===');
        console.log('Current store username:', currentUser?.username);
        console.log('Purchases data length:', purchasesData.length);
        console.log('First few purchases:', purchasesData.slice(0, 3));
        console.log('Grouped purchases:', groupPurchasesForDisplay());
        
        if (purchasesData.length > 0) {
            const sample = purchasesData[0];
            console.log('First purchase breakdown:');
            console.log('- Timestamp:', sample.timestamp);
            console.log('- Customer:', sample.customerUsername);
            console.log('- Store:', sample.storeUsername);
            console.log('- Item:', sample.itemName);
            console.log('- Quantity:', sample.quantity);
            console.log('- Unit Price:', sample.unitPrice);
            console.log('- Total Amount:', sample.totalAmount);
            console.log('- Transaction ID:', sample.transactionId);
        }
    };

    // Add test button with debug functionality
    const addTestButton = () => {
        const testBtn = document.createElement('button');
        testBtn.textContent = 'Debug Purchases';
        testBtn.className = 'fixed bottom-4 left-4 bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 text-yellow-400 px-4 py-2 rounded-lg text-sm hover:from-yellow-500/30 hover:to-yellow-600/20 transition-all duration-200 z-50';
        testBtn.onclick = () => debugPurchases();
        document.body.appendChild(testBtn);

        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = 'Refresh Data';
        refreshBtn.className = 'fixed bottom-4 right-4 bg-gradient-to-r from-blue-500/20 to-blue-600/10 border border-blue-500/30 text-blue-400 px-4 py-2 rounded-lg text-sm hover:from-blue-500/30 hover:to-blue-600/20 transition-all duration-200 z-50';
        refreshBtn.onclick = () => refreshData();
        document.body.appendChild(refreshBtn);
    };

    // Add CSS
    const addStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fade-in {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in {
                animation: fade-in 0.3s ease-out;
            }
            .aspect-square {
                aspect-ratio: 1 / 1;
            }
            
            /* Custom scrollbar for horizontal scroll */
            .overflow-x-auto::-webkit-scrollbar {
                height: 4px;
            }
            .overflow-x-auto::-webkit-scrollbar-track {
                background: rgba(165, 149, 218, 0.1);
                border-radius: 2px;
            }
            .overflow-x-auto::-webkit-scrollbar-thumb {
                background: rgba(165, 149, 218, 0.3);
                border-radius: 2px;
            }
            .overflow-x-auto::-webkit-scrollbar-thumb:hover {
                background: rgba(165, 149, 218, 0.5);
            }
        `;
        document.head.appendChild(style);
    };

    // Initialize app
    console.log('Initializing store dashboard...');
    
    // Check elements first
    if (!checkElements()) {
        console.log('Element check failed - stopping initialization');
        return;
    }
    
    console.log('All elements found successfully');
    
    // Setup event listeners
    setupEventListeners();
    
    // Add styles and test button
    addStyles();
    addTestButton();
    
    // Check auth and load data
    if (checkAuth()) {
        console.log('Authentication successful, loading data...');
        loadData();
    } else {
        console.log('Authentication failed');
    }
});