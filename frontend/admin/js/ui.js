function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function parseCurrency(str) {
    if (!str) return 0;
    return parseInt(str.toString().replace(/[^\d]/g, '')) || 0;
}

function formatPriceInput(input) {
    const raw = input.value.replace(/[^\d]/g, '');
    if (raw) {
        input.value = new Intl.NumberFormat('vi-VN').format(parseInt(raw));
    }
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return; // For login page
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.innerHTML = `${icons[type] || ''} ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function switchTab(tabName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        const isActive = item.dataset.tab === tabName;
        if (isActive) {
            item.classList.add('bg-primary/10', 'text-primary', 'border', 'border-primary/20');
            item.classList.remove('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-primary/5', 'hover:text-primary');
        } else {
            item.classList.remove('bg-primary/10', 'text-primary', 'border', 'border-primary/20');
            item.classList.add('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-primary/5', 'hover:text-primary');
        }
    });
    document.querySelectorAll('.tab-content').forEach(tab => {
        if (tab.id === `tab-${tabName}`) {
            tab.classList.remove('hidden');
            tab.classList.add('block');
        } else {
            tab.classList.remove('block');
            tab.classList.add('hidden');
        }
    });
    const titles = {
        dashboard: 'Tổng quan',
        categories: 'Quản lý danh mục',
        products: 'Quản lý sản phẩm',
        quotes: 'Quản lý báo giá',
        shopee: 'Quản lý Shopee',
        settings: 'Cài đặt'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[tabName] || '';

    if (tabName === 'dashboard') renderDashboard();
    if (tabName === 'categories') renderCategories();
    if (tabName === 'products') { populateCategoryFilters(); renderProducts(); }
    if (tabName === 'quotes') renderQuotes();
    if (tabName === 'shopee') { checkShopeeConnection(); renderSyncProducts(); }
    if (tabName === 'settings') loadSettings();

    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

function updateClock() {
    const el = document.getElementById('currentTime');
    if (!el) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    el.textContent = `${dateStr} - ${timeStr}`;
}
