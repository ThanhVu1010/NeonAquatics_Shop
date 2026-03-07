async function loadCategories() {
    const result = await api('/api/categories');
    if (result.success) {
        categories = result.data.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            createdAt: c.created_at
        }));
    }
    return categories;
}

async function renderCategories() {
    // "Categories" is now shown as "Dong hang" in the Products tab.
    await loadCategories();
}

async function createCategoryInline(name) {
    const data = { name, description: '' };
    const result = await api('/api/categories', {
        method: 'POST',
        body: JSON.stringify(data)
    });
    if (result.success) {
        await loadCategories();
        return result.data.id;
    }
    return null;
}

async function deleteCategory(id) {
    const cat = categories.find(c => c.id === id);
    const productCount = products.filter(p => p.categoryId === id).length;
    let msg = `Ban co chac muon xoa dong hang "${cat.name}"?`;
    if (productCount > 0) {
        msg += `\n\nCanh bao: Co ${productCount} san pham thuoc dong hang nay se mat lien ket.`;
    }

    if (confirm(msg)) {
        try {
            const result = await api(`/api/categories/${id}`, { method: 'DELETE' });
            if (result.success) {
                showToast('Da xoa dong hang!');
                renderProducts();
            } else {
                showToast(result.message || 'Loi khi xoa dong hang!', 'error');
            }
        } catch (err) {
            showToast('Loi he thong: ' + err.message, 'error');
        }
    }
}
