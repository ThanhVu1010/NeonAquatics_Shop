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

function focusGlobalSearch() {
    const activeTab = document.querySelector('.tab-content.block');
    const activeTabId = activeTab ? activeTab.id : '';
    const searchMap = {
        'tab-products': 'searchProduct',
        'tab-quotes': 'searchQuote',
        'tab-customers': 'searchCustomer',
        'tab-categories': 'searchCategory'
    };

    let targetInputId = searchMap[activeTabId];
    if (!targetInputId) {
        switchTab('products');
        targetInputId = 'searchProduct';
    }

    setTimeout(() => {
        const input = document.getElementById(targetInputId);
        if (input) {
            input.focus();
            if (typeof input.select === 'function') input.select();
        }
    }, 120);
}

function showNotificationHint() {
    showToast('Tính năng thông báo đang được phát triển', 'info');
}

async function openQuickQuote() {
    switchTab('quotes');
    if (typeof openQuoteModal === 'function') {
        await openQuoteModal();
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        const isActive = item.dataset.tab === tabName;
        if (isActive) {
            item.classList.add('bg-primary/10', 'text-primary-accent', 'border', 'border-primary-accent/20');
            item.classList.remove('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-primary/5', 'hover:text-primary-accent');
        } else {
            item.classList.remove('bg-primary/10', 'text-primary-accent', 'border', 'border-primary-accent/20');
            item.classList.add('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-primary/5', 'hover:text-primary-accent');
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
        analytics: 'Phân tích kinh doanh',
        products: 'Quản lý nguồn hàng',
        quotes: 'Quản lý báo giá',
        customers: 'Quản lý khách hàng',
        shopee: 'Quản lý Shopee',
        settings: 'Cài đặt'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[tabName] || '';

    if (tabName === 'dashboard') renderDashboard();
    if (tabName === 'analytics' && typeof renderAnalytics === 'function') renderAnalytics();
    if (tabName === 'categories') renderCategories();
    if (tabName === 'products') { populateCategoryFilters(); renderProducts(); }
    if (tabName === 'quotes') renderQuotes();
    if (tabName === 'shopee' && typeof checkShopeeConnection === 'function' && typeof renderSyncProducts === 'function') {
        checkShopeeConnection();
        renderSyncProducts();
    }
    if (tabName === 'settings') loadSettings();

    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

function isMobileViewport() {
    return window.matchMedia('(max-width: 767px)').matches;
}

function syncDesktopSidebarToggleIcon() {
    const icon = document.getElementById('desktopSidebarToggleIcon');
    if (!icon) return;
    const isCollapsed = document.body.classList.contains('admin-sidebar-collapsed');
    icon.textContent = isCollapsed ? 'left_panel_close' : 'left_panel_open';
}

function toggleDesktopSidebar() {
    if (isMobileViewport()) return;
    document.body.classList.toggle('admin-sidebar-collapsed');
    syncDesktopSidebarToggleIcon();
}

function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar || !isMobileViewport()) return;

    sidebar.classList.remove('-translate-x-full');
    if (overlay) overlay.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;

    sidebar.classList.add('-translate-x-full');
    if (overlay) overlay.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar || !isMobileViewport()) return;

    if (sidebar.classList.contains('-translate-x-full')) {
        openSidebar();
    } else {
        closeSidebar();
    }
}

window.addEventListener('resize', () => {
    if (!isMobileViewport()) {
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) overlay.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }
    syncDesktopSidebarToggleIcon();
});

syncDesktopSidebarToggleIcon();

function updateClock() {
    const el = document.getElementById('currentTime');
    if (!el) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    el.textContent = `${dateStr} - ${timeStr}`;
}
