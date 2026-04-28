// Wait for DOM to be fully loaded before attaching event listeners
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const loginToggle = document.getElementById('login-toggle');
    const signupToggle = document.getElementById('signup-toggle');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const switchToSignup = document.getElementById('switch-to-signup');
    const switchToLogin = document.getElementById('switch-to-login');

    // Toggle between Login and Signup
    function showLoginForm() {
        if (loginForm && signupForm && loginToggle && signupToggle) {
            loginForm.classList.add('active');
            signupForm.classList.remove('active');
            loginToggle.classList.add('active');
            signupToggle.classList.remove('active');
            clearFormErrors();
        }
    }

    function showSignupForm() {
        if (loginForm && signupForm && loginToggle && signupToggle) {
            signupForm.classList.add('active');
            loginForm.classList.remove('active');
            signupToggle.classList.add('active');
            loginToggle.classList.remove('active');
            clearFormErrors();
        }
    }

    // Event Listeners for Toggle Buttons
    if (loginToggle) loginToggle.addEventListener('click', showLoginForm);
    if (signupToggle) signupToggle.addEventListener('click', showSignupForm);
    if (switchToSignup) switchToSignup.addEventListener('click', (e) => {
        e.preventDefault();
        showSignupForm();
    });
    if (switchToLogin) switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });

    const authMode = new URLSearchParams(window.location.search).get('mode');
    if (authMode === 'signup') {
        showSignupForm();
    } else if (authMode === 'login') {
        showLoginForm();
    }

    // Clear all error messages
    function clearFormErrors() {
        const errorMessages = document.querySelectorAll('.error-message');
        errorMessages.forEach(msg => msg.textContent = '');
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => input.classList.remove('error'));
    }

    // Login Form Validation and Submission
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (validateLoginForm()) {
                const username = document.getElementById('login-user').value;
                const password = document.getElementById('login-password').value;
                const rememberMe = document.querySelector('input[name="remember"]').checked;
                
                console.log('Login attempt:', { username, rememberMe });
                
                // Simulate successful login
                showSuccessMessage('Login successful! Redirecting to your workspace...');
                
                // Here you would typically send data to your backend
                // Example: fetch('/api/login', { method: 'POST', body: JSON.stringify({username, password}) })
                
                setTimeout(() => {
                    loginForm.reset();
                    window.location.href = 'user.html';
                }, 1200);
            }
        });
    }

    // Signup Form Validation and Submission
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (validateSignupForm()) {
                const name = document.getElementById('signup-name').value;
                const email = document.getElementById('signup-email').value;
                const username = document.getElementById('signup-username').value;
                const password = document.getElementById('signup-password').value;
                
                console.log('Signup attempt:', { name, username, email });
                
                // Simulate successful signup
                showSuccessMessage('Account created successfully! Opening your workspace...');
                
                // Here you would typically send data to your backend
                // Example: fetch('/api/signup', { method: 'POST', body: JSON.stringify({name, email, password}) })
                
                setTimeout(() => {
                    signupForm.reset();
                    window.location.href = 'user.html';
                }, 1200);
            }
        });
    }

    // Login Form Validation
    function validateLoginForm() {
        clearFormErrors();
        let isValid = true;

        // Username validation
        const username = document.getElementById('login-user');
        if (!username.value.trim()) {
            showErrorMessage('login-user-error', 'Username is required');
            username.classList.add('error');
            isValid = false;
        } else if (username.value.trim().length < 3) {
            showErrorMessage('login-user-error', 'Username must be at least 3 characters');
            username.classList.add('error');
            isValid = false;
        }

        // Password validation
        const password = document.getElementById('login-password');
        if (!password.value) {
            showErrorMessage('login-password-error', 'Password is required');
            password.classList.add('error');
            isValid = false;
        } else if (password.value.length < 6) {
            showErrorMessage('login-password-error', 'Password must be at least 6 characters');
            password.classList.add('error');
            isValid = false;
        }

        return isValid;
    }

    // Signup Form Validation
    function validateSignupForm() {
        clearFormErrors();
        let isValid = true;

        // Name validation
        const name = document.getElementById('signup-name');
        if (!name.value.trim()) {
            showErrorMessage('signup-name-error', 'Full name is required');
            name.classList.add('error');
            isValid = false;
        } else if (name.value.trim().length < 2) {
            showErrorMessage('signup-name-error', 'Name must be at least 2 characters');
            name.classList.add('error');
            isValid = false;
        }

        // Email validation
        const email = document.getElementById('signup-email');
        if (!email.value.trim()) {
            showErrorMessage('signup-email-error', 'Email is required');
            email.classList.add('error');
            isValid = false;
        } else if (!isValidEmail(email.value)) {
            showErrorMessage('signup-email-error', 'Please enter a valid email address');
            email.classList.add('error');
            isValid = false;
        }

        // Username validation
        const username = document.getElementById('signup-username');
        if (!username.value.trim()) {
            showErrorMessage('signup-username-error', 'Username is required');
            username.classList.add('error');
            isValid = false;
        } else if (username.value.trim().length < 3) {
            showErrorMessage('signup-username-error', 'Username must be at least 3 characters');
            username.classList.add('error');
            isValid = false;
        } else if (!/^[a-zA-Z0-9_]*$/.test(username.value)) {
            showErrorMessage('signup-username-error', 'Username can only contain letters, numbers, and underscores');
            username.classList.add('error');
            isValid = false;
        }

        // Password validation
        const password = document.getElementById('signup-password');
        if (!password.value) {
            showErrorMessage('signup-password-error', 'Password is required');
            password.classList.add('error');
            isValid = false;
        } else if (password.value.length < 6) {
            showErrorMessage('signup-password-error', 'Password must be at least 6 characters');
            password.classList.add('error');
            isValid = false;
        } else if (!/[A-Z]/.test(password.value)) {
            showErrorMessage('signup-password-error', 'Password must contain at least one uppercase letter');
            password.classList.add('error');
            isValid = false;
        } else if (!/[0-9]/.test(password.value)) {
            showErrorMessage('signup-password-error', 'Password must contain at least one number');
            password.classList.add('error');
            isValid = false;
        }

        // Confirm Password validation
        const confirmPassword = document.getElementById('signup-confirm-password');
        if (!confirmPassword.value) {
            showErrorMessage('signup-confirm-password-error', 'Please confirm your password');
            confirmPassword.classList.add('error');
            isValid = false;
        } else if (confirmPassword.value !== password.value) {
            showErrorMessage('signup-confirm-password-error', 'Passwords do not match');
            confirmPassword.classList.add('error');
            isValid = false;
        }

        // Terms checkbox validation
        const termsCheckbox = document.querySelector('input[name="terms"]');
        if (!termsCheckbox.checked) {
            showErrorMessage('signup-terms-error', 'You must agree to the Terms of Service');
            isValid = false;
        }

        return isValid;
    }

