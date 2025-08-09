// register.js
document.addEventListener('DOMContentLoaded', function() {
    const registrationTypeInputs = document.querySelectorAll('.registration-type');
    const registrationOptions = document.querySelectorAll('.registration-option');
    const customerForm = document.getElementById('customerForm');
    const storeForm = document.getElementById('storeForm');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    const alertContainer = document.getElementById('alertContainer');
    const storePreview = document.getElementById('storePreview');
    const storeUrlInput = document.getElementById('storeUrl');

    // Handle registration type switching
    function updateRegistrationForm() {
        const selectedType = document.querySelector('input[name="registrationType"]:checked').value;
        // Update visual styles for options
        registrationOptions.forEach((option, index) => {
            if (registrationTypeInputs[index].checked) {
                option.classList.add('border-accent', 'bg-accent/10', 'animate-glow');
                option.classList.remove('border-primary/30');
            } else {
                option.classList.remove('border-accent', 'bg-accent/10', 'animate-glow');
                option.classList.add('border-primary/30');
            }
        });

        // Show/hide forms
        if (selectedType === 'customer') {
            customerForm.classList.remove('hidden');
            storeForm.classList.add('hidden');
        } else {
            customerForm.classList.add('hidden');
            storeForm.classList.remove('hidden');
        }
    }

    registrationTypeInputs.forEach(input => {
        input.addEventListener('change', updateRegistrationForm);
    });

    // Initialize form display
    updateRegistrationForm();

    // Password toggle functionality
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const passwordInput = this.previousElementSibling;
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
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
    function showLoading(text = 'Processing registration...') {
        loadingText.textContent = text;
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

    // Email validation
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // URL validation for Google Maps
    function isValidGoogleMapsUrl(url) {
        const googleMapsRegex = /^https:\/\/(www\.)?(maps\.google\.com|google\.com\/maps)/;
        return googleMapsRegex.test(url);
    }

    // Handle customer form submission
    customerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(customerForm);
        const userData = {
            userName: formData.get('userName').trim(),
            password: formData.get('password'),
            fullName: formData.get('fullName').trim(),
            email: formData.get('email').trim()
        };

        // Validation
        if (!userData.userName || !userData.password || !userData.fullName || !userData.email) {
            showAlert('Please fill in all required fields.');
            return;
        }

        if (userData.userName.length < 3) {
            showAlert('Username must be at least 3 characters long.');
            return;
        }

        if (userData.password.length < 6) {
            showAlert('Password must be at least 6 characters long.');
            return;
        }

        if (!isValidEmail(userData.email)) {
            showAlert('Please enter a valid email address.');
            return;
        }

        if (userData.fullName.length < 2) {
            showAlert('Please enter your full name.');
            return;
        }

        showLoading('Creating your customer account...');

        try {
            const response = await fetch('/registerUser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            hideLoading();

            if (response.ok) {
                showAlert('Customer account created successfully! You are now logged in.', 'success');
                
                // Store user data in cookies
                storeUserInCookies(userData.userName, 'customer', userData.password);

                // Redirect after success
                setTimeout(() => {
                    window.location.href = '../../dashboards/customer/'; // Adjust as needed
                }, 1500);
            } else {
                const errorText = await response.text();
                if (errorText.includes('already exists')) {
                    showAlert('Username already exists. Please choose a different username.');
                } else {
                    showAlert(errorText || 'Registration failed. Please try again.');
                }
            }
        } catch (error) {
            hideLoading();
            console.error('Registration error:', error);
            showAlert('Network error. Please check your connection and try again.');
        }
    });
    let storeName = '';
    // Handle store form submission
    storeForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(storeForm);
        const storeUrl = formData.get('url').trim();

        // Validation
        if (!storeUrl) {
            showAlert('Please enter a Google Maps URL.');
            return;
        }
        if (!isValidGoogleMapsUrl(storeUrl)) {
            showAlert('Please enter a valid Google Maps URL.');
            return;
        }

        showLoading('Registering your store...');

        try {
            const response = await fetch('/registerStore', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    url: storeUrl,
                    storeName: storeName,
                    username: formData.get('username').trim(),
                    password: formData.get('password').trim()
                })
            });

            hideLoading();

            if (response.ok) {
                showAlert('Store registered successfully! You are now logged in.', 'success');
                
                // For stores, we'll use the store name as username if available
                // Otherwise use a generated username based on the URL
                const storeUsername = storePreview.querySelector('#previewName')?.textContent || 
                                   'store_' + Date.now();
                
                // Store user data in cookies (stores don't have passwords in your backend)
                storeUserInCookies(storeUsername, 'store', '');

                // Redirect after success
                setTimeout(() => {
                    window.location.href = 'paymentGateway.html'; // Adjust as needed
                }, 1500);
            } else {
                const errorText = await response.text();
                if (errorText.includes('already exists')) {
                    showAlert('This store is already registered.');
                } else {
                    showAlert(errorText || 'Store registration failed. Please try again.');
                }
            }
        } catch (error) {
            hideLoading();
            console.error('Store registration error:', error);
            showAlert('Network error. Please check your connection and try again.');
        }
    });

    // Store URL preview functionality (optional enhancement)
    let previewTimeout;
    storeUrlInput.addEventListener('input', async function() {
        clearTimeout(previewTimeout);
        const url = this.value.trim();
        if (isValidGoogleMapsUrl(url)) {
            previewTimeout = setTimeout(() => {
                storePreview.classList.remove('hidden');
                document.getElementById('previewName').textContent = 'Fetching details...';
                document.getElementById('previewAddress').textContent = 'Please wait...';
                document.getElementById('previewRating').textContent = 'Loading...';
            }, 500);
            const response = await fetch(`/getPlaceDetails?url=${encodeURIComponent(url)}`);
            const data = await response.json();
            if (data) {
                storeName = data.name;
                document.getElementById('previewName').textContent = data.name || 'Store Name';
                document.getElementById('previewAddress').textContent = data.address || 'Address not available';
                document.getElementById('previewRating').textContent = `Rating: ${data.rating || 'N/A'}`;
            } else {
                console.error(data)
                document.getElementById('previewName').textContent = 'Error fetching details';
                document.getElementById('previewAddress').textContent = '';
                document.getElementById('previewRating').textContent = '';
            }
            //             document.getElementById('previewName').textContent = data.name || 'Store Name';
            //             document.getElementById('previewAddress').textContent = data.address || 'Address not available';
            //             document.getElementById('previewRating').textContent = `Rating: ${data.rating || 'N/A'}`;
            //         } else {
            //             document.getElementById('previewName').textContent = 'Error fetching details';
            //             document.getElementById('previewAddress').textContent = '';
            //             document.getElementById('previewRating').textContent = '';
            //         }
            //     })
            //     .catch(error => {
            //         console.error('Error fetching store details:', error);
            //         document.getElementById('previewName').textContent = 'Error fetching details';
            //         document.getElementById('previewAddress').textContent = '';
            //         document.getElementById('previewRating').textContent = '';
            //     });
        } else {
            storePreview.classList.add('hidden');
        }
    });

    // Add animation styles
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