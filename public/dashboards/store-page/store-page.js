// store-page.js - Enhanced version with cart system
document.addEventListener('DOMContentLoaded', async () => {
    // DOM elements
    const usernameDisplay = document.getElementById('usernameDisplay');
    const loadingStore = document.getElementById('loadingStore');
    const storeHeader = document.getElementById('storeHeader');
    const storeContent = document.getElementById('storeContent');
    const errorState = document.getElementById('errorState');
    const productsGrid = document.getElementById('productsGrid');
    const noProducts = document.getElementById('noProducts');
    const purchaseModal = document.getElementById('purchaseModal');
    const purchaseForm = document.getElementById('purchaseForm');
    const alertContainer = document.getElementById('alertContainer');
    const cartModal = document.getElementById('cartModal');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const cartCount = document.getElementById('cartCount');
    const checkoutForm = document.getElementById('checkoutForm');

    let currentUser = null;
    let currentStore = null;
    let storeProducts = [];
    let selectedProduct = null;
    let cart = []; // Cart array to store items

    // Initialize page
    // FIXED store-page.js authentication section
    // Replace the init() function in your store-page.js with this fixed version

    // Initialize page
    function init() {
        console.log('Initializing store page...');
        console.log('Current URL:', window.location.href);

        // Wait for auto-login system to be ready
        let attempts = 0;
        const checkAuthReady = () => {
            attempts++;
            console.log(`Auth check attempt ${attempts}`);

            if (typeof autoLoginInstance === 'undefined') {
                if (attempts < 50) {
                    console.log('Auto-login instance not ready, waiting...');
                    setTimeout(checkAuthReady, 100);
                    return;
                } else {
                    console.error('Auto-login system failed to load');
                    showAlert('Authentication system not loaded. Redirecting...', 'error');
                    setTimeout(() => {
                        window.location.href = '/accounts/login/';
                    }, 2000);
                    return;
                }
            }

            console.log('Auto-login instance ready, checking login status...');

            // Check if user is logged in
            if (!autoLoginInstance.isLoggedIn()) {
                console.log('User not logged in, redirecting to login page');
                showAlert('Please login to access the store page', 'error');
                setTimeout(() => {
                    window.location.href = '/accounts/login/';
                }, 1000);
                return;
            }

            // Get current user
            currentUser = autoLoginInstance.getCurrentUser();
            console.log('Current user:', currentUser);

            if (!currentUser) {
                console.log('No current user data, redirecting to login');
                showAlert('Authentication error. Please login again.', 'error');
                setTimeout(() => {
                    window.location.href = '/accounts/login/';
                }, 2000);
                return;
            }

            if (currentUser.userType !== 'customer') {
                console.log('User is not a customer:', currentUser.userType);
                showAlert('Access denied. Customer account required.', 'error');
                setTimeout(() => {
                    window.location.href = '/accounts/login/';
                }, 2000);
                return;
            }

            console.log('Authentication successful for customer:', currentUser.username);

            // Display username
            if (usernameDisplay) {
                usernameDisplay.textContent = currentUser.username;
            }

            // Load store from URL or cookies
            loadStoreFromUrl();
            updateCartDisplay();
        };

        // Start the auth check
        checkAuthReady();
    }

    // ALSO ADD: Enhanced error handling for the entire store-page.js
    // Add this at the beginning of your store-page.js file, right after the DOMContentLoaded listener

    // Enhanced error handling and debugging
    window.addEventListener('error', function (e) {
        console.error('Store page error:', e.error);
        console.error('Error details:', {
            message: e.message,
            filename: e.filename,
            lineno: e.lineno,
            colno: e.colno
        });
    });

    // Add debugging for cookies
    function debugCookies() {
        console.log('=== COOKIE DEBUG ===');
        console.log('All cookies:', document.cookie);

        const cookies = ['username', 'userType', 'password', 'storeUrl', 'storeName'];
        cookies.forEach(cookieName => {
            const value = getCookie(cookieName);
            console.log(`${cookieName}:`, value);
        });
        console.log('==================');
    }

    // MODIFIED: Enhanced loadStoreFromUrl function with better debugging
    function loadStoreFromUrl() {
        console.log('=== LOADING STORE FROM URL ===');
        debugCookies();

        const urlParams = new URLSearchParams(window.location.search);
        const storeUsername = urlParams.get('store');
        console.log('Store username from URL:', storeUsername);

        if (!storeUsername) {
            console.log('No store username in URL, trying cookies...');
            // Try loading from cookies as fallback
            loadStoreFromCookies();
            return;
        }

        currentStore = {
            username: storeUsername,
            name: 'Loading...'
        };

        console.log('Set current store:', currentStore);
        loadStoreDetails();
    }

    // MODIFIED: Enhanced loadStoreFromCookies with better error handling
    function loadStoreFromCookies() {
        console.log('=== LOADING STORE FROM COOKIES ===');

        const storeUrl = getCookie('storeUrl');
        const storeName = getCookie('storeName');

        console.log('Store URL from cookies:', storeUrl);
        console.log('Store name from cookies:', storeName);

        if (!storeUrl) {
            console.error('No storeUrl cookie found');
            showError('No store selected. Please select a store from the dashboard.');
            return;
        }

        currentStore = {
            url: storeUrl,
            name: storeName || 'Unknown Store'
        };

        console.log('Set current store from cookies:', currentStore);
        loadStoreDetailsFromUrl();
    }

    // Add this enhanced showAlert function if it doesn't exist
    function showAlert(message, type = 'info') {
        console.log(`ALERT [${type}]:`, message);

        let container = alertContainer;
        if (!container) {
            container = document.createElement('div');
            container.id = 'alertContainer';
            container.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(container);
        }

        const alert = document.createElement('div');
        const bgColor = type === 'success' ? 'from-green-500/20 to-green-600/10' :
            type === 'error' ? 'from-red-500/20 to-red-600/10' :
                'from-blue-500/20 to-blue-600/10';
        const borderColor = type === 'success' ? 'border-green-500/30' :
            type === 'error' ? 'border-red-500/30' :
                'border-blue-500/30';
        const textColor = type === 'success' ? 'text-green-400' :
            type === 'error' ? 'text-red-400' :
                'text-blue-400';
        const icon = type === 'success' ? 'fa-check-circle' :
            type === 'error' ? 'fa-exclamation-circle' :
                'fa-info-circle';

        alert.className = `bg-gradient-to-r ${bgColor} border ${borderColor} ${textColor} p-4 rounded-lg shadow-lg mb-4 flex items-center animate-fade-in max-w-sm`;
        alert.innerHTML = `
        <i class="fas ${icon} mr-3"></i>
        <span class="flex-1">${message}</span>
        <button onclick="this.parentElement.remove()" class="ml-3 text-current hover:opacity-70">
            <i class="fas fa-times"></i>
        </button>
    `;

        container.appendChild(alert);

        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }

    // Load store from URL parameters
    function loadStoreFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const storeUsername = urlParams.get('store');
        console.log('Loading store:', storeUsername);

        if (!storeUsername) {
            // Try loading from cookies as fallback
            loadStoreFromCookies();
            return;
        }

        currentStore = {
            username: storeUsername,
            name: 'Loading...'
        };

        loadStoreDetails();
    }

    // Get cookie value
    function getCookie(name) {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [key, value] = cookie.trim().split('=');
            if (key === name) {
                return decodeURIComponent(value);
            }
        }
        return null;
    }

    // Load store information from cookies (fallback)
    function loadStoreFromCookies() {
        const storeUrl = getCookie('storeUrl');
        const storeName = getCookie('storeName');

        if (!storeUrl) {
            showError('No store selected. Please select a store from the dashboard.');
            return;
        }

        currentStore = {
            url: storeUrl,
            name: storeName || 'Unknown Store'
        };

        loadStoreDetailsFromUrl();
    }

    // Load store details using URL (cookie method)
    async function loadStoreDetailsFromUrl() {
        try {
            console.log('Loading store details from URL:', currentStore.url);
            const response = await fetch(`/getPlaceDetails?url=${encodeURIComponent(currentStore.url)}`);

            if (response.ok) {
                const storeDetails = await response.json();
                currentStore = { ...currentStore, ...storeDetails };
                displayStoreHeader();

                await findStoreUsernameAndLoadProducts();

            } else {
                throw new Error('Failed to load store details');
            }
        } catch (error) {
            console.error('Error loading store details:', error);
            showError('Failed to load store information.');
        }
    }

    // Find store username from backend and load products
    async function findStoreUsernameAndLoadProducts() {
        try {
            console.log('Attempting to find store username for URL:', currentStore.url);

            const storesResponse = await fetch('/getStores');
            if (!storesResponse.ok) {
                throw new Error('Failed to fetch stores from backend');
            }

            const stores = await storesResponse.json();
            console.log('Available stores:', stores);

            const matchingStore = stores.find(store => store.url === currentStore.url);

            if (matchingStore) {
                console.log('Found matching store:', matchingStore);
                currentStore.username = matchingStore.username;
                loadStoreProducts();
            } else {
                console.log('No matching store found for URL:', currentStore.url);
                noProducts.classList.remove('hidden');
                productsGrid.classList.add('hidden');
                showAlert('This store does not have an online inventory system set up yet.', 'info');
            }

        } catch (error) {
            console.error('Error finding store username:', error);
            noProducts.classList.remove('hidden');
            productsGrid.classList.add('hidden');
            showAlert('Unable to load store inventory. Please try again later.', 'error');
        }
    }

    // Load store details using store username
    async function loadStoreDetails() {
        try {
            const storeResponse = await fetch(`/getStores`);
            if (!storeResponse.ok) {
                throw new Error('Failed to fetch stores');
            }

            const stores = await storeResponse.json();
            const store = stores.find(s => s.username === currentStore.username);

            if (!store) {
                throw new Error('Store not found');
            }

            currentStore = { ...currentStore, ...store };
            displayStoreHeader();
            loadStoreProducts();

        } catch (error) {
            console.error('Error loading store details:', error);
            showError('Failed to load store information.');
        }
    }

    // Display store header information
    function displayStoreHeader() {
        document.getElementById('storeName').textContent = currentStore.name;
        document.getElementById('storeAddress').textContent = currentStore.address || 'Address not available';
        document.getElementById('mapsLink').href = currentStore.url || '#';

        // Display rating
        const rating = parseFloat(currentStore.rating) || 0;
        document.getElementById('ratingText').textContent = rating.toFixed(1);

        const storeRating = document.getElementById('storeRating');
        storeRating.innerHTML = generateStarRating(rating);

        // Show store header
        loadingStore.classList.add('hidden');
        storeHeader.classList.remove('hidden');
        storeContent.classList.remove('hidden');
    }

    // Generate star rating HTML
    function generateStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let starsHTML = '';
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<i class="fas fa-star text-yellow-400"></i>';
        }
        if (hasHalfStar) {
            starsHTML += '<i class="fas fa-star-half-alt text-yellow-400"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += '<i class="far fa-star text-gray-400"></i>';
        }

        return starsHTML;
    }

    // Load store products from Firebase
    async function loadStoreProducts() {
        if (!currentStore.username) {
            console.error('No store username available for loading products');
            storeProducts = [];
            displayProducts();
            return;
        }

        try {
            console.log('Fetching products for store:', currentStore.username);
            const response = await fetch(`/getStoreStock?storeUsername=${currentStore.username}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            storeProducts = await response.json();
            console.log('Loaded products:', storeProducts);
            displayProducts();

        } catch (error) {
            console.error('Error loading store products:', error);
            storeProducts = [];
            displayProducts();
            showAlert(`Error loading products: ${error.message}`, 'error');
        }
    }

    // Display products
    function displayProducts() {
        if (storeProducts.length === 0) {
            productsGrid.classList.add('hidden');
            noProducts.classList.remove('hidden');
            return;
        }

        noProducts.classList.add('hidden');
        productsGrid.classList.remove('hidden');
        productsGrid.innerHTML = '';

        storeProducts.forEach((product, index) => {
            const productCard = createProductCard(product, index);
            productsGrid.appendChild(productCard);
        });
    }

    // Create product card with cart functionality
// Enhanced createProductCard function with inline quantity controls
function createProductCard(product, index) {
    const card = document.createElement('div');
    card.className = 'bg-gradient-to-br from-secondary/20 to-accent/10 backdrop-blur-sm border border-primary/20 rounded-xl overflow-hidden hover:border-accent/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl';

    const isOutOfStock = product.quantity <= 0;
    const cartItem = cart.find(item => item.id === product.id);
    const inCart = cartItem ? cartItem.quantity : 0;

    card.innerHTML = `
        <div class="aspect-square bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center relative">
            ${product.image ?
            `<img src="${product.image}" alt="${product.name}" class="w-full h-full object-cover ${isOutOfStock ? 'opacity-50' : ''}">` :
            `<i class="fas fa-box text-4xl text-primary ${isOutOfStock ? 'opacity-50' : ''}"></i>`
        }
            ${isOutOfStock ?
            '<div class="absolute inset-0 flex items-center justify-center bg-background/50"><span class="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">Out of Stock</span></div>' :
            ''
        }
            ${inCart > 0 ?
            `<div class="absolute top-2 right-2 bg-accent text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">${inCart}</div>` :
            ''
        }
        </div>
        
        <div class="p-6">
            <h4 class="text-lg font-semibold text-text mb-2 line-clamp-2">${product.name}</h4>
            
            <div class="flex items-center justify-between mb-4">
                <span class="text-2xl font-bold text-accent">₹${product.price.toFixed(2)}</span>
                <span class="text-text/70 text-sm">
                    <i class="fas fa-boxes mr-1"></i>
                    ${product.quantity} available
                </span>
            </div>
            
            ${product.addedDate ?
            `<div class="text-text/50 text-xs mb-4">
                    <i class="fas fa-clock mr-1"></i>
                    Added ${new Date(product.addedDate).toLocaleDateString()}
                </div>` :
            ''
        }
            
            <div class="flex gap-2">
                ${inCart === 0 ? `
                    <!-- Initial Add to Cart button -->
                    <button 
                        onclick="addToCart(${index})" 
                        ${isOutOfStock ? 'disabled' : ''}
                        class="${isOutOfStock ?
                        'bg-gray-500/20 border border-gray-500/30 text-gray-400 cursor-not-allowed' :
                        'bg-gradient-to-r from-primary to-accent hover:from-accent hover:to-primary text-white hover:scale-[1.02]'
                    } flex-1 font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center"
                    >
                        <i class="fas fa-cart-plus mr-2"></i>
                        ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                ` : `
                    <!-- Quantity control buttons when item is in cart-->
                    <div class="flex-1 flex items-center bg-background/30 border border-accent/30 rounded-lg overflow-hidden">
                        <button 
                            onclick="updateProductQuantity(${index}, -1)" 
                            class="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-r border-red-500/30 px-3 py-3 transition-all duration-200 flex items-center justify-center h-full"
                        >
                            <i class="fas fa-minus text-sm"></i>
                        </button>
                        
                        <div class="flex-1 flex items-center justify-center py-3 px-2 bg-gradient-to-r from-primary/10 to-accent/10">
                            <span class="text-text font-medium mr-2">${inCart}</span>
                            <i class="fas fa-shopping-cart text-accent text-sm"></i>
                        </div>
                        
                        <button 
                            onclick="updateProductQuantity(${index}, 1)" 
                            ${inCart >= product.quantity ? 'disabled' : ''}
                            class="${inCart >= product.quantity ? 
                                'bg-gray-500/20 text-gray-400 cursor-not-allowed' : 
                                'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                            } border-l border-green-500/30 px-3 py-3 transition-all duration-200 flex items-center justify-center h-full"
                        >
                            <i class="fas fa-plus text-sm"></i>
                        </button>
                    </div>
                `}
                
                ${inCart > 0 ? `
                    <button 
                        onclick="openPurchaseModal(${index})" 
                        class="bg-background/50 border border-accent/50 text-accent hover:bg-accent hover:text-white px-4 py-3 rounded-lg transition-all duration-200"
                        title="Edit quantity"
                    >
                        <i class="fas fa-edit"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    return card;
}

// New function to handle quantity updates directly from product cards
window.updateProductQuantity = function(productIndex, change) {
    const product = storeProducts[productIndex];
    const cartItemIndex = cart.findIndex(item => item.id === product.id);
    
    if (cartItemIndex === -1) {
        // Item not in cart, this shouldn't happen but handle it
        if (change > 0) {
            addToCart(productIndex);
        }
        return;
    }
    
    const cartItem = cart[cartItemIndex];
    const newQuantity = cartItem.quantity + change;
    
    if (newQuantity <= 0) {
        // Remove item from cart
        cart.splice(cartItemIndex, 1);
        showAlert(`Removed ${product.name} from cart`, 'success');
    } else if (newQuantity <= product.quantity) {
        // Update quantity
        cartItem.quantity = newQuantity;
        showAlert(`Updated ${product.name} quantity to ${newQuantity}`, 'success');
    } else {
        // Exceeds available stock
        showAlert('Cannot exceed available stock', 'error');
        return;
    }
    
    updateCartDisplay();
    displayProducts(); // Refresh to show updated controls
};

// Enhanced addToCart function (remains mostly the same)
window.addToCart = function (productIndex) {
    const product = storeProducts[productIndex];
    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
        if (existingItem.quantity < product.quantity) {
            existingItem.quantity++;
            showAlert(`Added ${product.name} to cart (${existingItem.quantity} total)`, 'success');
        } else {
            showAlert('Cannot add more than available stock', 'error');
            return;
        }
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            maxQuantity: product.quantity,
            image: product.image
        });
        showAlert(`Added ${product.name} to cart`, 'success');
    }

    updateCartDisplay();
    displayProducts(); // Refresh to show quantity controls
};

    function updateCartDisplay() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        if (cartCount) {
            cartCount.textContent = totalItems;
            cartCount.classList.toggle('hidden', totalItems === 0);
        }

        if (cartTotal) {
            cartTotal.textContent = `₹${totalAmount.toFixed(2)}`;
        }
    }

    window.openCart = function () {
        if (cart.length === 0) {
            showAlert('Your cart is empty', 'info');
            return;
        }

        renderCartItems();
        cartModal.classList.remove('hidden');
        cartModal.classList.add('flex');
    };

    window.closeCart = function () {
        cartModal.classList.add('hidden');
        cartModal.classList.remove('flex');
    };

    function renderCartItems() {
        if (!cartItems) return;

        cartItems.innerHTML = cart.map((item, index) => `
            <div class="flex items-center bg-background/30 rounded-lg p-4 border border-primary/20 mb-3">
                <div class="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    ${item.image ?
                `<img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover rounded-lg">` :
                '<i class="fas fa-box text-primary text-xl"></i>'
            }
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-text font-semibold truncate">${item.name}</h4>
                    <p class="text-accent font-bold">₹${item.price.toFixed(2)} each</p>
                    <div class="flex items-center mt-2">
                        <button onclick="updateCartItemQuantity(${index}, -1)" class="w-8 h-8 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 h-full transition-all">
                            <i class="fas fa-minus text-xs"></i>
                        </button>
                        <span class="mx-3 font-medium">${item.quantity}</span>
                        <button onclick="updateCartItemQuantity(${index}, 1)" class="w-8 h-8 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 h-full transition-all" ${item.quantity >= item.maxQuantity ? 'disabled' : ''}>
                            <i class="fas fa-plus text-xs"></i>
                        </button>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-accent font-bold text-lg">₹${(item.price * item.quantity).toFixed(2)}</div>
                    <button onclick="removeFromCart(${index})" class="text-red-400 hover:text-red-300 mt-1">
                        <i class="fas fa-trash text-sm"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    window.updateCartItemQuantity = function (index, change) {
        const item = cart[index];
        const newQuantity = item.quantity + change;

        if (newQuantity <= 0) {
            cart.splice(index, 1);
        } else if (newQuantity <= item.maxQuantity) {
            item.quantity = newQuantity;
        } else {
            showAlert('Cannot exceed available stock', 'error');
            return;
        }

        updateCartDisplay();
        renderCartItems();
        displayProducts();
    };

    window.removeFromCart = function (index) {
        const item = cart[index];
        cart.splice(index, 1);
        showAlert(`Removed ${item.name} from cart`, 'success');
        updateCartDisplay();
        renderCartItems();
        displayProducts();
    };

    window.clearCart = function () {
        cart = [];
        updateCartDisplay();
        renderCartItems();
        displayProducts();
        showAlert('Cart cleared', 'success');
    };

    // Checkout process
    window.proceedToCheckout = function () {
        if (cart.length === 0) {
            showAlert('Your cart is empty', 'error');
            return;
        }

        // Show checkout confirmation
        const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

        if (confirm(`Proceed to checkout with ${itemCount} items for ₹${totalAmount.toFixed(2)}?`)) {
            processCartCheckout();
        }
    };

    async function processCartCheckout() {
        try {
            showAlert('Processing your order...', 'info');

            const checkoutData = {
                customerUsername: currentUser.username,
                storeUsername: currentStore.username,
                items: cart.map(item => ({
                    itemId: item.id,
                    quantity: item.quantity,
                    name: item.name,
                    price: item.price
                })),
                customerEmail: currentUser.email || null
            };

            console.log('Sending checkout data:', checkoutData);

            const response = await fetch('/processCartPurchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(checkoutData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();

            showAlert(`Order completed successfully! Total: ₹${result.totalAmount.toFixed(2)}. Transaction ID: ${result.transactionId}`, 'success');

            // Clear cart and reload products
            cart = [];
            updateCartDisplay();
            await loadStoreProducts();
            closeCart();

        } catch (error) {
            console.error('Error processing checkout:', error);
            showAlert(`Failed to process order: ${error.message}`, 'error');
        }
    }

    // Open purchase modal (for editing cart items)
    window.openPurchaseModal = function (productIndex) {
        selectedProduct = { ...storeProducts[productIndex], index: productIndex };
        const cartItem = cart.find(item => item.id === selectedProduct.id);

        const selectedProductDiv = document.getElementById('selectedProduct');
        selectedProductDiv.innerHTML = `
            <div class="flex items-center bg-background/30 rounded-lg p-4 border border-primary/20">
                <div class="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    ${selectedProduct.image ?
                `<img src="${selectedProduct.image}" alt="${selectedProduct.name}" class="w-full h-full object-cover rounded-lg">` :
                '<i class="fas fa-box text-primary text-xl"></i>'
            }
                </div>
                <div class="flex-1">
                    <h4 class="text-text font-semibold">${selectedProduct.name}</h4>
                    <p class="text-accent font-bold">₹${selectedProduct.price.toFixed(2)}</p>
                </div>
            </div>
        `;

        document.getElementById('maxQuantity').textContent = selectedProduct.quantity;
        document.getElementById('purchaseQuantity').max = selectedProduct.quantity;
        document.getElementById('purchaseQuantity').value = cartItem ? cartItem.quantity : 1;
        updateTotalPrice();

        purchaseModal.classList.remove('hidden');
        purchaseModal.classList.add('flex');
    };

    // Close purchase modal
    window.closePurchaseModal = function () {
        purchaseModal.classList.add('hidden');
        purchaseModal.classList.remove('flex');
        selectedProduct = null;
        purchaseForm.reset();
    };

    // Update total price
    function updateTotalPrice() {
        if (selectedProduct) {
            const quantity = parseInt(document.getElementById('purchaseQuantity').value) || 1;
            const total = selectedProduct.price * quantity;
            document.getElementById('totalPrice').textContent = `₹${total.toFixed(2)}`;
        }
    }

    // Handle quantity input change
    if (document.getElementById('purchaseQuantity')) {
        document.getElementById('purchaseQuantity').addEventListener('input', updateTotalPrice);
    }

    // Handle purchase form submission (update cart item)
    if (purchaseForm) {
        purchaseForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const quantity = parseInt(document.getElementById('purchaseQuantity').value);

            if (quantity > selectedProduct.quantity) {
                showAlert('Quantity exceeds available stock', 'error');
                return;
            }

            // Update cart item
            const cartItemIndex = cart.findIndex(item => item.id === selectedProduct.id);
            if (cartItemIndex !== -1) {
                cart[cartItemIndex].quantity = quantity;
            } else {
                cart.push({
                    id: selectedProduct.id,
                    name: selectedProduct.name,
                    price: selectedProduct.price,
                    quantity: quantity,
                    maxQuantity: selectedProduct.quantity,
                    image: selectedProduct.image
                });
            }

            updateCartDisplay();
            displayProducts();
            closePurchaseModal();
            showAlert('Cart updated successfully', 'success');
        });
    }

    // Other utility functions remain the same
    window.contactStore = function () {
        if (currentStore.url) {
            window.open(currentStore.url, '_blank');
        } else {
            showAlert('Contact information not available. Visit the store location for more details.', 'info');
        }
    };

    window.refreshProducts = async function () {
        await loadStoreProducts();
        showAlert('Products refreshed', 'success');
    };

    window.goBack = function () {
        window.location.href = '/dashboards/customer/';
    };

    // Show alert function
    function showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        const bgColor = type === 'success' ? 'from-green-500/20 to-green-600/10' :
            type === 'error' ? 'from-red-500/20 to-red-600/10' :
                'from-blue-500/20 to-blue-600/10';
        const borderColor = type === 'success' ? 'border-green-500/30' :
            type === 'error' ? 'border-red-500/30' :
                'border-blue-500/30';
        const textColor = type === 'success' ? 'text-green-400' :
            type === 'error' ? 'text-red-400' :
                'text-blue-400';
        const icon = type === 'success' ? 'fa-check-circle' :
            type === 'error' ? 'fa-exclamation-circle' :
                'fa-info-circle';

        alert.className = `bg-gradient-to-r ${bgColor} border ${borderColor} ${textColor} p-4 rounded-lg shadow-lg mb-4 flex items-center animate-fade-in`;
        alert.innerHTML = `
            <i class="fas ${icon} mr-3"></i>
            <span class="flex-1">${message}</span>
            <button onclick="this.parentElement.remove()" class="ml-3 text-current hover:opacity-70">
                <i class="fas fa-times"></i>
            </button>
        `;

        alertContainer.appendChild(alert);

        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }

    // Show error state
    function showError(message) {
        document.getElementById('errorMessage').textContent = message;
        errorState.classList.remove('hidden');
        loadingStore.classList.add('hidden');
        storeHeader.classList.add('hidden');
        storeContent.classList.add('hidden');
    }

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fade-in 0.3s ease-out;
        }
        .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .aspect-square {
            aspect-ratio: 1 / 1;
        }
    `;
    document.head.appendChild(style);

    // Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closePurchaseModal();
            closeCart();
        }
        if (e.key === 'Backspace' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            goBack();
        }
    });

    // Initialize page
    init();
});