// Email validation helper
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Show error message
function showErrorMessage(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
    }
}

// Show success message (you can replace this with a proper notification system)
function showSuccessMessage(message) {
    console.log('Success:', message);
    alert(message);
}

    // Real-time email validation - check if login-email exists
    const loginEmailInput = document.getElementById('login-email');
    if (loginEmailInput) {
        loginEmailInput.addEventListener('blur', () => {
            const email = document.getElementById('login-email');
            if (email && email.value && !isValidEmail(email.value)) {
                showErrorMessage('login-email-error', 'Please enter a valid email address');
                email.classList.add('error');
            }
        });
    }

    const signupEmailInput = document.getElementById('signup-email');
    if (signupEmailInput) {
        signupEmailInput.addEventListener('blur', () => {
            const email = document.getElementById('signup-email');
            if (email && email.value && !isValidEmail(email.value)) {
                showErrorMessage('signup-email-error', 'Please enter a valid email address');
                email.classList.add('error');
            }
        });
    }

    // Clear error when user starts typing
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
            if (input.classList.contains('error')) {
                input.classList.remove('error');
                const errorId = input.id + '-error';
                const errorElement = document.getElementById(errorId);
                if (errorElement) {
                    errorElement.textContent = '';
                }
            }
        });
    });

    // Smooth scrolling for navigation links on home page
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // Add active state to nav links based on scroll position
    window.addEventListener('scroll', () => {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = Array.from(document.querySelectorAll('.nav-links a'))
            .filter(link => link.getAttribute('href') && link.getAttribute('href').startsWith('#'));

        if (!navLinks.length) {
            return;
        }

        sections.forEach(section => {
            const top = section.offsetTop - 100;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');
            
            if (window.pageYOffset >= top && window.pageYOffset < top + height) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + id) {
                        link.classList.add('active');
                    }
                });
            }
        });
    });
});
