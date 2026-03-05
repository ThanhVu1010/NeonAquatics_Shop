function checkAuth() {
    const token = localStorage.getItem('bgm_token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function logout() {
    localStorage.removeItem('bgm_token');
    localStorage.removeItem('bgm_user');
    window.location.href = 'login.html';
}
