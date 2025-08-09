// login.js
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const toggleIcon = document.getElementById('toggleIcon');
    const passwordInput = document.getElementById('password');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const alertContainer = document.getElementById('alertContainer');

    // Handle radio button styling
    const radioInputs = document.querySelectorAll('input[name="userType"]');
    const radioDots = document.querySelectorAll('.radio-dot');
    const radioCircles = document.querySelectorAll('.user-type-radio');

    function updateRadioStyles() {
        radioInputs.forEach((input, index) => {
            if (input.checked) {
                radioDots[index].classList.remove('hidden');
                radioCircles[index].classList.add('border-accent');
                radioCircles[index].classList.remove('border-primary/50');
            } else {
                radioDots[index].classList.add('hidden');
                radioCircles[index].classList.remove('border-accent');
                radioCircles[index].classList.add('border-primary/50');
            }
        });
    }

    radioInputs.forEach(input => {
        input.addEventListener('change', updateRadioStyles);
    });

    // Initialize radio styles
    updateRadioStyles();

    // Password toggle functionality
    togglePassword.addEventListener('click', function() {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.classList.remove('fa-eye');
            toggleIcon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            toggleIcon.classList.remove('fa-eye-slash');
            toggleIcon.classList.add('fa-eye');
        }
    });

    // Show alert function
    function showAlert(message, type = 'error') {
        const alert = document.createElement('div');
        const bgColor = type === 'success' ? 'from-green-500/20 to-green-600/10' : 'from-red-500/20 to-red-600/10';
        const borderColor = type === 'success' ? 'border-green-500/30' : 'border-red-500/30';
        const textColor = type === 'success' ? 'text-green-400' : 'text-red-400';
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';

        alert.className = `bg-gradient-to-r ${bgColor} border ${borderColor} ${textColor} p-4 rounded-lg shadow-lg mb-4 flex items-center animate-fade-in`;
        alert.innerHTML = `
            <i class="fas ${icon} mr-3"></i>
            <span class="flex-1">${message}</span>
            <button onclick="this.parentElement.remove()" class="ml-3 text-current hover:opacity-70">
                <i class="fas fa-times"></i>
            </button>
        `;

        alertContainer.appendChild(alert);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }

    // Show loading overlay
    function showLoading() {
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.classList.add('flex');
    }

    // Hide loading overlay
    function hideLoading() {
        loadingOverlay.classList.add('hidden');
        loadingOverlay.classList.remove('flex');
    }

    // Store user data in cookies
    function storeUserInCookies(username, userType, password) {
        const expiryDate = new Date();
        expiryDate.setTime(expiryDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
        const expires = "expires=" + expiryDate.toUTCString();
        
        document.cookie = `username=${encodeURIComponent(username)}; ${expires}; path=/; secure; samesite=strict`;
        document.cookie = `userType=${encodeURIComponent(userType)}; ${expires}; path=/; secure; samesite=strict`;
        document.cookie = `password=${encodeURIComponent(password)}; ${expires}; path=/; secure; samesite=strict`;
        
        // Also store in sessionStorage
        sessionStorage.setItem('userInfo', JSON.stringify({
            username: username,
            userType: userType,
            password: password
        }));
    }

    // Handle form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(loginForm);
        const userName = formData.get('username').trim();
        const password = formData.get('password');
        const userType = formData.get('userType');

        // Basic validation
        if (!userName || !password) {
            showAlert('Please fill in all required fields.');
            return;
        }

        if (userName.length < 3) {
            showAlert('Username must be at least 3 characters long.');
            return;
        }

        if (password.length < 6) {
            showAlert('Password must be at least 6 characters long.');
            return;
        }

        showLoading();

        try {
            const response = await fetch(`/login?userName=${encodeURIComponent(userName)}&password=${encodeURIComponent(password)}&userType=${encodeURIComponent(userType)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            hideLoading();

            if (response.ok) {
                showAlert('Login successful! Redirecting...', 'success');
                
                // Store user data in cookies using the function
                storeUserInCookies(userName, userType, password);

                // Redirect after success
                setTimeout(() => {
                    if (userType === 'store') {
                        window.location.href = '../../dashboards/store/'; // Adjust as needed
                    } else {
                        window.location.href = '../../dashboards/customer/'; // Adjust as needed
                    }
                }, 1500);
            } else if (response.status === 401) {
                showAlert('Invalid username, password, or account type. Please check your credentials.');
            } else {
                const errorText = await response.text();
                showAlert(errorText || 'Login failed. Please try again.');
            }
        } catch (error) {
            hideLoading();
            console.error('Login error:', error);
            showAlert('Network error. Please check your connection and try again.');
        }
    });

    // Add animation classes
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
});