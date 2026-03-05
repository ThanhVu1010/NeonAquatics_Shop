async function loadProducts() {
    const result = await api('/api/products');
    if (result.success) {
        products = result.data.map(p => ({
            id: p.id, code: p.code, name: p.name,
            categoryId: p.category_id, unit: p.unit,
            price: p.price, costPrice: p.cost_price, stock: p.stock || 0,
            description: p.description, image_url: p.image_url, createdAt: p.created_at
        }));
    }
    return products;
}

async function populateCategoryFilters() {
    await loadCategories();
    const filterSelect = document.getElementById('filterCategory');
    const productSelect = document.getElementById('productCategory');
    if (!filterSelect || !productSelect) return;

    const options = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    filterSelect.innerHTML = '<option value="">Tất cả danh mục</option>' + options;
    productSelect.innerHTML = '<option value="">-- Chọn danh mục --</option>' + options;
}

async function renderProducts() {
    await loadProducts();
    await loadCategories();
    const searchEl = document.getElementById('searchProduct');
    const filterCatEl = document.getElementById('filterCategory');
    const search = searchEl ? searchEl.value.toLowerCase() : '';
    const filterCat = filterCatEl ? filterCatEl.value : '';
    const filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search) || (p.code || '').toLowerCase().includes(search);
        const matchCat = !filterCat || p.categoryId === filterCat;
        return matchSearch && matchCat;
    });

    const tbody = document.getElementById('productsTable');
    const emptyState = document.getElementById('emptyProductsState');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        tbody.innerHTML = filtered.map((p, index) => {
            const cat = categories.find(c => c.id === p.categoryId);
            return `
            <tr class="border-b border-slate-200 dark:border-primary/10 hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                <td class="p-4 text-center text-sm">${index + 1}</td>
                <td class="p-4 text-center">
                    ${p.image_url ? `<img src="${p.image_url}" class="w-12 h-12 object-cover rounded-lg shadow-sm mx-auto border border-slate-200">` : `<div class="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mx-auto border border-slate-200"><span class="material-symbols-outlined text-slate-400">image</span></div>`}
                </td>
                <td class="p-4">
                    <div class="font-bold text-sm text-slate-800">${p.name}</div>
                    <div class="text-[11px] text-slate-500 mt-1 uppercase font-semibold tracking-wider">${p.code ? 'Mã: ' + p.code : ''}${p.code && p.unit ? ' | ' : ''}${p.unit ? 'ĐVT: ' + p.unit : ''}</div>
                </td>
                <td class="p-4 text-sm">${cat ? cat.name : '<span class="text-slate-400">-</span>'}</td>
                <td class="p-4 text-right">
                    <div class="font-bold text-emerald-600 text-sm">${formatCurrency(p.price)}</div>
                </td>
                <td class="p-4 text-center text-sm font-medium">${p.stock || 0}</td>
                <td class="p-4 text-center text-sm">
                    <span class="px-2 py-1 rounded ${(p.stock || 0) <= 5 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'} font-bold text-[10px] uppercase tracking-wider">${(p.stock || 0) <= 5 ? 'Sắp hết' : 'Còn hàng'}</span>
                </td>
                <td class="p-4 text-right text-sm w-24">
                    <div class="flex justify-end gap-2">
                        <button class="text-slate-400 hover:text-primary transition-colors cursor-pointer" onclick="editProduct('${p.id}')" title="Sửa">
                            <span class="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button class="text-slate-400 hover:text-red-500 transition-colors cursor-pointer" onclick="deleteProduct('${p.id}')" title="Xóa">
                            <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    }
}

function openProductModal(id) {
    populateCategoryFilters();
    const modal = document.getElementById('productModal');
    if (!modal) return;
    modal.classList.add('active');
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
            document.getElementById('productImageUrl').value = p.image_url || '';

            const preview = document.getElementById('productImagePreview');
            if (p.image_url) {
                preview.innerHTML = `<img src="${p.image_url}" class="w-full h-full object-cover">`;
            } else {
                preview.innerHTML = `<span class="material-symbols-outlined text-slate-400">image</span>`;
            }
        }
    } else {
        document.getElementById('productCode').value = '';
        document.getElementById('productName').value = '';
        document.getElementById('productCategory').value = '';
        document.getElementById('productUnit').value = '';
        document.getElementById('productPrice').value = '';
        document.getElementById('productCostPrice').value = '';
        document.getElementById('productDescription').value = '';
        document.getElementById('productImageUrl').value = '';
        document.getElementById('productImage').value = '';
        document.getElementById('productImagePreview').innerHTML = `<span class="material-symbols-outlined text-slate-400">image</span>`;
    }
    setTimeout(() => document.getElementById('productName').focus(), 100);
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) modal.classList.remove('active');
}

async function saveProduct() {
    const name = document.getElementById('productName').value.trim();
    const categoryId = document.getElementById('productCategory').value;
    const priceStr = document.getElementById('productPrice').value;
    const price = parseCurrency(priceStr);

    if (!name) { showToast('Vui lòng nhập tên sản phẩm!', 'error'); return; }
    if (!categoryId) { showToast('Vui lòng chọn danh mục!', 'error'); return; }
    if (!price) { showToast('Vui lòng nhập giá bán!', 'error'); return; }

    const fileInput = document.getElementById('productImage');
    let finalImageUrl = document.getElementById('productImageUrl').value;

    if (fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);
        try {
            const token = localStorage.getItem('bgm_token');
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                finalImageUrl = data.url;
            } else {
                showToast(data.message || 'Lỗi tải ảnh', 'error');
                return;
            }
        } catch (err) {
            showToast('Lỗi mạng khi tải ảnh', 'error');
            return;
        }
    }

    const editId = document.getElementById('editProductId').value;
    const productData = {
        code: document.getElementById('productCode').value.trim(),
        name,
        categoryId,
        unit: document.getElementById('productUnit').value.trim(),
        price,
        costPrice: parseCurrency(document.getElementById('productCostPrice').value),
        description: document.getElementById('productDescription').value.trim(),
        image_url: finalImageUrl
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

function previewProductImage(input) {
    const preview = document.getElementById('productImagePreview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover">`;
        }
        reader.readAsDataURL(input.files[0]);
    } else {
        const oldUrl = document.getElementById('productImageUrl').value;
        if (oldUrl) {
            preview.innerHTML = `<img src="${oldUrl}" class="w-full h-full object-cover">`;
        } else {
            preview.innerHTML = `<span class="material-symbols-outlined text-slate-400">image</span>`;
        }
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
