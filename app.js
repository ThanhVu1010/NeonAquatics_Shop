/* ============================================
   PHẦN MỀM BÁO GIÁ MINI - JavaScript Logic
   Sử dụng Turso Database thông qua Server API
   ============================================ */

// ============= Data Store (cache từ server) =============
let categories = [];
let products = [];
let quotes = [];
let settings = {};
let currentQuoteItems = [];

// ============= API Helper =============
const API_BASE = window.location.origin;

async function api(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            ...options
        });
        return await response.json();
    } catch (err) {
        console.error('API error:', err.message);
        return { success: false, message: 'Không thể kết nối server. Hãy chạy: node server.js' };
    }
}

// ============= Data Loaders =============
async function loadCategories() {
    const result = await api('/api/categories');
    if (result.success) {
        categories = result.data.map(c => ({
            id: c.id, name: c.name, description: c.description, createdAt: c.created_at
        }));
    }
    return categories;
}

async function loadProducts() {
    const result = await api('/api/products');
    if (result.success) {
        products = result.data.map(p => ({
            id: p.id, code: p.code, name: p.name,
            categoryId: p.category_id, unit: p.unit,
            price: p.price, costPrice: p.cost_price,
            description: p.description, createdAt: p.created_at
        }));
    }
    return products;
}

async function loadQuotes() {
    const result = await api('/api/quotes');
    if (result.success) {
        quotes = result.data.map(q => ({
            id: q.id, quoteNumber: q.quote_number, customer: q.customer,
            customerPhone: q.customer_phone, customerAddress: q.customer_address,
            note: q.note, total: q.total, createdAt: q.created_at,
            updatedAt: q.updated_at, items: q.items || []
        }));
    }
    return quotes;
}

async function loadSettingsData() {
    const result = await api('/api/settings');
    if (result.success) {
        settings = result.data;
    }
    return settings;
}

