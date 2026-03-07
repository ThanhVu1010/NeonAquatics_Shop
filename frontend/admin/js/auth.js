async function checkAuth() {
    const token = localStorage.getItem('bgm_token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }

    try {
        const res = await fetch('/api/auth/verify', {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store'
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
            logout();
            return false;
        }

        if (data.data && data.data.user) {
            localStorage.setItem('bgm_user', JSON.stringify(data.data.user));
        }

        return true;
    } catch (err) {
        logout();
        return false;
    }
}

function logout() {
    localStorage.removeItem('bgm_token');
    localStorage.removeItem('bgm_user');
    window.location.href = 'login.html';
}
