const API_BASE = '/api/storefront';

let products = [];
let categories = [];
let cart = JSON.parse(localStorage.getItem('neon_cart')) || [];

// Formatting
const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

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

// Data Fetching
async function fetchData() {
    try {
        const [catRes, prodRes] = await Promise.all([
            fetch(`${API_BASE}/categories`).then(res => res.json()),
            fetch(`${API_BASE}/products`).then(res => res.json())
        ]);

        if (catRes.success) {
            categories = catRes.data;
            renderCategories();
        }
        if (prodRes.success) {
            products = prodRes.data;
            renderProducts();
        }
    } catch (err) {
        console.error('Lỗi tải dữ liệu:', err);
    }
}

// Rendering
function renderCategories() {
    const filters = document.getElementById('categoryFilters');
    if (!filters) return;

    let html = `<button onclick="filterProducts('all')" class="cat-btn px-4 py-2 rounded-full bg-primary/20 text-primary border border-primary/50 text-sm font-medium transition-all" data-id="all">Tất cả</button>`;

    categories.forEach(c => {
        html += `<button onclick="filterProducts('${c.id}')" class="cat-btn px-4 py-2 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-sm hover:bg-slate-700 transition-all" data-id="${c.id}">${c.name}</button>`;
    });

    filters.innerHTML = html;
}

let currentFilter = 'all';
window.filterProducts = function (catId) {
    currentFilter = catId;
    document.querySelectorAll('.cat-btn').forEach(btn => {
        if (btn.dataset.id === catId) {
            btn.className = 'cat-btn px-4 py-2 rounded-full bg-primary/20 text-primary border border-primary/50 text-sm font-medium shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all';
        } else {
            btn.className = 'cat-btn px-4 py-2 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-sm hover:bg-slate-700 transition-all';
        }
    });
    renderProducts();
};

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    let displayProds = products;
    if (currentFilter !== 'all') {
        displayProds = products.filter(p => p.category_id === currentFilter);
    }

    if (displayProds.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-10 text-center text-slate-500">Không có sản phẩm nào.</div>`;
        return;
    }

    grid.innerHTML = displayProds.map(p => `
        <div class="glass-card rounded-2xl p-4 group hover:shadow-[0_0_20px_rgba(14,165,233,0.2)] hover:border-primary/30 transition-all duration-300 transform hover:-translate-y-1">
            <div class="relative w-full aspect-square bg-dark/50 rounded-xl mb-4 overflow-hidden border border-slate-800 group-hover:border-primary/30">
                ${p.image_url ?
            `<img src="${p.image_url}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">` :
            `<div class="w-full h-full flex flex-col items-center justify-center text-slate-600">
                        <span class="material-symbols-outlined !text-4xl mb-1">image</span>
                        <span class="text-xs">Chưa có ảnh</span>
                     </div>`
        }
                ${p.stock > 0 ? '' : `<div class="absolute top-2 right-2 bg-red-500/80 text-white text-xs px-2 py-1 rounded backdrop-blur border border-red-400">Hết Hàng</div>`}
            </div>
            
            <div class="text-xs text-primary mb-1 uppercase tracking-wider">${p.category_name || 'Khác'}</div>
            <h3 class="font-bold text-slate-200 mb-2 truncate" title="${p.name}">${p.name}</h3>
            
            <div class="flex items-center justify-between mt-auto pt-2">
                <div class="text-lg font-bold text-secondary">${formatCurrency(p.price)}</div>
                ${p.stock > 0 ?
            `<button onclick="addToCart('${p.id}')" class="w-10 h-10 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                        <span class="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                    </button>` :
            `<button disabled class="w-10 h-10 rounded-full bg-slate-800 text-slate-600 border border-slate-700 flex items-center justify-center cursor-not-allowed">
                        <span class="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                    </button>`
        }
            </div>
        </div>
    `).join('');
}

// Cart Logic
window.addToCart = function (productId) {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const existing = cart.find(i => i.id === productId);
    if (existing) {
        if (existing.qty >= prod.stock) {
            showToast('Số lượng đặt đã vượt quá tồn kho hiện tại', 'error');
            return;
        }
        existing.qty++;
    } else {
        cart.push({ id: prod.id, name: prod.name, price: prod.price, code: prod.code, unit: prod.unit, qty: 1, stock: prod.stock, image_url: prod.image_url });
    }

    saveCart();
    showToast(`Đã thêm ${prod.name} vào giỏ`, 'success');
};

window.updateQty = function (productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
        cart = cart.filter(i => i.id !== productId);
    } else if (item.qty > item.stock) {
        item.qty = item.stock;
        showToast('Vượt quá tồn kho', 'error');
    }
    saveCart();
};

window.removeFromCart = function (productId) {
    cart = cart.filter(i => i.id !== productId);
    saveCart();
};

function saveCart() {
    localStorage.setItem('neon_cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const countEl = document.getElementById('cartCount');
    const itemsEl = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');

    if (countEl) countEl.textContent = cart.reduce((sum, item) => sum + item.qty, 0);

    if (itemsEl) {
        if (cart.length === 0) {
            itemsEl.innerHTML = `<div class="text-center text-slate-500 py-10">Giỏ hàng trống</div>`;
            if (totalEl) totalEl.textContent = '0 ₫';
            return;
        }

        let total = 0;
        itemsEl.innerHTML = cart.map(item => {
            total += item.price * item.qty;
            return `
            <div class="flex gap-3 bg-dark/50 p-3 rounded-xl border border-slate-800">
                <div class="w-16 h-16 rounded-lg bg-darker overflow-hidden border border-slate-700 flex-shrink-0">
                   ${item.image_url ? `<img src="${item.image_url}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-slate-600"><span class="material-symbols-outlined">image</span></div>`}
                </div>
                <div class="flex-grow flex flex-col justify-between">
                    <div class="flex justify-between items-start">
                        <h4 class="text-sm font-bold text-slate-200 line-clamp-2 pr-2">${item.name}</h4>
                        <button onclick="removeFromCart('${item.id}')" class="text-slate-500 hover:text-red-500 transition-colors">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    </div>
                    <div class="flex justify-between items-end mt-2">
                        <div class="text-primary font-bold text-sm">${formatCurrency(item.price)}</div>
                        <div class="flex items-center gap-2 bg-darker rounded-lg border border-slate-700 p-1">
                            <button onclick="updateQty('${item.id}', -1)" class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded"><span class="material-symbols-outlined text-[16px]">remove</span></button>
                            <span class="text-white text-xs font-bold w-4 text-center">${item.qty}</span>
                            <button onclick="updateQty('${item.id}', 1)" class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded"><span class="material-symbols-outlined text-[16px]">add</span></button>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');

        if (totalEl) totalEl.textContent = formatCurrency(total);
    }
}