// ============= Utility Functions =============
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
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.innerHTML = `${icons[type] || ''} ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============= Navigation =============
function switchTab(tabName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.toggle('active', tab.id === `tab-${tabName}`);
    });
    const titles = {
        dashboard: 'Tổng quan',
        categories: 'Quản lý danh mục',
        products: 'Quản lý sản phẩm',
        quotes: 'Quản lý báo giá',
        shopee: 'Quản lý Shopee',
        settings: 'Cài đặt'
    };
    document.getElementById('pageTitle').textContent = titles[tabName] || '';

    if (tabName === 'dashboard') renderDashboard();
    if (tabName === 'categories') renderCategories();
    if (tabName === 'products') { populateCategoryFilters(); renderProducts(); }
    if (tabName === 'quotes') renderQuotes();
    if (tabName === 'shopee') { checkShopeeConnection(); renderSyncProducts(); }
    if (tabName === 'settings') loadSettings();

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

// ============= Dashboard =============
async function renderDashboard() {
    const statsResult = await api('/api/dashboard/stats');
    if (statsResult.success) {
        document.getElementById('totalCategories').textContent = statsResult.data.totalCategories;
        document.getElementById('totalProducts').textContent = statsResult.data.totalProducts;
        document.getElementById('totalQuotes').textContent = statsResult.data.totalQuotes;
        document.getElementById('totalRevenue').textContent = formatCurrency(statsResult.data.totalRevenue);
    }

    await loadQuotes();
    await loadProducts();
    await loadCategories();

    // Recent quotes
    const recentQuotesEl = document.getElementById('recentQuotes');
    const recentQuotesData = quotes.slice(0, 5);
    if (recentQuotesData.length === 0) {
        recentQuotesEl.innerHTML = '<p class="empty-state">Chưa có báo giá nào</p>';
    } else {
        recentQuotesEl.innerHTML = recentQuotesData.map(q => `
            <div class="recent-item">
                <div class="recent-item-info">
                    <span class="recent-item-title">${q.customer || 'Không tên'}</span>
                    <span class="recent-item-sub">${formatDate(q.createdAt)}</span>
                </div>
                <span class="recent-item-value">${formatCurrency(q.total)}</span>
            </div>
        `).join('');
    }

    // Recent products
    const recentProductsEl = document.getElementById('recentProducts');
    const recentProductsData = products.slice(0, 5);
    if (recentProductsData.length === 0) {
        recentProductsEl.innerHTML = '<p class="empty-state">Chưa có sản phẩm nào</p>';
    } else {
        recentProductsEl.innerHTML = recentProductsData.map(p => {
            const cat = categories.find(c => c.id === p.categoryId);
            return `
                <div class="recent-item">
                    <div class="recent-item-info">
                        <span class="recent-item-title">${p.name}</span>
                        <span class="recent-item-sub">${cat ? cat.name : 'Chưa phân loại'}</span>
                    </div>
                    <span class="recent-item-value">${formatCurrency(p.price)}</span>
                </div>
            `;
        }).join('');
    }
}

// ============= Categories CRUD =============
async function renderCategories() {
    await loadCategories();
    await loadProducts();
    const search = document.getElementById('searchCategory').value.toLowerCase();
    const filtered = categories.filter(c => c.name.toLowerCase().includes(search));
    const tbody = document.getElementById('categoriesTable');
    const emptyState = document.getElementById('emptyCategoriesState');

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        tbody.innerHTML = filtered.map((cat, index) => {
            const productCount = products.filter(p => p.categoryId === cat.id).length;
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${cat.name}</strong></td>
                    <td style="color:var(--text-muted)">${cat.description || '-'}</td>
                    <td><span style="color:var(--accent-blue);font-weight:600">${productCount}</span></td>
                    <td>
                        <div class="actions">
                            <button class="btn-icon edit" onclick="editCategory('${cat.id}')" title="Sửa">✏️</button>
                            <button class="btn-icon danger" onclick="deleteCategory('${cat.id}')" title="Xóa">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

function openCategoryModal(id) {
    document.getElementById('categoryModal').classList.add('active');
    document.getElementById('categoryModalTitle').textContent = id ? 'Sửa danh mục' : 'Thêm danh mục mới';
    document.getElementById('editCategoryId').value = id || '';
    if (id) {
        const cat = categories.find(c => c.id === id);
        if (cat) {
            document.getElementById('categoryName').value = cat.name;
            document.getElementById('categoryDescription').value = cat.description || '';
        }
    } else {
        document.getElementById('categoryName').value = '';
        document.getElementById('categoryDescription').value = '';
    }
    document.getElementById('categoryName').focus();
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
}

async function saveCategory() {
    const name = document.getElementById('categoryName').value.trim();
    if (!name) { showToast('Vui lòng nhập tên danh mục!', 'error'); return; }

    const editId = document.getElementById('editCategoryId').value;
    const data = {
        name,
        description: document.getElementById('categoryDescription').value.trim()
    };

    let result;
    if (editId) {
        result = await api(`/api/categories/${editId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    } else {
        result = await api('/api/categories', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    if (result.success) {
        showToast(editId ? 'Đã cập nhật danh mục!' : 'Đã thêm danh mục mới!');
        closeCategoryModal();
        renderCategories();
    } else {
        showToast(result.message || 'Lỗi!', 'error');
    }
}

function editCategory(id) { openCategoryModal(id); }

async function deleteCategory(id) {
    const cat = categories.find(c => c.id === id);
    const productCount = products.filter(p => p.categoryId === id).length;
    let msg = `Bạn có chắc muốn xóa danh mục "${cat.name}"?`;
    if (productCount > 0) msg += `\n\n⚠️ Có ${productCount} sản phẩm thuộc danh mục này sẽ mất liên kết.`;
    if (confirm(msg)) {
        try {
            const result = await api(`/api/categories/${id}`, { method: 'DELETE' });
            if (result.success) {
                showToast('Đã xóa danh mục!');
                renderCategories();
            } else {
                showToast(result.message || 'Lỗi khi xóa danh mục!', 'error');
            }
        } catch (err) {
            showToast('Lỗi hệ thống: ' + err.message, 'error');
        }
    }
}

// ============= Products CRUD =============
async function populateCategoryFilters() {
    await loadCategories();
    const filterSelect = document.getElementById('filterCategory');
    const productSelect = document.getElementById('productCategory');

    const options = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    filterSelect.innerHTML = '<option value="">Tất cả danh mục</option>' + options;
    productSelect.innerHTML = '<option value="">-- Chọn danh mục --</option>' + options;
}

async function renderProducts() {
    await loadProducts();
    await loadCategories();
    const search = document.getElementById('searchProduct').value.toLowerCase();
    const filterCat = document.getElementById('filterCategory').value;
    const filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search) || (p.code || '').toLowerCase().includes(search);
        const matchCat = !filterCat || p.categoryId === filterCat;
        return matchSearch && matchCat;
    });

    const tbody = document.getElementById('productsTable');
    const emptyState = document.getElementById('emptyProductsState');

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        tbody.innerHTML = filtered.map((p, index) => {
            const cat = categories.find(c => c.id === p.categoryId);
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td style="font-weight:500;color:var(--accent-cyan)">${p.code || '-'}</td>
                    <td><strong>${p.name}</strong></td>
                    <td>${cat ? cat.name : '<span style="color:var(--text-muted)">-</span>'}</td>
                    <td>${p.unit || '-'}</td>
                    <td class="price-cell">${formatCurrency(p.price)}</td>
                    <td style="color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.description || ''}">${p.description || '-'}</td>
                    <td>
                        <div class="actions">
                            <button class="btn-icon edit" onclick="editProduct('${p.id}')" title="Sửa">✏️</button>
                            <button class="btn-icon danger" onclick="deleteProduct('${p.id}')" title="Xóa">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

function openProductModal(id) {
    populateCategoryFilters();
    document.getElementById('productModal').classList.add('active');
    document.getElementById('productModalTitle').textContent = id ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới';
    document.getElementById('editProductId').value = id || '';

    if (id) {
        const p = products.find(pr => pr.id === id);
        if (p) {
            document.getElementById('productCode').value = p.code || '';
            document.getElementById('productName').value = p.name;
            document.getElementById('productCategory').value = p.categoryId || '';
            document.getElementById('productUnit').value = p.unit || '';
            document.getElementById('productPrice').value = p.price ? new Intl.NumberFormat('vi-VN').format(p.price) : '';
            document.getElementById('productCostPrice').value = p.costPrice ? new Intl.NumberFormat('vi-VN').format(p.costPrice) : '';
            document.getElementById('productDescription').value = p.description || '';
        }
    } else {
        document.getElementById('productCode').value = '';
        document.getElementById('productName').value = '';
        document.getElementById('productCategory').value = '';
        document.getElementById('productUnit').value = '';
        document.getElementById('productPrice').value = '';
        document.getElementById('productCostPrice').value = '';
        document.getElementById('productDescription').value = '';
    }
    document.getElementById('productName').focus();
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

async function saveProduct() {
    const name = document.getElementById('productName').value.trim();
    const categoryId = document.getElementById('productCategory').value;
    const priceStr = document.getElementById('productPrice').value;
    const price = parseCurrency(priceStr);

    if (!name) { showToast('Vui lòng nhập tên sản phẩm!', 'error'); return; }
    if (!categoryId) { showToast('Vui lòng chọn danh mục!', 'error'); return; }
    if (!price) { showToast('Vui lòng nhập giá bán!', 'error'); return; }

    const editId = document.getElementById('editProductId').value;
    const productData = {
        code: document.getElementById('productCode').value.trim(),
        name,
        categoryId,
        unit: document.getElementById('productUnit').value.trim(),
        price,
        costPrice: parseCurrency(document.getElementById('productCostPrice').value),
        description: document.getElementById('productDescription').value.trim()
    };

    let result;
    if (editId) {
        result = await api(`/api/products/${editId}`, {
            method: 'PUT',
            body: JSON.stringify(productData)
        });
    } else {
        result = await api('/api/products', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
    }

    if (result.success) {
        showToast(editId ? 'Đã cập nhật sản phẩm!' : 'Đã thêm sản phẩm mới!');
        closeProductModal();
        renderProducts();
    } else {
        showToast(result.message || 'Lỗi!', 'error');
    }
}

function editProduct(id) { openProductModal(id); }

async function deleteProduct(id) {
    const p = products.find(pr => pr.id === id);
    if (confirm(`Bạn có chắc muốn xóa sản phẩm "${p.name}"?`)) {
        try {
            const result = await api(`/api/products/${id}`, { method: 'DELETE' });
            if (result.success) {
                showToast('Đã xóa sản phẩm!');
                renderProducts();
            } else {
                showToast(result.message || 'Lỗi khi xóa sản phẩm!', 'error');
            }
        } catch (err) {
            showToast('Lỗi hệ thống: ' + err.message, 'error');
        }
    }
}

// ============= Quotes CRUD =============
async function populateQuoteProductSelect() {
    await loadProducts();
    await loadCategories();
    const select = document.getElementById('quoteProductSelect');
    const grouped = {};
    products.forEach(p => {
        const cat = categories.find(c => c.id === p.categoryId);
        const catName = cat ? cat.name : 'Chưa phân loại';
        if (!grouped[catName]) grouped[catName] = [];
        grouped[catName].push(p);
    });

    let html = '<option value="">-- Chọn sản phẩm --</option>';
    Object.keys(grouped).forEach(catName => {
        html += `<optgroup label="${catName}">`;
        grouped[catName].forEach(p => {
            html += `<option value="${p.id}">${p.code ? p.code + ' - ' : ''}${p.name} (${formatCurrency(p.price)})</option>`;
        });
        html += '</optgroup>';
    });
    select.innerHTML = html;
}

function renderQuoteItems() {
    const tbody = document.getElementById('quoteItemsTable');
    if (currentQuoteItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:20px">Chưa có sản phẩm nào trong báo giá</td></tr>';
        document.getElementById('quoteTotal').textContent = formatCurrency(0);
        return;
    }

    let total = 0;
    tbody.innerHTML = currentQuoteItems.map((item, index) => {
        const lineTotal = item.price * item.qty * (1 - item.discount / 100);
        total += lineTotal;
        return `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${item.name}</strong></td>
                <td>${item.unit || '-'}</td>
                <td class="price-cell">${formatCurrency(item.price)}</td>
                <td>${item.qty}</td>
                <td>${item.discount > 0 ? item.discount + '%' : '-'}</td>
                <td class="price-cell">${formatCurrency(lineTotal)}</td>
                <td><button class="btn-icon danger" onclick="removeQuoteItem(${index})">🗑️</button></td>
            </tr>
        `;
    }).join('');

    document.getElementById('quoteTotal').textContent = formatCurrency(total);
}

function addProductToQuote() {
    const productId = document.getElementById('quoteProductSelect').value;
    if (!productId) { showToast('Vui lòng chọn sản phẩm!', 'error'); return; }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    const qty = parseInt(document.getElementById('quoteProductQty').value) || 1;
    const discount = parseFloat(document.getElementById('quoteProductDiscount').value) || 0;

    const existing = currentQuoteItems.find(item => item.productId === productId);
    if (existing) {
        existing.qty += qty;
        showToast('Đã cập nhật số lượng!', 'info');
    } else {
        currentQuoteItems.push({
            productId: product.id,
            code: product.code,
            name: product.name,
            unit: product.unit,
            price: product.price,
            qty,
            discount
        });
        showToast('Đã thêm sản phẩm vào báo giá!');
    }

    document.getElementById('quoteProductQty').value = 1;
    document.getElementById('quoteProductDiscount').value = 0;
    document.getElementById('quoteProductSelect').value = '';
    renderQuoteItems();
}

function removeQuoteItem(index) {
    currentQuoteItems.splice(index, 1);
    renderQuoteItems();
}

async function openQuoteModal(id) {
    await populateQuoteProductSelect();
    document.getElementById('quoteModal').classList.add('active');
    document.getElementById('quoteModalTitle').textContent = id ? 'Sửa báo giá' : 'Tạo báo giá mới';
    document.getElementById('editQuoteId').value = id || '';

    if (id) {
        const q = quotes.find(qt => qt.id === id);
        if (q) {
            document.getElementById('quoteCustomer').value = q.customer || '';
            document.getElementById('quoteCustomerPhone').value = q.customerPhone || '';
            document.getElementById('quoteCustomerAddress').value = q.customerAddress || '';
            document.getElementById('quoteNote').value = q.note || '';
            currentQuoteItems = JSON.parse(JSON.stringify(q.items || []));
        }
    } else {
        document.getElementById('quoteCustomer').value = '';
        document.getElementById('quoteCustomerPhone').value = '';
        document.getElementById('quoteCustomerAddress').value = '';
        document.getElementById('quoteNote').value = settings.defaultNote || '';
        currentQuoteItems = [];
    }
    renderQuoteItems();
}

function closeQuoteModal() {
    document.getElementById('quoteModal').classList.remove('active');
    currentQuoteItems = [];
}

async function saveQuote() {
    const customer = document.getElementById('quoteCustomer').value.trim();
    if (!customer) { showToast('Vui lòng nhập tên khách hàng!', 'error'); return; }
    if (currentQuoteItems.length === 0) { showToast('Vui lòng thêm ít nhất 1 sản phẩm!', 'error'); return; }

    const total = currentQuoteItems.reduce((sum, item) => {
        return sum + item.price * item.qty * (1 - item.discount / 100);
    }, 0);

    const editId = document.getElementById('editQuoteId').value;
    const quoteData = {
        customer,
        customerPhone: document.getElementById('quoteCustomerPhone').value.trim(),
        customerAddress: document.getElementById('quoteCustomerAddress').value.trim(),
        items: JSON.parse(JSON.stringify(currentQuoteItems)),
        total,
        note: document.getElementById('quoteNote').value.trim()
    };

    let result;
    if (editId) {
        result = await api(`/api/quotes/${editId}`, {
            method: 'PUT',
            body: JSON.stringify(quoteData)
        });
    } else {
        // Get next quote number
        const numResult = await api('/api/quotes/next-number');
        quoteData.quoteNumber = numResult.success ? numResult.data.quoteNumber : `BG-${String(quotes.length + 1).padStart(4, '0')}`;
        result = await api('/api/quotes', {
            method: 'POST',
            body: JSON.stringify(quoteData)
        });
    }

    if (result.success) {
        showToast(editId ? 'Đã cập nhật báo giá!' : 'Đã tạo báo giá mới!');
        closeQuoteModal();
        renderQuotes();
    } else {
        showToast(result.message || 'Lỗi!', 'error');
    }
}

async function renderQuotes() {
    await loadQuotes();
    const search = document.getElementById('searchQuote').value.toLowerCase();
    const filtered = quotes.filter(q => {
        return (q.customer || '').toLowerCase().includes(search) ||
            (q.quoteNumber || '').toLowerCase().includes(search);
    });

    const listEl = document.getElementById('quotesList');
    const emptyState = document.getElementById('emptyQuotesState');

    if (filtered.length === 0) {
        listEl.innerHTML = '';
        emptyState.style.display = 'block';
        listEl.appendChild(emptyState);
    } else {
        emptyState.style.display = 'none';
        listEl.innerHTML = filtered.map(q => `
            <div class="quote-card">
                <div class="quote-card-header">
                    <div>
                        <div class="quote-card-title">${q.quoteNumber || 'BG-0001'}</div>
                        <div class="quote-card-date">${formatDate(q.createdAt)}</div>
                    </div>
                </div>
                <div class="quote-card-customer">👤 ${q.customer} ${q.customerPhone ? ' | 📞 ' + q.customerPhone : ''}</div>
                <div class="quote-card-total">${formatCurrency(q.total)}</div>
                <div class="quote-card-items">📦 ${q.items.length} sản phẩm</div>
                <div class="quote-card-actions">
                    <button class="btn-icon view" onclick="previewQuote('${q.id}')" title="Xem">👁️ Xem</button>
                    <button class="btn-icon edit" onclick="editQuote('${q.id}')" title="Sửa">✏️ Sửa</button>
                    <button class="btn-icon" onclick="duplicateQuote('${q.id}')" title="Nhân bản">📋 Nhân bản</button>
                    <button class="btn-icon danger" onclick="deleteQuote('${q.id}')" title="Xóa">🗑️ Xóa</button>
                </div>
            </div>
        `).join('');
    }
}

function editQuote(id) { openQuoteModal(id); }

async function deleteQuote(id) {
    const q = quotes.find(qt => qt.id === id);
    if (confirm(`Bạn có chắc muốn xóa báo giá "${q.quoteNumber}"?`)) {
        try {
            const result = await api(`/api/quotes/${id}`, { method: 'DELETE' });
            if (result.success) {
                showToast('Đã xóa báo giá!');
                renderQuotes();
            } else {
                showToast(result.message || 'Lỗi khi xóa báo giá!', 'error');
            }
        } catch (err) {
            showToast('Lỗi hệ thống: ' + err.message, 'error');
        }
    }
}

async function duplicateQuote(id) {
    const q = quotes.find(qt => qt.id === id);
    if (!q) return;

    const numResult = await api('/api/quotes/next-number');
    const newQuoteData = {
        customer: q.customer + ' (bản sao)',
        customerPhone: q.customerPhone,
        customerAddress: q.customerAddress,
        items: JSON.parse(JSON.stringify(q.items)),
        total: q.total,
        note: q.note,
        quoteNumber: numResult.success ? numResult.data.quoteNumber : `BG-${String(quotes.length + 1).padStart(4, '0')}`
    };

    const result = await api('/api/quotes', {
        method: 'POST',
        body: JSON.stringify(newQuoteData)
    });

    if (result.success) {
        showToast('Đã nhân bản báo giá!');
        renderQuotes();
    }
}

// ============= Quote Preview & Print =============
function previewQuote(id) {
    const q = quotes.find(qt => qt.id === id);
    if (!q) return;

    const companyName = settings.companyName || 'CÔNG TY CỦA BẠN';
    const companyAddress = settings.companyAddress || '';
    const companyPhone = settings.companyPhone || '';
    const companyEmail = settings.companyEmail || '';

    let companyInfoParts = [];
    if (companyAddress) companyInfoParts.push('📍 ' + companyAddress);
    if (companyPhone) companyInfoParts.push('📞 ' + companyPhone);
    if (companyEmail) companyInfoParts.push('✉️ ' + companyEmail);

    const today = new Date();
    const dateStr = `Ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;

    let itemsHtml = '';
    let grandTotal = 0;
    q.items.forEach((item, index) => {
        const lineTotal = item.price * item.qty * (1 - item.discount / 100);
        grandTotal += lineTotal;
        itemsHtml += `
            <tr>
                <td style="text-align:center">${index + 1}</td>
                <td>${item.code ? item.code + ' - ' : ''}${item.name}</td>
                <td style="text-align:center">${item.unit || '-'}</td>
                <td style="text-align:right">${formatCurrency(item.price)}</td>
                <td style="text-align:center">${item.qty}</td>
                <td style="text-align:center">${item.discount > 0 ? item.discount + '%' : '-'}</td>
                <td style="text-align:right"><strong>${formatCurrency(lineTotal)}</strong></td>
            </tr>
        `;
    });

    const html = `
        <div class="qp-header">
            <div class="qp-company">${companyName}</div>
            ${companyInfoParts.length ? '<div class="qp-info">' + companyInfoParts.join(' | ') + '</div>' : ''}
        </div>

        <div class="qp-date">${dateStr}</div>
        <div class="qp-title">BẢNG BÁO GIÁ</div>
        <div style="text-align:center;color:#666;font-size:13px;margin-bottom:20px;">Số: ${q.quoteNumber}</div>

        <div class="qp-customer">
            <p><strong>Khách hàng:</strong> ${q.customer}</p>
            ${q.customerPhone ? `<p><strong>Điện thoại:</strong> ${q.customerPhone}</p>` : ''}
            ${q.customerAddress ? `<p><strong>Địa chỉ:</strong> ${q.customerAddress}</p>` : ''}
        </div>

        <table>
            <thead>
                <tr>
                    <th style="text-align:center;width:50px">STT</th>
                    <th>Sản phẩm</th>
                    <th style="text-align:center;width:70px">ĐVT</th>
                    <th style="text-align:right;width:120px">Đơn giá</th>
                    <th style="text-align:center;width:50px">SL</th>
                    <th style="text-align:center;width:70px">Giảm</th>
                    <th style="text-align:right;width:130px">Thành tiền</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
                <tr class="qp-total-row">
                    <td colspan="6" style="text-align:right"><strong>TỔNG CỘNG:</strong></td>
                    <td style="text-align:right"><strong>${formatCurrency(grandTotal)}</strong></td>
                </tr>
            </tbody>
        </table>

        ${q.note ? `<div class="qp-note"><strong>📌 Ghi chú:</strong> ${q.note}</div>` : ''}

        <div class="qp-footer">
            <div class="qp-sign">
                <div class="qp-sign-title">Khách hàng</div>
                <div style="color:#999;font-size:12px">(Ký, ghi rõ họ tên)</div>
            </div>
            <div class="qp-sign">
                <div class="qp-sign-title">Người lập báo giá</div>
                <div style="color:#999;font-size:12px">(Ký, ghi rõ họ tên)</div>
            </div>
        </div>
    `;

    document.getElementById('quotePreviewContent').innerHTML = html;
    document.getElementById('quotePreviewModal').classList.add('active');
}

function closeQuotePreview() {
    document.getElementById('quotePreviewModal').classList.remove('active');
}

function printQuote() {
    window.print();
}

// ============= Settings =============
async function loadSettings() {
    await loadSettingsData();
    document.getElementById('companyName').value = settings.companyName || '';
    document.getElementById('companyAddress').value = settings.companyAddress || '';
    document.getElementById('companyPhone').value = settings.companyPhone || '';
    document.getElementById('companyEmail').value = settings.companyEmail || '';
    document.getElementById('defaultNote').value = settings.defaultNote || '';
}

async function saveSettings() {
    const settingsData = {
        companyName: document.getElementById('companyName').value.trim(),
        companyAddress: document.getElementById('companyAddress').value.trim(),
        companyPhone: document.getElementById('companyPhone').value.trim(),
        companyEmail: document.getElementById('companyEmail').value.trim(),
        defaultNote: document.getElementById('defaultNote').value.trim()
    };

    const result = await api('/api/settings', {
        method: 'POST',
        body: JSON.stringify(settingsData)
    });

    if (result.success) {
        settings = settingsData;
        showToast('Đã lưu cài đặt!');
    } else {
        showToast(result.message || 'Lỗi!', 'error');
    }
}

// ============= Import / Export =============
async function exportData() {
    const result = await api('/api/data/export');
    if (result.success) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `baogia_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Đã xuất dữ liệu!');
    } else {
        showToast(result.message || 'Lỗi xuất dữ liệu!', 'error');
    }
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const data = JSON.parse(e.target.result);
            if (confirm('Nhập dữ liệu sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại. Bạn có chắc chắn?')) {
                const result = await api('/api/data/import', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                if (result.success) {
                    showToast('Đã nhập dữ liệu thành công!');
                    renderDashboard();
                    switchTab('dashboard');
                } else {
                    showToast(result.message || 'Lỗi!', 'error');
                }
            }
        } catch (err) {
            showToast('File không hợp lệ!', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ============= Clock =============
function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    document.getElementById('currentTime').textContent = `${dateStr} - ${timeStr}`;
}

// ============= Keyboard Shortcuts =============
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeCategoryModal();
        closeProductModal();
        closeQuoteModal();
        closeQuotePreview();
    }
});

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function (e) {
        if (e.target === this) {
            this.classList.remove('active');
            currentQuoteItems = [];
        }
    });
});

