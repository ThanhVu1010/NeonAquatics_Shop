const API_BASE = window.location.origin;

async function api(endpoint, options = {}) {
    try {
        const token = localStorage.getItem('bgm_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers,
            cache: 'no-store',
            ...options
        });

        if (response.status === 401 && endpoint !== '/api/auth/login') {
            logout();
            return { success: false, message: 'Phiên đăng nhập hết hạn.' };
        }

        return await response.json();
    } catch (err) {
        console.error('API error:', err.message);
        return { success: false, message: 'Không thể kết nối server. Hãy kiểm tra kết nối mạng hoặc thử lại.' };
    }
}