// Sidebar Setup
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    updateCartUI();

    // Auth UI Updates
    const token = localStorage.getItem('neon_store_token');
    const userStr = localStorage.getItem('neon_store_user');
    const authMenu = document.getElementById('authMenu');

    if (token && userStr && authMenu) {
        try {
            const user = JSON.parse(userStr);
            authMenu.innerHTML = `
                <a href="profile.html" class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-all text-primary">
                    <span class="material-symbols-outlined text-[20px]">person</span>
                    <span class="text-sm font-bold">${user.name || user.username}</span>
                </a>
            `;
        } catch (e) { }
    }

    // UI Interactions
    const cartBtn = document.getElementById('cartBtn');
    const closeCartBtn = document.getElementById('closeCartBtn');
    const cartSidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    const checkoutBtn = document.getElementById('checkoutBtn');

    if (cartBtn) cartBtn.addEventListener('click', () => {
        cartSidebar.style.transform = 'translateX(0)';
        overlay.classList.add('active');
    });

    const closeCart = () => {
        cartSidebar.style.transform = 'translateX(100%)';
        overlay.classList.remove('active');
    };

    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
    if (overlay) overlay.addEventListener('click', closeCart);

    if (checkoutBtn) checkoutBtn.addEventListener('click', async () => {
        if (cart.length === 0) {
            showToast('Giỏ hàng đang trống', 'error');
            return;
        }

        if (!token) {
            showToast('Bạn cần đăng nhập để đặt hàng', 'info');
            window.location.href = 'login.html';
            return;
        }

        checkoutBtn.disabled = true;
        checkoutBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> Đang xử lý...';

        try {
            const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
            const items = cart.map(i => ({ product_id: i.id, code: i.code, name: i.name, unit: i.unit, price: i.price, qty: i.qty }));

            const res = await fetch(`${API_BASE}/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ items, total, note: '' })
            });
            const data = await res.json();

            if (data.success) {
                cart = [];
                saveCart();
                closeCart();
                showToast(data.message, 'success');
                setTimeout(() => window.location.href = 'profile.html', 1500);
            } else {
                showToast(data.message, 'error');
                checkoutBtn.disabled = false;
                checkoutBtn.innerHTML = 'Tiến Hành Đặt Hàng <span class="material-symbols-outlined">arrow_forward</span>';
            }
        } catch (err) {
            showToast('Lỗi kết nối', 'error');
            checkoutBtn.disabled = false;
        }
    });

});