// ============= Init =============
async function init() {
    await loadSettingsData();
    renderDashboard();
    updateClock();
    setInterval(updateClock, 1000);
    checkShopeeConnection().catch(() => { });
}

init();

// ============= Shopee Integration =============
let shopeeConnected = false;
let shopeeProducts = [];
let shopeeOrders = [];

// --- Shopee API Helper ---
async function shopeeApi(endpoint, options = {}) {
    return api(endpoint, options);
}

// --- Connection Management ---
async function checkShopeeConnection() {
    const statusText = document.getElementById('shopeeStatusText');
    const badge = document.getElementById('connectionBadge');
    const btnConnect = document.getElementById('btnConnectShopee');
    const btnDisconnect = document.getElementById('btnDisconnectShopee');
    const shopeeBadge = document.getElementById('shopeeBadge');

    if (!statusText) return;

    const result = await api('/api/shopee/auth/status');

    if (result.success && result.data && result.data.connected) {
        shopeeConnected = true;
        statusText.textContent = `Đã kết nối - Shop ID: ${result.data.shopId}`;
        badge.textContent = 'Đã kết nối';
        badge.className = 'connection-badge connected';
        btnConnect.style.display = 'none';
        btnDisconnect.style.display = 'inline-block';
        shopeeBadge.style.display = 'inline';
    } else {
        shopeeConnected = false;
        statusText.textContent = 'Chưa kết nối shop Shopee';
        badge.textContent = 'Chưa kết nối';
        badge.className = 'connection-badge disconnected';
        btnConnect.style.display = 'inline-block';
        btnDisconnect.style.display = 'none';
        shopeeBadge.style.display = 'none';

        if (result.message && result.message.includes('server')) {
            statusText.textContent = '⚠️ Server chưa chạy. Hãy chạy: node server.js';
        } else if (result.success && result.data && !result.data.hasConfig) {
            statusText.textContent = '⚠️ Chưa cấu hình API. Sửa file shopee_config.json';
            btnConnect.style.display = 'none';
        }
    }
}

