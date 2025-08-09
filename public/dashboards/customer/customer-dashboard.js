// customer-dashboard.js - Simple working version
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const storesContainer = document.getElementById('storesContainer');
    const loadingStores = document.getElementById('loadingStores');
    const storesGrid = document.getElementById('storesGrid');
    const noStores = document.getElementById('noStores');
    const errorState = document.getElementById('errorState');
    const storeCount = document.getElementById('storeCount');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const alertContainer = document.getElementById('alertContainer');

    let allStores = [];
    let filteredStores = [];

    // Simple cookie functions
    function clearStoreCookies() {
        if (window.location.pathname.includes('customer') && !document.referrer.includes('store-page')) {
            document.cookie = "storeUrl=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
            document.cookie = "storeName=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
        }
    }

    // Simple alert function
    function showAlert(message, type = 'info') {
        let container = alertContainer;
        if (!container) {
            container = document.createElement('div');
            container.id = 'alertContainer';
            container.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(container);
        }

        const alert = document.createElement('div');
        const colors = {
            success: 'bg-green-500/20 border-green-500/30 text-green-400',
            error: 'bg-red-500/20 border-red-500/30 text-red-400',
            info: 'bg-blue-500/20 border-blue-500/30 text-blue-400'
        };
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle', 
            info: 'fa-info-circle'
        };

        alert.className = `${colors[type] || colors.info} border p-4 rounded-lg shadow-lg mb-4 flex items-center max-w-sm`;
        alert.innerHTML = `
            <i class="fas ${icons[type] || icons.info} mr-3"></i>
            <span class="flex-1">${message}</span>
            <button onclick="this.parentElement.remove()" class="ml-3 hover:opacity-70">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    }

    // Simple authentication check
    function checkAuth() {
        let attempts = 0;
        const checkLogin = () => {
            attempts++;
            if (window.autoLoginInstance) {
                if (!window.autoLoginInstance.isLoggedIn()) {
                    window.location.href = '/accounts/login/index.html';
                    return;
                }

                const currentUser = window.autoLoginInstance.getCurrentUser();
                if (currentUser.userType !== 'customer') {
                    showAlert('Access denied. Customer account required.', 'error');
                    setTimeout(() => window.location.href = '/accounts/login/index.html', 2000);
                    return;
                }

                if (usernameDisplay) usernameDisplay.textContent = currentUser.username;
                loadStores();
            } else if (attempts < 50) {
                setTimeout(checkLogin, 100);
            } else {
                showAlert('Authentication system not loaded. Redirecting...', 'error');
                setTimeout(() => window.location.href = '/accounts/login/index.html', 2000);
            }
        };
        checkLogin();
    }

    // Load stores with simple error handling
    async function loadStores() {
        showLoading();
        
        try {
            const response = await fetch('/getStores');
            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            
            allStores = await response.json();
            filteredStores = [...allStores];
            displayStores();
        } catch (error) {
            console.error('Error loading stores:', error);
            showError('Failed to load stores. Please try again.');
            showAlert('Failed to load stores', 'error');
        }
    }

    function showLoading() {
        if (loadingStores) loadingStores.classList.remove('hidden');
        if (storesGrid) storesGrid.classList.add('hidden');
        if (noStores) noStores.classList.add('hidden');
        if (errorState) errorState.classList.add('hidden');
    }

    function showError(message) {
        const errorMessageEl = document.getElementById('errorMessage');
        if (errorMessageEl) errorMessageEl.textContent = message;
        if (errorState) errorState.classList.remove('hidden');
        if (loadingStores) loadingStores.classList.add('hidden');
        if (storesGrid) storesGrid.classList.add('hidden');
        if (noStores) noStores.classList.add('hidden');
    }

    function displayStores() {
        if (loadingStores) loadingStores.classList.add('hidden');
        if (errorState) errorState.classList.add('hidden');

        if (filteredStores.length === 0) {
            if (noStores) noStores.classList.remove('hidden');
            if (storesGrid) storesGrid.classList.add('hidden');
        } else {
            if (storesGrid) storesGrid.classList.remove('hidden');
            if (noStores) noStores.classList.add('hidden');
            
            if (storeCount) {
                storeCount.textContent = `${filteredStores.length} store${filteredStores.length !== 1 ? 's' : ''} found`;
            }
            
            if (storesContainer) {
                storesContainer.innerHTML = '';
                filteredStores.forEach(store => {
                    storesContainer.appendChild(createStoreCard(store));
                });
            }
        }
    }

    function createStoreCard(store) {
        const card = document.createElement('div');
        card.className = 'bg-gradient-to-br from-secondary/20 to-accent/10 backdrop-blur-sm border border-primary/20 rounded-xl overflow-hidden hover:border-accent/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer';
        
        const rating = parseFloat(store.rating) || 0;
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let starsHTML = '';
        for (let i = 0; i < fullStars; i++) starsHTML += '<i class="fas fa-star text-yellow-400"></i>';
        if (hasHalfStar) starsHTML += '<i class="fas fa-star-half-alt text-yellow-400"></i>';
        for (let i = 0; i < emptyStars; i++) starsHTML += '<i class="far fa-star text-gray-400"></i>';

        card.innerHTML = `            
            <div class="p-6">
                <div class="flex items-start justify-between mb-3">
                    <h3 class="text-lg font-semibold text-text line-clamp-2 flex-1">${store.name || 'Unknown Store'}</h3>
                </div>
                
                <div class="flex items-center mb-3">
                    <div class="flex items-center mr-2">${starsHTML}</div>
                    <span class="text-text/70 text-sm">${rating.toFixed(1)}</span>
                </div>
                
                <div class="flex items-start mb-4">
                    <i class="fas fa-map-marker-alt text-primary mt-1 mr-2 flex-shrink-0"></i>
                    <p class="text-text/70 text-sm line-clamp-2">${store.address || 'Address not available'}</p>
                </div>
                
                <div class="flex gap-2">
                    <button onclick="visitStore('${store.url}', '${store.name}')" 
                        class="flex-1 bg-gradient-to-r from-primary to-accent hover:from-accent hover:to-primary text-white font-medium py-2 px-4 rounded-lg transition-all duration-200">
                        <i class="fas fa-shopping-bag mr-2"></i>Visit Store
                    </button>
                    <a href="${store.url}" target="_blank" 
                        class="bg-background/50 hover:bg-background/70 border border-primary/30 hover:border-accent/50 text-primary hover:text-accent p-2 rounded-lg transition-all duration-200 flex items-center justify-center"
                        title="Open in new tab">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>
            </div>
        `;
        return card;
    }

    // Global functions
    window.visitStore = function(storeUrl, storeName) {
        const expires = new Date(Date.now() + 6 * 60 * 60 * 1000).toUTCString();
        document.cookie = `storeUrl=${encodeURIComponent(storeUrl)}; expires=${expires}; path=/; secure; samesite=strict`;
        document.cookie = `storeName=${encodeURIComponent(storeName)}; expires=${expires}; path=/; secure; samesite=strict`;
        window.location.href = '/dashboards/store-page/';
    };

    window.refreshStores = function() {
        if (searchInput) searchInput.value = '';
        loadStores();
    };

    window.logout = function() {
        try {
            if (window.autoLoginInstance) window.autoLoginInstance.clearUserCookies();
            document.cookie.split(";").forEach(c => {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            showAlert('Logged out successfully', 'success');
            setTimeout(() => window.location.href = '/accounts/login/index.html', 1000);
        } catch (error) {
            window.location.href = '/accounts/login/index.html';
        }
    };

    // Search functionality
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = this.value.toLowerCase().trim();
                filteredStores = query === '' ? [...allStores] : 
                    allStores.filter(store => 
                        (store.name && store.name.toLowerCase().includes(query)) ||
                        (store.address && store.address.toLowerCase().includes(query))
                    );
                displayStores();
            }, 300);
        });
    }

    // Add basic CSS
    const style = document.createElement('style');
    style.textContent = `
        .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
    `;
    document.head.appendChild(style);

    // Initialize everything
    clearStoreCookies();
    checkAuth();
});