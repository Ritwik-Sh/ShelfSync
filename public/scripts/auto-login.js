// auto-login.js - FIXED VERSION
class AutoLogin {
    constructor() {
        this.requiredCookies = ['username', 'userType', 'password'];
        this.userData = {};
    }

    // Get cookie value by name
    getCookie(name) {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [key, value] = cookie.trim().split('=');
            if (key === name) {
                return decodeURIComponent(value);
            }
        }
        return null;
    }

    // Check if all required cookies exist
    hasAllRequiredCookies() {
        this.userData = {}; // Reset userData
        for (let cookieName of this.requiredCookies) {
            const cookieValue = this.getCookie(cookieName);
            if (!cookieValue) {
                console.log(`Missing cookie: ${cookieName}`);
                return false;
            }
            this.userData[cookieName] = cookieValue;
        }
        console.log('All required cookies found:', this.userData);
        return true;
    }

    // Clear all user cookies
    clearUserCookies() {
        const pastDate = "expires=Thu, 01 Jan 1970 00:00:00 UTC";
        this.requiredCookies.forEach(cookieName => {
            document.cookie = `${cookieName}=; ${pastDate}; path=/`;
        });
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem('userInfo');
        }
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('userInfo');
        }
    }

    // Store user data in session storage
    storeUserSession() {
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('userInfo', JSON.stringify(this.userData));
        }
    }

    // Check if we're on a dashboard page
    isDashboardPage() {
        const currentPath = window.location.pathname.toLowerCase();
        console.log('Checking if dashboard page:', currentPath);
        return currentPath.includes('dashboard') || currentPath.includes('store-page');
    }

    // Check if we're on login/register pages
    isAuthPage() {
        const currentPath = window.location.pathname.toLowerCase();
        const isAuth = currentPath.includes('login') || currentPath.includes('register');
        console.log('Checking if auth page:', currentPath, isAuth);
        return isAuth;
    }

    // FIXED: Check if user is on the correct dashboard for their type
    isOnCorrectDashboard() {
        if (!this.hasAllRequiredCookies()) {
            console.log('No required cookies for dashboard check');
            return false;
        }

        const currentPath = window.location.pathname.toLowerCase();
        const userType = this.userData.userType;

        console.log('Dashboard check:', { currentPath, userType });

        if (userType === 'customer') {
            // Customer can access customer dashboard and store-page
            const canAccess = currentPath.includes('customer') || 
                             currentPath.includes('store-page') ||
                             currentPath.includes('/dashboards/store-page/');
            console.log('Customer can access:', canAccess);
            return canAccess;
        } else if (userType === 'store') {
            // Store users can only access store dashboard (but not store-page)
            const canAccess = currentPath.includes('/dashboards/store/') && 
                             !currentPath.includes('store-page');
            console.log('Store can access:', canAccess);
            return canAccess;
        }

        console.log('Unknown user type or path');
        return false;
    }

    // Show loading overlay for auto-login
    showAutoLoginOverlay() {
        // Create overlay if it doesn't exist
        let overlay = document.getElementById('autoLoginOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'autoLoginOverlay';
            overlay.className = 'fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50';
            overlay.innerHTML = `
                <div class="bg-gradient-to-br from-secondary/40 to-accent/20 p-8 rounded-2xl border border-primary/20 text-center max-w-sm mx-4">
                    <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-full mb-4">
                        <i class="fas fa-user-check text-2xl text-white"></i>
                    </div>
                    <h3 class="text-xl font-bold text-text mb-2">Welcome Back!</h3>
                    <p class="text-text/70 mb-4">Signing you in automatically...</p>
                    <div class="flex items-center justify-center space-x-2">
                        <div class="animate-spin w-6 h-6 border-3 border-primary/30 border-t-accent rounded-full"></div>
                        <span class="text-text/70">Please wait</span>
                    </div>
                    <button onclick="window.autoLoginInstance.cancelAutoLogin()" class="mt-4 text-text/50 hover:text-primary transition-colors text-sm">
                        <i class="fas fa-times mr-1"></i>Cancel
                    </button>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    }

    // Hide loading overlay
    hideAutoLoginOverlay() {
        const overlay = document.getElementById('autoLoginOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // Cancel auto-login and redirect to login page
    cancelAutoLogin() {
        this.hideAutoLoginOverlay();
        this.clearUserCookies();
        window.location.href = '/accounts/login/';
    }

    // Redirect to appropriate dashboard
    redirectToDashboard(userType) {
        const dashboardUrl = userType === 'store' 
            ? '/dashboards/store/' 
            : '/dashboards/customer/';
        console.log('Redirecting to dashboard:', dashboardUrl);
        window.location.href = dashboardUrl;
    }

    // FIXED: Perform auto-login with better logging
    async performAutoLogin() {
        console.log('Starting auto-login process...');
        
        // Don't auto-login if no cookies
        if (!this.hasAllRequiredCookies()) {
            console.log('No auth cookies found, skipping auto-login');
            return false;
        }

        // Don't auto-login if we're on login/register pages
        if (this.isAuthPage()) {
            console.log('On auth page, skipping auto-login');
            return false;
        }

        // If we're already on the correct dashboard, don't redirect
        if (this.isDashboardPage() && this.isOnCorrectDashboard()) {
            console.log('Already on correct dashboard, no need to auto-login');
            this.storeUserSession(); // Store session data
            return true;
        }

        // Show loading overlay for pages that aren't dashboards
        console.log('Showing auto-login overlay and attempting login...');
        this.showAutoLoginOverlay();

        try {
            // Attempt login with stored credentials
            const { username, password, userType } = this.userData;
            
            console.log('Attempting login with:', { username, userType });
            
            const response = await fetch(`/login?userName=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&userType=${encodeURIComponent(userType)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                console.log('Auto-login successful');
                // Store in session storage
                this.storeUserSession();
                
                // If we're already on a valid page for this user type, don't redirect
                if (this.isOnCorrectDashboard()) {
                    console.log('Already on correct page, hiding overlay');
                    this.hideAutoLoginOverlay();
                    return true;
                }
                
                // Redirect to appropriate dashboard
                this.redirectToDashboard(userType);
                return true;
            } else {
                console.error('Auto-login failed with status:', response.status);
                // Invalid credentials, clear cookies and redirect to login
                this.clearUserCookies();
                this.hideAutoLoginOverlay();
                
                this.showErrorMessage('Auto-login failed. Please login again.');
                setTimeout(() => {
                    window.location.href = '/accounts/login/';
                }, 2000);
                return false;
            }
        } catch (error) {
            console.error('Auto-login error:', error);
            this.hideAutoLoginOverlay();
            
            // Network error, but don't clear cookies - might be temporary
            this.showErrorMessage('Network error during auto-login. Redirecting to login...');
            setTimeout(() => {
                window.location.href = '/accounts/login/';
            }, 2000);
            return false;
        }
    }

    // Show error message
    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 right-4 bg-gradient-to-r from-red-500/20 to-red-600/10 border border-red-500/30 text-red-400 p-4 rounded-lg shadow-lg z-50 max-w-sm animate-fade-in';
        errorDiv.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-exclamation-circle mr-3"></i>
                <span class="flex-1">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-3 text-current hover:opacity-70">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        document.body.appendChild(errorDiv);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 5000);
    }

    // Pre-fill login form if on login page
    preFillLoginForm() {
        if (!this.isAuthPage()) {
            return;
        }

        if (this.hasAllRequiredCookies()) {
            const usernameField = document.getElementById('username');
            const passwordField = document.getElementById('password');
            const userTypeRadios = document.querySelectorAll('input[name="userType"]');

            if (usernameField) usernameField.value = this.userData.username;
            if (passwordField) passwordField.value = this.userData.password;
            
            userTypeRadios.forEach(radio => {
                if (radio.value === this.userData.userType) {
                    radio.checked = true;
                    // Trigger change event to update UI
                    radio.dispatchEvent(new Event('change'));
                }
            });
        }
    }

    // FIXED: Initialize auto-login with better logic
    init() {
        console.log('Initializing auto-login system...');
        console.log('Current URL:', window.location.pathname);
        
        // Add CSS for animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fade-in {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in {
                animation: fade-in 0.3s ease-out;
            }
        `;
        document.head.appendChild(style);

        // Check what to do based on current page
        if (this.isAuthPage()) {
            // On login/register pages, just pre-fill forms
            console.log('On auth page, pre-filling form');
            setTimeout(() => this.preFillLoginForm(), 100);
        } else if (this.isDashboardPage()) {
            // On dashboard pages, check if user should be here
            console.log('On dashboard page, checking auth');
            if (!this.hasAllRequiredCookies()) {
                // No auth, redirect to login
                console.log('No auth on dashboard, redirecting to login');
                window.location.href = '/accounts/login/';
            } else if (!this.isOnCorrectDashboard()) {
                // Wrong dashboard, attempt auto-login to validate and redirect
                console.log('Wrong dashboard or need validation, attempting auto-login');
                setTimeout(() => this.performAutoLogin(), 100);
            } else {
                // We're on the correct dashboard, store session
                console.log('On correct dashboard, storing session');
                this.storeUserSession();
            }
        } else {
            // On other pages, attempt auto-login
            console.log('On other page, attempting auto-login');
            setTimeout(() => this.performAutoLogin(), 500);
        }
    }

    // Get current user data from cookies
    getCurrentUser() {
        if (this.hasAllRequiredCookies()) {
            return this.userData;
        }
        return null;
    }

    // Check if user is logged in
    isLoggedIn() {
        return this.hasAllRequiredCookies();
    }
}

// Create global instance
const autoLoginInstance = new AutoLogin();

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => autoLoginInstance.init());
} else {
    autoLoginInstance.init();
}

// Export for use in other scripts
window.AutoLogin = AutoLogin;
window.autoLoginInstance = autoLoginInstance;