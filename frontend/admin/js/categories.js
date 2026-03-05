async function loadCategories() {
    const result = await api('/api/categories');
    if (result.success) {
        categories = result.data.map(c => ({
            id: c.id, name: c.name, description: c.description, createdAt: c.created_at
        }));
    }
    return categories;
}

async function renderCategories() {
    await loadCategories();
    await loadProducts();
    const searchEl = document.getElementById('searchCategory');
    const search = searchEl ? searchEl.value.toLowerCase() : '';
    const filtered = categories.filter(c => c.name.toLowerCase().includes(search));
    const tbody = document.getElementById('categoriesTable');
    const emptyState = document.getElementById('emptyCategoriesState');

    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        tbody.innerHTML = filtered.map((cat, index) => {
            const productCount = products.filter(p => p.categoryId === cat.id).length;
            return `
            <tr class="border-b border-slate-200 dark:border-primary/10 hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                <td class="px-4 py-3 font-semibold text-center w-12">${index + 1}</td>
                <td class="p-4 text-sm font-bold">${cat.name}</td>
                <td class="p-4 text-sm text-slate-500 dark:text-slate-400">${cat.description || '-'}</td>
                <td class="p-4 text-sm text-center">
                    <span class="px-2 py-1 rounded bg-primary/10 text-primary font-medium text-xs">${productCount}</span>
                </td>
                <td class="p-4 text-sm text-right w-24">
                    <div class="flex justify-end gap-2">
                        <button class="text-slate-400 hover:text-primary transition-colors cursor-pointer" onclick="editCategory('${cat.id}')" title="Sửa">
                            <span class="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button class="text-slate-400 hover:text-red-500 transition-colors cursor-pointer" onclick="deleteCategory('${cat.id}')" title="Xóa">
                            <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    }
}

function openCategoryModal(id) {
    const modal = document.getElementById('categoryModal');
    if (!modal) return;
    modal.classList.add('active');
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
    setTimeout(() => document.getElementById('categoryName').focus(), 100);
}

function closeCategoryModal() {
    const modal = document.getElementById('categoryModal');
    if (modal) modal.classList.remove('active');
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
