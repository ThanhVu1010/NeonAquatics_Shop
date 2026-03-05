async function renderDashboard() {
    const statsResult = await api('/api/dashboard/stats');
    if (statsResult.success) {
        if (document.getElementById('totalCategories')) document.getElementById('totalCategories').textContent = statsResult.data.totalCategories;
        if (document.getElementById('totalProducts')) document.getElementById('totalProducts').textContent = statsResult.data.totalProducts;
        if (document.getElementById('totalQuotes')) document.getElementById('totalQuotes').textContent = statsResult.data.totalQuotes;
        if (document.getElementById('totalRevenue')) document.getElementById('totalRevenue').textContent = formatCurrency(statsResult.data.totalRevenue);
    }

    await loadQuotes();
    await loadProducts();
    await loadCategories();
    await loadCustomers();

    if (document.getElementById('totalCustomers')) document.getElementById('totalCustomers').textContent = customers.length;

    // Recent quotes
    const recentQuotesEl = document.getElementById('recentQuotes');
    if (recentQuotesEl) {
        const recentQuotesData = quotes.slice(0, 5);
        if (recentQuotesData.length === 0) {
            recentQuotesEl.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">Chưa có báo giá nào</p>';
        } else {
            recentQuotesEl.innerHTML = recentQuotesData.map(q => `
                <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div class="flex items-center gap-3">
                        <div class="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <span class="material-symbols-outlined text-xl">description</span>
                        </div>
                        <div>
                            <p class="text-sm font-bold">${q.customer || 'Không tên'}</p>
                            <p class="text-xs text-slate-500 dark:text-slate-400">${formatDate(q.createdAt)}</p>
                        </div>
                    </div>
                    <span class="text-sm font-bold text-primary">${formatCurrency(q.total)}</span>
                </div>
            `).join('');
        }
    }

    // Recent products
    const recentProductsEl = document.getElementById('recentProducts');
    if (recentProductsEl) {
        const recentProductsData = products.slice(0, 5);
        if (recentProductsData.length === 0) {
            recentProductsEl.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">Chưa có sản phẩm nào</p>';
        } else {
            recentProductsEl.innerHTML = recentProductsData.map(p => {
                const cat = categories.find(c => c.id === p.categoryId);
                return `
                <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div class="flex items-center gap-3">
                        <div class="size-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <span class="material-symbols-outlined text-xl">inventory_2</span>
                        </div>
                        <div>
                            <p class="text-sm font-bold">${p.name}</p>
                            <p class="text-xs text-slate-500 dark:text-slate-400">${cat ? cat.name : 'Chưa phân loại'}</p>
                        </div>
                    </div>
                    <span class="text-sm font-bold text-emerald-500">${formatCurrency(p.price)}</span>
                </div>
                `;
            }).join('');
        }
    }

    // Low stock products warning
    const lowStockProductsEl = document.getElementById('lowStockProducts');
    if (lowStockProductsEl) {
        const lowStockData = products.filter(p => (p.stock || 0) <= 5);
        if (lowStockData.length === 0) {
            lowStockProductsEl.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">Tất cả sản phẩm đều đủ kho</p>';
        } else {
            lowStockProductsEl.innerHTML = lowStockData.map(p => {
                const isOutOfStock = (p.stock || 0) <= 0;
                const stockColorClass = isOutOfStock ? 'border-red-500' : 'border-orange-500';
                const iconBgClass = isOutOfStock ? 'bg-red-500/10' : 'bg-orange-500/10';
                const iconTextClass = isOutOfStock ? 'text-red-500' : 'text-orange-500';
                const stockTextClass = isOutOfStock ? 'text-red-500' : 'text-orange-500';
                return `
                <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border-l-4 ${stockColorClass}">
                    <div class="flex items-center gap-3">
                        <div class="size-10 rounded-lg ${iconBgClass} ${iconTextClass} flex items-center justify-center">
                            <span class="material-symbols-outlined text-xl">warning</span>
                        </div>
                        <div>
                            <p class="text-sm font-bold">${p.name}</p>
                            <p class="text-xs font-medium ${stockTextClass}">Còn lại: ${p.stock || 0}</p>
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        }
    }
}
