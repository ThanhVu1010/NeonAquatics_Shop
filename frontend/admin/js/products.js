function normalizeCode(code) {
    return (code || '').toString().trim();
}

function toSafeInteger(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.floor(num));
}

async function loadProducts() {
    const result = await api('/api/products');
    if (result.success) {
        products = result.data.map(p => ({
            id: p.id,
            code: p.code,
            name: p.name,
            categoryId: p.category_id,
            unit: p.unit,
            price: p.price,
            costPrice: p.cost_price,
            stock: p.stock || 0,
            description: p.description,
            image_url: p.image_url,
            createdAt: p.created_at,
            phanKhuc: p.phan_khuc || '',
            nguonHang: p.nguon_hang || '',
            sanChuLuc: p.san_chu_luc || '',
            nhap: p.nhap || 0,
            usp: p.usp || ''
        }));
    }
    return products;
}

async function populateCategoryFilters() {
    await loadCategories();
    const filterSelect = document.getElementById('filterCategory');
    const productSelect = document.getElementById('productCategory');
    const options = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">Tat ca dong hang</option>' + options;
    }
    if (productSelect) {
        productSelect.innerHTML = '<option value="">-- Chon dong hang --</option>' + options + '<option value="__new__">+ Tao dong hang moi...</option>';
    }
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
        tbody.innerHTML = '<tr><td colspan="12" class="p-8 text-center text-slate-400">Chua co san pham nao</td></tr>';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    tbody.innerHTML = filtered.map((p, index) => {
        const cat = categories.find(c => c.id === p.categoryId);
        const thanhTien = (p.price || 0) * (p.stock || 0);
        return `
            <tr class="border-b border-slate-200 dark:border-primary/10 hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                <td class="px-3 py-3 text-center text-sm border-r border-slate-100 dark:border-primary-accent/10">${index + 1}</td>
                <td class="px-3 py-3 text-sm font-medium border-r border-slate-100 dark:border-primary-accent/10">${cat ? cat.name : '-'}</td>
                <td class="px-3 py-3 border-r border-slate-100 dark:border-primary-accent/10">
                    <div class="font-bold text-sm">${p.name}</div>
                    ${p.code ? `<div class="text-[11px] text-slate-400 mt-0.5">${p.code}</div>` : ''}
                </td>
                <td class="px-3 py-3 text-center text-sm border-r border-slate-100 dark:border-primary-accent/10">
                    ${p.phanKhuc ? `<span class="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-xs font-medium">${p.phanKhuc}</span>` : '<span class="text-slate-300">-</span>'}
                </td>
                <td class="px-3 py-3 text-right text-sm border-r border-slate-100 dark:border-primary-accent/10 font-medium">${p.price ? formatCurrency(p.price) : '-'}</td>
                <td class="px-3 py-3 text-center text-sm border-r border-slate-100 dark:border-primary-accent/10">${p.nguonHang || '-'}</td>
                <td class="px-3 py-3 text-center text-sm border-r border-slate-100 dark:border-primary-accent/10">${p.sanChuLuc || '-'}</td>
                <td class="px-3 py-3 text-center border-r border-slate-100 dark:border-primary-accent/10">
                    ${p.nhap ? '<span class="material-symbols-outlined text-emerald-500 text-lg">check_box</span>' : '<span class="material-symbols-outlined text-slate-300 text-lg">check_box_outline_blank</span>'}
                </td>
                <td class="px-3 py-3 text-center text-sm font-medium border-r border-slate-100 dark:border-primary-accent/10">${p.stock || 0}</td>
                <td class="px-3 py-3 text-right border-r border-slate-100 dark:border-primary-accent/10">
                    <div class="font-bold text-sm ${thanhTien > 0 ? 'text-emerald-600' : 'text-slate-400'}">${thanhTien > 0 ? formatCurrency(thanhTien) : '0'}</div>
                </td>
                <td class="px-3 py-3 text-sm border-r border-slate-100 dark:border-primary-accent/10">${p.usp || '-'}</td>
                <td class="px-3 py-3 text-right">
                    <div class="flex justify-end gap-1.5">
                        <button class="text-slate-400 hover:text-primary-accent transition-colors cursor-pointer p-1" onclick="editProduct('${p.id}')" title="Sua">
                            <span class="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button class="text-slate-400 hover:text-red-500 transition-colors cursor-pointer p-1" onclick="deleteProduct('${p.id}')" title="Xoa">
                            <span class="material-symbols-outlined text-base">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openProductModal(id) {
    populateCategoryFilters();
    const modal = document.getElementById('productModal');
    if (!modal) return;

    modal.style.display = 'flex';
    document.getElementById('productModalTitle').textContent = id ? 'Sua san pham' : 'Them san pham moi';
    document.getElementById('productId').value = id || '';

    const newCatGroup = document.getElementById('newCategoryGroup');
    if (newCatGroup) newCatGroup.style.display = 'none';

    if (id) {
        const p = products.find(pr => pr.id === id);
        if (p) {
            document.getElementById('productCode').value = p.code || '';
            document.getElementById('productName').value = p.name;
            document.getElementById('productCategory').value = p.categoryId || '';
            document.getElementById('productUnit').value = p.unit || '';
            document.getElementById('productPrice').value = p.price ? new Intl.NumberFormat('vi-VN').format(p.price) : '';
            document.getElementById('productCostPrice').value = p.costPrice ? new Intl.NumberFormat('vi-VN').format(p.costPrice) : '';
            document.getElementById('productStock').value = p.stock || 0;
            document.getElementById('productDescription').value = p.description || '';
            document.getElementById('productImageUrl').value = p.image_url || '';
            document.getElementById('productPhanKhuc').value = p.phanKhuc || '';
            document.getElementById('productNguonHang').value = p.nguonHang || '';
            document.getElementById('productSanChuLuc').value = p.sanChuLuc || '';
            document.getElementById('productNhap').checked = !!p.nhap;
            document.getElementById('productUSP').value = p.usp || '';

            const preview = document.getElementById('productImagePreview');
            preview.innerHTML = p.image_url
                ? `<img src="${p.image_url}" class="w-full h-full object-cover">`
                : '<span class="material-symbols-outlined text-slate-400">image</span>';
        }
    } else {
        document.getElementById('productCode').value = '';
        document.getElementById('productName').value = '';
        document.getElementById('productCategory').value = '';
        document.getElementById('productUnit').value = '';
        document.getElementById('productPrice').value = '';
        document.getElementById('productCostPrice').value = '';
        document.getElementById('productStock').value = 0;
        document.getElementById('productDescription').value = '';
        document.getElementById('productImageUrl').value = '';
        document.getElementById('productImage').value = '';
        document.getElementById('productPhanKhuc').value = '';
        document.getElementById('productNguonHang').value = '';
        document.getElementById('productSanChuLuc').value = '';
        document.getElementById('productNhap').checked = false;
        document.getElementById('productUSP').value = '';
        document.getElementById('productImagePreview').innerHTML = '<span class="material-symbols-outlined text-slate-400">image</span>';
    }

    setTimeout(() => document.getElementById('productName').focus(), 100);
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) modal.style.display = 'none';
}

function onCategorySelectChange() {
    const select = document.getElementById('productCategory');
    const newCatGroup = document.getElementById('newCategoryGroup');
    if (select.value === '__new__') {
        newCatGroup.style.display = 'block';
        document.getElementById('newCategoryName').focus();
    } else {
        newCatGroup.style.display = 'none';
    }
}

async function saveProduct() {
    const codeInput = document.getElementById('productCode');
    const name = document.getElementById('productName').value.trim();
    let categoryId = document.getElementById('productCategory').value;
    const price = parseCurrency(document.getElementById('productPrice').value);
    const costPrice = parseCurrency(document.getElementById('productCostPrice').value);
    const stockRaw = Number(document.getElementById('productStock').value || 0);
    const editId = document.getElementById('productId').value;
    const code = normalizeCode(codeInput.value);

    if (!name) return showToast('Vui long nhap ten san pham!', 'error');
    if (!Number.isFinite(stockRaw) || stockRaw < 0) return showToast('So luong ton khong hop le!', 'error');

    if (code) {
        const duplicated = products.some(p => (p.code || '').toLowerCase() === code.toLowerCase() && p.id !== editId);
        if (duplicated) return showToast('Ma san pham da ton tai!', 'error');
    }

    if (categoryId === '__new__') {
        const newCatName = document.getElementById('newCategoryName').value.trim();
        if (!newCatName) return showToast('Vui long nhap ten dong hang moi!', 'error');
        const newCatId = await createCategoryInline(newCatName);
        if (!newCatId) return showToast('Khong the tao dong hang moi!', 'error');
        categoryId = newCatId;
        showToast(`Da tao dong hang "${newCatName}"`);
    }

    if (!categoryId) return showToast('Vui long chon dong hang!', 'error');

    const fileInput = document.getElementById('productImage');
    let finalImageUrl = document.getElementById('productImageUrl').value;
    if (fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);
        try {
            const token = localStorage.getItem('bgm_token');
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: formData
            });
            const data = await res.json();
            if (!data.success) return showToast(data.message || 'Loi tai anh', 'error');
            finalImageUrl = data.url;
        } catch (err) {
            return showToast('Loi mang khi tai anh', 'error');
        }
    }

    codeInput.value = code;
    const productData = {
        code,
        name,
        categoryId,
        unit: document.getElementById('productUnit').value.trim(),
        price,
        costPrice,
        stock: toSafeInteger(stockRaw),
        description: document.getElementById('productDescription').value.trim(),
        image_url: finalImageUrl,
        phanKhuc: document.getElementById('productPhanKhuc').value.trim(),
        nguonHang: document.getElementById('productNguonHang').value.trim(),
        sanChuLuc: document.getElementById('productSanChuLuc').value.trim(),
        nhap: document.getElementById('productNhap').checked ? 1 : 0,
        usp: document.getElementById('productUSP').value.trim()
    };

    const result = editId
        ? await api(`/api/products/${editId}`, { method: 'PUT', body: JSON.stringify(productData) })
        : await api('/api/products', { method: 'POST', body: JSON.stringify(productData) });

    if (result.success) {
        showToast(editId ? 'Da cap nhat san pham!' : 'Da them san pham moi!');
        closeProductModal();
        renderProducts();
    } else {
        showToast(result.message || 'Co loi xay ra!', 'error');
    }
}

function previewProductImage(input) {
    const preview = document.getElementById('productImagePreview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover">`;
        };
        reader.readAsDataURL(input.files[0]);
    } else {
        const oldUrl = document.getElementById('productImageUrl').value;
        preview.innerHTML = oldUrl
            ? `<img src="${oldUrl}" class="w-full h-full object-cover">`
            : '<span class="material-symbols-outlined text-slate-400">image</span>';
    }
}

function editProduct(id) {
    openProductModal(id);
}

async function deleteProduct(id) {
    const p = products.find(pr => pr.id === id);
    if (!p) return;

    if (confirm(`Ban co chac muon xoa san pham "${p.name}"?`)) {
        const result = await api(`/api/products/${id}`, { method: 'DELETE' });
        if (result.success) {
            showToast('Da xoa san pham!');
            renderProducts();
        } else {
            showToast(result.message || 'Loi khi xoa san pham!', 'error');
        }
    }
}
