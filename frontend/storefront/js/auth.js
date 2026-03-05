const API_BASE = '/api/storefront';

// UI Helpers
const showToast = (message, type = 'success') => {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'fixed top-4 right-4 z-[100] flex flex-col gap-2';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
};

document.addEventListener('DOMContentLoaded', () => {

    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Tab Switching
    if (tabLogin && tabRegister) {
        tabLogin.addEventListener('click', () => {
            tabLogin.className = 'flex-1 pb-3 text-center font-bold text-primary border-b-2 border-primary transition-colors focus:outline-none';
            tabRegister.className = 'flex-1 pb-3 text-center font-bold text-slate-500 border-b-2 border-transparent hover:text-slate-300 transition-colors focus:outline-none';
            loginForm.classList.remove('hidden');
            loginForm.classList.add('block');
            registerForm.classList.remove('block');
            registerForm.classList.add('hidden');
        });

        tabRegister.addEventListener('click', () => {
            tabRegister.className = 'flex-1 pb-3 text-center font-bold text-primary border-b-2 border-primary transition-colors focus:outline-none';
            tabLogin.className = 'flex-1 pb-3 text-center font-bold text-slate-500 border-b-2 border-transparent hover:text-slate-300 transition-colors focus:outline-none';
            registerForm.classList.remove('hidden');
            registerForm.classList.add('block');
            loginForm.classList.remove('block');
            loginForm.classList.add('hidden');
        });
    }

    // Login Handle
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            const btn = loginForm.querySelector('button');
            const originalText = btn.innerHTML;

            btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">sync</span> Đang đăng nhập...';
            btn.disabled = true;

            try {
                const res = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();

                if (data.success) {
                    localStorage.setItem('neon_store_token', data.data.token);
                    localStorage.setItem('neon_store_user', JSON.stringify(data.data.user));
                    showToast('Đăng nhập thành công!', 'success');
                    setTimeout(() => window.location.href = '/', 1000);
                } else {
                    showToast(data.message, 'error');
                }
            } catch (err) {
                showToast('Lỗi kết nối máy chủ', 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    // Register Handle
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                name: document.getElementById('regName').value,
                phone: document.getElementById('regPhone').value,
                username: document.getElementById('regUsername').value,
                password: document.getElementById('regPassword').value,
                address: document.getElementById('regAddress').value
            };

            const btn = registerForm.querySelector('button');
            const originalText = btn.innerHTML;

            btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">sync</span> Đang tạo...';
            btn.disabled = true;

            try {
                const res = await fetch(`${API_BASE}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (data.success) {
                    showToast('Đăng ký thành công! Đang chuyển hướng đăng nhập...', 'success');
                    // Auto login after 1.5s
                    setTimeout(async () => {
                        const loginRes = await fetch(`${API_BASE}/auth/login`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username: payload.username, password: payload.password })
                        });
                        const loginData = await loginRes.json();
                        if (loginData.success) {
                            localStorage.setItem('neon_store_token', loginData.data.token);
                            localStorage.setItem('neon_store_user', JSON.stringify(loginData.data.user));
                            window.location.href = '/';
                        }
                    }, 1500);
                } else {
                    showToast(data.message, 'error');
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            } catch (err) {
                showToast('Lỗi kết nối máy chủ', 'error');
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    // Logout Handle
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('neon_store_token');
            localStorage.removeItem('neon_store_user');
            window.location.href = '/';
        });
    }

});