async function connectShopee() {
    const result = await api('/api/shopee/auth/connect');
    if (result.success && result.data && result.data.authUrl) {
        window.open(result.data.authUrl, 'shopee_auth', 'width=600,height=700');
        showToast('Đang mở trang kết nối Shopee...', 'info');
    } else {
        showToast(result.message || 'Lỗi kết nối. Kiểm tra lại cấu hình API.', 'error');
    }
}

window.checkShopeeConnection = checkShopeeConnection;

async function disconnectShopee() {
    if (!confirm('Bạn có chắc muốn ngắt kết nối shop Shopee?')) return;
    const result = await api('/api/shopee/auth/disconnect', { method: 'POST' });
    if (result.success) {
        showToast('Đã ngắt kết nối Shopee!');
        checkShopeeConnection();
    }
}

// --- Shopee Sub-tabs ---
function switchShopeeTab(tab) {
    document.querySelectorAll('.shopee-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.shopeeTab === tab);
    });
    document.querySelectorAll('.shopee-subtab').forEach(t => {
        t.classList.toggle('active', t.id === `shopee-tab-${tab}`);
    });
    if (tab === 'sync') renderSyncProducts();
}

// --- Shopee Products ---
async function loadShopeeProducts() {
    if (!shopeeConnected) {
        showToast('Vui lòng kết nối shop Shopee trước!', 'error');
        return;
    }
    showToast('Đang tải sản phẩm từ Shopee...', 'info');

    const result = await api('/api/shopee/products');
    const tbody = document.getElementById('shopeeProductsTable');
    const empty = document.getElementById('emptyShopeeProductsState');

    if (result.success && result.data && result.data.items.length > 0) {
        shopeeProducts = result.data.items;
        empty.style.display = 'none';
        tbody.innerHTML = shopeeProducts.map((item, index) => {
            const img = item.image && item.image.image_url_list && item.image.image_url_list[0]
                ? `<img class="shopee-product-img" src="${item.image.image_url_list[0]}" alt="">`
                : '<div class="shopee-product-img" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted)">📦</div>';
            const status = item.item_status === 'NORMAL' ? 'active' : item.item_status || 'unknown';
            const statusClass = status === 'active' ? 'completed' : 'pending';
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${img}</td>
                    <td><strong>${item.item_name || ''}</strong></td>
                    <td class="price-cell">${item.price_info ? formatCurrency(item.price_info[0].original_price * 1) : '-'}</td>
                    <td>${item.stock_info_v2 ? item.stock_info_v2.summary_info.total_available_stock : '-'}</td>
                    <td><span class="order-status-badge ${statusClass}">${status}</span></td>
                    <td>
                        <div class="actions">
                            <button class="btn-icon view" onclick="window.open('https://shopee.vn/product/${item.item_id}','_blank')" title="Xem trên Shopee">🔗</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        showToast(`Đã tải ${shopeeProducts.length} sản phẩm!`);
    } else {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        empty.textContent = result.message || 'Không có sản phẩm nào trên Shopee.';
    }
}

// --- Sync Products ---
function renderSyncProducts() {
    const list = document.getElementById('syncProductList');
    if (products.length === 0) {
        list.innerHTML = '<p class="empty-state">Chưa có sản phẩm nào. Hãy thêm sản phẩm trước.</p>';
        return;
    }
    list.innerHTML = products.map(p => {
        const cat = categories.find(c => c.id === p.categoryId);
        return `
            <label class="sync-product-item">
                <input type="checkbox" value="${p.id}">
                <span class="sync-product-name">
                    ${p.code ? '<strong>' + p.code + '</strong> - ' : ''}${p.name}
                    ${cat ? '<small style="color:var(--text-muted)"> (' + cat.name + ')</small>' : ''}
                </span>
                <span class="sync-product-price">${formatCurrency(p.price)}</span>
            </label>
        `;
    }).join('');
}

async function syncSelectedToShopee() {
    if (!shopeeConnected) {
        showToast('Vui lòng kết nối shop Shopee trước!', 'error');
        return;
    }

    const checkboxes = document.querySelectorAll('#syncProductList input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showToast('Vui lòng chọn ít nhất 1 sản phẩm để đồng bộ!', 'error');
        return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const checkbox of checkboxes) {
        const product = products.find(p => p.id === checkbox.value);
        if (!product) continue;

        const result = await api('/api/shopee/products/add', {
            method: 'POST',
            body: JSON.stringify(product)
        });

        if (result.success) {
            successCount++;
        } else {
            failCount++;
            console.warn(`Sync failed for ${product.name}:`, result.message);
        }
    }

    if (successCount > 0) showToast(`Đã đồng bộ ${successCount} sản phẩm lên Shopee!`);
    if (failCount > 0) showToast(`${failCount} sản phẩm đồng bộ thất bại.`, 'error');
}

// --- Shopee Orders ---
async function loadShopeeOrders() {
    if (!shopeeConnected) {
        showToast('Vui lòng kết nối shop Shopee trước!', 'error');
        return;
    }
    showToast('Đang tải đơn hàng...', 'info');

    const result = await api('/api/shopee/orders');
    const list = document.getElementById('shopeeOrdersList');
    const empty = document.getElementById('emptyOrdersState');

    if (result.success && result.data && result.data.orders && result.data.orders.length > 0) {
        shopeeOrders = result.data.orders;
        empty.style.display = 'none';
        list.innerHTML = shopeeOrders.map(order => {
            const statusMap = {
                'READY_TO_SHIP': { text: 'Sẵn sàng gửi', cls: 'pending' },
                'SHIPPED': { text: 'Đang giao', cls: 'shipped' },
                'COMPLETED': { text: 'Hoàn thành', cls: 'completed' },
                'CANCELLED': { text: 'Đã hủy', cls: 'cancelled' },
                'IN_CANCEL': { text: 'Đang hủy', cls: 'cancelled' },
                'UNPAID': { text: 'Chưa TT', cls: 'pending' }
            };
            const st = statusMap[order.order_status] || { text: order.order_status || 'N/A', cls: 'pending' };
            return `
                <div class="order-card">
                    <div class="order-info">
                        <div class="order-id">#${order.order_sn || ''}</div>
                        <div class="order-customer">👤 ${order.buyer_username || 'N/A'}</div>
                        <div class="order-date">${order.create_time ? formatDate(new Date(order.create_time * 1000).toISOString()) : ''}</div>
                    </div>
                    <span class="order-status-badge ${st.cls}">${st.text}</span>
                    <div class="order-total">${order.total_amount ? formatCurrency(order.total_amount) : '-'}</div>
                </div>
            `;
        }).join('');
        showToast(`Đã tải ${shopeeOrders.length} đơn hàng!`);
    } else {
        list.innerHTML = '';
        empty.style.display = 'block';
        empty.textContent = result.message || 'Không có đơn hàng nào.';
    }
}
