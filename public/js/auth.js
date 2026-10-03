// ChatSphere Authentication & Profile JS Handler

document.addEventListener('DOMContentLoaded', () => {
  const alertBox = document.getElementById('alertBox');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const profileForm = document.getElementById('profileForm');
  const avatarInput = document.getElementById('profilePicture');
  const avatarPreview = document.getElementById('avatarPreview');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');

  // Helper to display error/success alert
  const showAlert = (message, type = 'danger') => {
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.className = `alert-box ${type === 'danger' ? 'danger-alert' : 'success-alert'}`;
    alertBox.classList.remove('hidden');
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const hideAlert = () => {
    if (alertBox) alertBox.classList.add('hidden');
  };

  // Toggle Password Visibility
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      togglePasswordBtn.querySelector('i').className = type === 'password' ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
    });
  }

  // Avatar Upload Preview
  if (avatarInput && avatarPreview) {
    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          showAlert('Image size should be less than 5MB');
          avatarInput.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          avatarPreview.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // LOGIN FORM SUBMISSION
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const submitBtn = document.getElementById('submitBtn');
      const btnText = submitBtn.querySelector('.btn-text');
      const originalText = btnText.textContent;

      const login = document.getElementById('login').value.trim();
      const password = passwordInput.value;

      if (!login || !password) {
        showAlert('Please enter your email/username and password');
        return;
      }

      try {
        btnText.textContent = 'Signing in...';
        submitBtn.disabled = true;

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login, password }),
        });

        const data = await response.json();

        if (data.success) {
          window.location.href = '/';
        } else {
          showAlert(data.message || 'Login failed. Please check your credentials.');
        }
      } catch (err) {
        showAlert('Network error. Please try again later.');
      } finally {
        btnText.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // REGISTER FORM SUBMISSION
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const submitBtn = document.getElementById('submitBtn');
      const btnText = submitBtn.querySelector('.btn-text');
      const originalText = btnText.textContent;

      const name = document.getElementById('name').value.trim();
      const username = document.getElementById('username').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (!name || !username || !email || !password || !confirmPassword) {
        showAlert('Please fill in all required fields');
        return;
      }

      if (password !== confirmPassword) {
        showAlert('Passwords do not match');
        return;
      }

      if (password.length < 6) {
        showAlert('Password must be at least 6 characters');
        return;
      }

      const formData = new FormData(registerForm);

      try {
        btnText.textContent = 'Creating Account...';
        submitBtn.disabled = true;

        const response = await fetch('/api/auth/register', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          showAlert('Account created successfully! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = '/';
          }, 1000);
        } else {
          showAlert(data.message || 'Registration failed.');
        }
      } catch (err) {
        showAlert('Network error. Please check your connection.');
      } finally {
        btnText.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // PROFILE FORM SUBMISSION
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const saveBtn = document.getElementById('saveProfileBtn');
      const btnText = saveBtn.querySelector('.btn-text');
      const originalText = btnText.textContent;

      const formData = new FormData(profileForm);

      try {
        btnText.textContent = 'Saving Changes...';
        saveBtn.disabled = true;

        const response = await fetch('/api/users/profile', {
          method: 'PUT',
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          showAlert('Profile updated successfully!', 'success');
          if (data.data && data.data.profilePicture) {
            if (avatarPreview) avatarPreview.src = data.data.profilePicture;
          }
        } else {
          showAlert(data.message || 'Failed to update profile.');
        }
      } catch (err) {
        showAlert('Network error updating profile.');
      } finally {
        btnText.textContent = originalText;
        saveBtn.disabled = false;
      }
    });
  }

  // LOGOUT HANDLER
  const logoutBtn = document.getElementById('settingsLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
      } catch (err) {
        window.location.href = '/login';
      }
    });
  }
});
