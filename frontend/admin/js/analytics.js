function toSafeNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

function normalizeTextValue(value) {
    return (value || '').toString().trim();
}

function parseDateSafe(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
}

function formatPercent(value) {
    return `${toSafeNumber(value).toFixed(1)}%`;
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function renderEmptyState(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<p class="text-sm text-slate-500 dark:text-slate-400">${message}</p>`;
}

function renderRankCards(containerId, rows, emptyMessage, rowRenderer) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!rows.length) {
        container.innerHTML = `<p class="text-sm text-slate-500 dark:text-slate-400">${emptyMessage}</p>`;
        return;
    }

    container.innerHTML = rows.map((row, index) => rowRenderer(row, index)).join('');
}

function getCustomerTypeInfo(type) {
    if (type === 'wholesale') {
        return { label: 'Khach si', className: 'bg-blue-500/10 text-blue-500' };
    }
    if (type === 'vip') {
        return { label: 'VIP', className: 'bg-amber-500/10 text-amber-500' };
    }
    return { label: 'Ban le', className: 'bg-emerald-500/10 text-emerald-500' };
}

function buildInventoryTrend(products, categories) {
    const categoryById = new Map(categories.map(item => [item.id, item]));
    const stats = new Map();

    products.forEach(item => {
        const categoryName = categoryById.get(item.categoryId)?.name || 'Chua phan loai';
        const stock = Math.max(0, toSafeNumber(item.stock));
        const importValue = stock * toSafeNumber(item.costPrice);

        if (!stats.has(categoryName)) {
            stats.set(categoryName, { importValue: 0, products: 0, units: 0 });
        }
        const row = stats.get(categoryName);
        row.importValue += importValue;
        row.products += 1;
        row.units += stock;
    });

    return Array.from(stats.entries())
        .map(([name, value]) => ({
            name,
            importValue: value.importValue,
            products: value.products,
            units: value.units
        }))
        .sort((a, b) => b.importValue - a.importValue)
        .slice(0, 7);
}

function renderInventoryTrend(rows) {
    const container = document.getElementById('anRevenueTrend');
    if (!container) return;

    if (!rows.length) {
        container.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">Chua co du lieu ton kho</p>';
        return;
    }

    const maxValue = Math.max(1, ...rows.map(item => item.importValue));
    container.innerHTML = rows.map(item => {
        const widthPercent = Math.round((item.importValue / maxValue) * 100);
        const barWidth = item.importValue > 0 ? Math.max(6, widthPercent) : 0;

        return `
            <div class="space-y-1">
                <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>${item.name}</span>
                    <span>${item.products} ma</span>
                </div>
                <div class="h-2 bg-slate-200 dark:bg-primary/10 rounded-full overflow-hidden">
                    <div class="h-2 rounded-full bg-primary-accent/80" style="width:${barWidth}%"></div>
                </div>
                <div class="flex items-center justify-between text-sm">
                    <span class="font-medium">${formatCurrency(item.importValue)}</span>
                    <span class="text-xs text-slate-500 dark:text-slate-400">${item.units} don vi</span>
                </div>
            </div>
        `;
    }).join('');
}

async function renderAnalytics() {
    try {
        await Promise.all([
            loadProducts(),
            loadCategories(),
            loadCustomers()
        ]);

        const categoryById = new Map(categories.map(item => [item.id, item]));
        const totalProducts = products.length;

        const inventoryStats = products.reduce((acc, item) => {
            const stock = Math.max(0, toSafeNumber(item.stock));
            const importPrice = toSafeNumber(item.costPrice);
            const sellPrice = toSafeNumber(item.price);

            acc.totalStockUnits += stock;
            acc.totalImportValue += stock * importPrice;
            acc.totalSellValue += stock * sellPrice;
            if (stock > 0) acc.inStockCount += 1;
            if (sellPrice > 0) {
                acc.sellPriceCount += 1;
                acc.sellPriceSum += sellPrice;
            }
            return acc;
        }, {
            totalStockUnits: 0,
            totalImportValue: 0,
            totalSellValue: 0,
            inStockCount: 0,
            sellPriceCount: 0,
            sellPriceSum: 0
        });

        const lowStockProducts = products.filter(item => {
            const stock = toSafeNumber(item.stock);
            return stock > 0 && stock <= 5;
        });
        const outStockProducts = products.filter(item => toSafeNumber(item.stock) <= 0);

        const avgSellPrice = inventoryStats.sellPriceCount > 0
            ? inventoryStats.sellPriceSum / inventoryStats.sellPriceCount
            : 0;
        const inStockRate = totalProducts > 0
            ? (inventoryStats.inStockCount * 100) / totalProducts
            : 0;

        const wholesaleCount = customers.filter(item => item.type === 'wholesale').length;
        const wholesaleRate = customers.length > 0 ? (wholesaleCount * 100) / customers.length : 0;

        setText('anMetricTotalValue', formatCurrency(inventoryStats.totalImportValue));
        setText('anMetricAvgQuote', formatCurrency(avgSellPrice));
        setText('anMetricClosedRate', formatPercent(inStockRate));
        setText('anMetricRepeatRate', formatPercent(wholesaleRate));
        setText('anMetricLowStock', String(lowStockProducts.length));
        setText('anMetricOutStock', String(outStockProducts.length));

        const inventoryTrend = buildInventoryTrend(products, categories);
        renderInventoryTrend(inventoryTrend);

        const categoryStats = new Map();
        products.forEach(item => {
            const categoryName = categoryById.get(item.categoryId)?.name || 'Chua phan loai';
            const stock = Math.max(0, toSafeNumber(item.stock));
            const importValue = stock * toSafeNumber(item.costPrice);
            const sellValue = stock * toSafeNumber(item.price);

            if (!categoryStats.has(categoryName)) {
                categoryStats.set(categoryName, { products: 0, units: 0, importValue: 0, sellValue: 0 });
            }
            const row = categoryStats.get(categoryName);
            row.products += 1;
            row.units += stock;
            row.importValue += importValue;
            row.sellValue += sellValue;
        });

        const totalCategoryValue = Array.from(categoryStats.values()).reduce((sum, item) => sum + item.importValue, 0);
        const topCategories = Array.from(categoryStats.entries())
            .map(([name, value]) => ({
                name,
                products: value.products,
                units: value.units,
                importValue: value.importValue,
                share: totalCategoryValue > 0 ? (value.importValue * 100) / totalCategoryValue : 0
            }))
            .sort((a, b) => b.importValue - a.importValue)
            .slice(0, 6);

        renderRankCards(
            'anTopCategories',
            topCategories,
            'Chua co du lieu dong hang',
            (row, index) => `
                <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-primary/10">
                    <div class="flex items-center justify-between gap-3">
                        <p class="text-sm font-semibold">${index + 1}. ${row.name}</p>
                        <p class="text-sm font-bold text-primary">${formatCurrency(row.importValue)}</p>
                    </div>
                    <div class="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>${row.products} ma - ${row.units} don vi</span>
                        <span>${row.share.toFixed(1)}%</span>
                    </div>
                </div>
            `
        );

        const topProducts = products
            .map(item => {
                const stock = Math.max(0, toSafeNumber(item.stock));
                const importValue = stock * toSafeNumber(item.costPrice);
                const sellValue = stock * toSafeNumber(item.price);
                return {
                    name: item.name,
                    stock,
                    importValue,
                    sellValue
                };
            })
            .sort((a, b) => b.importValue - a.importValue)
            .slice(0, 6);

        renderRankCards(
            'anTopProducts',
            topProducts,
            'Chua co du lieu san pham',
            (row, index) => `
                <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-primary/10">
                    <div class="flex items-center justify-between gap-3">
                        <p class="text-sm font-semibold">${index + 1}. ${row.name}</p>
                        <p class="text-sm font-bold text-emerald-500">${formatCurrency(row.importValue)}</p>
                    </div>
                    <div class="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Ton: ${row.stock}</span>
                        <span>Ban du kien: ${formatCurrency(row.sellValue)}</span>
                    </div>
                </div>
            `
        );

        const latestCustomers = [...customers]
            .sort((a, b) => {
                const d1 = parseDateSafe(a.createdAt)?.getTime() || 0;
                const d2 = parseDateSafe(b.createdAt)?.getTime() || 0;
                return d2 - d1;
            })
            .slice(0, 6)
            .map(item => ({
                name: normalizeTextValue(item.name) || 'Khach chua dat ten',
                phone: normalizeTextValue(item.phone) || 'Khong co so dien thoai',
                type: normalizeTextValue(item.type) || 'retail',
                createdAt: parseDateSafe(item.createdAt)
            }));

        renderRankCards(
            'anTopCustomers',
            latestCustomers,
            'Chua co du lieu khach hang',
            (row, index) => {
                const typeInfo = getCustomerTypeInfo(row.type);
                return `
                    <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-primary/10">
                        <div class="flex items-center justify-between gap-3">
                            <p class="text-sm font-semibold">${index + 1}. ${row.name}</p>
                            <span class="px-2 py-0.5 rounded text-xs ${typeInfo.className}">${typeInfo.label}</span>
                        </div>
                        <div class="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>${row.phone}</span>
                            <span>${row.createdAt ? row.createdAt.toLocaleDateString('vi-VN') : '--'}</span>
                        </div>
                    </div>
                `;
            }
        );

        const stockAlerts = products
            .filter(item => toSafeNumber(item.stock) <= 5)
            .sort((a, b) => toSafeNumber(a.stock) - toSafeNumber(b.stock))
            .slice(0, 8)
            .map(item => {
                const stock = toSafeNumber(item.stock);
                const levelText = stock <= 0 ? 'Het hang' : `Con ${stock}`;
                const levelClass = stock <= 0 ? 'text-red-500' : 'text-orange-500';
                return { name: item.name, levelText, levelClass };
            });

        renderRankCards(
            'anStockAlerts',
            stockAlerts,
            'Ton kho dang o muc an toan',
            row => `
                <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-primary/10 flex items-center justify-between gap-3">
                    <p class="text-sm font-semibold">${row.name}</p>
                    <p class="text-sm font-bold ${row.levelClass}">${row.levelText}</p>
                </div>
            `
        );

        const segmentMap = new Map();
        products.forEach(item => {
            const segment = normalizeTextValue(item.phanKhuc) || 'Chua phan khuc';
            const margin = toSafeNumber(item.price) - toSafeNumber(item.costPrice);
            if (!segmentMap.has(segment)) {
                segmentMap.set(segment, { count: 0, totalMargin: 0 });
            }
            const row = segmentMap.get(segment);
            row.count += 1;
            row.totalMargin += margin;
        });

        const segmentRows = Array.from(segmentMap.entries())
            .map(([segment, values]) => ({
                segment,
                count: values.count,
                avgMargin: values.count > 0 ? values.totalMargin / values.count : 0
            }))
            .sort((a, b) => b.count - a.count);

        renderRankCards(
            'anSegmentMix',
            segmentRows,
            'Chua co thong tin phan khuc',
            row => `
                <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-primary/10">
                    <div class="flex items-center justify-between gap-3">
                        <p class="text-sm font-semibold">${row.segment}</p>
                        <p class="text-sm font-bold">${row.count} SP</p>
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Lai gop TB: ${formatCurrency(row.avgMargin)}</p>
                </div>
            `
        );

        const typeMap = new Map();
        customers.forEach(item => {
            const type = normalizeTextValue(item.type) || 'retail';
            typeMap.set(type, (typeMap.get(type) || 0) + 1);
        });

        const typeRows = Array.from(typeMap.entries())
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count);

        renderRankCards(
            'anStatusMix',
            typeRows,
            'Chua co du lieu loai khach hang',
            row => {
                const typeInfo = getCustomerTypeInfo(row.type);
                return `
                    <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-primary/10 flex items-center justify-between gap-3">
                        <span class="px-2 py-0.5 rounded text-xs ${typeInfo.className}">${typeInfo.label}</span>
                        <p class="text-sm font-bold">${row.count}</p>
                    </div>
                `;
            }
        );

        const productDates = products
            .map(item => parseDateSafe(item.createdAt))
            .filter(Boolean)
            .sort((a, b) => a - b);
        const customerDates = customers
            .map(item => parseDateSafe(item.createdAt))
            .filter(Boolean)
            .sort((a, b) => a - b);

        const productRange = productDates.length
            ? `${productDates[0].toLocaleDateString('vi-VN')} - ${productDates[productDates.length - 1].toLocaleDateString('vi-VN')}`
            : '--';
        const customerRange = customerDates.length
            ? `${customerDates[0].toLocaleDateString('vi-VN')} - ${customerDates[customerDates.length - 1].toLocaleDateString('vi-VN')}`
            : '--';

        const dataWindowEl = document.getElementById('anDataWindow');
        if (dataWindowEl) {
            dataWindowEl.innerHTML = `
                <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-primary/10 flex items-center justify-between">
                    <span class="text-sm text-slate-500 dark:text-slate-400">Tong san pham</span>
                    <span class="text-sm font-bold">${products.length}</span>
                </div>
                <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-primary/10 flex items-center justify-between">
                    <span class="text-sm text-slate-500 dark:text-slate-400">Tong don vi ton</span>
                    <span class="text-sm font-bold">${inventoryStats.totalStockUnits}</span>
                </div>
                <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-primary/10 flex items-center justify-between">
                    <span class="text-sm text-slate-500 dark:text-slate-400">Tong khach hang</span>
                    <span class="text-sm font-bold">${customers.length}</span>
                </div>
                <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-primary/10">
                    <p class="text-xs text-slate-500 dark:text-slate-400">Khoang du lieu san pham</p>
                    <p class="text-sm font-semibold mt-1">${productRange}</p>
                </div>
                <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-primary/10">
                    <p class="text-xs text-slate-500 dark:text-slate-400">Khoang du lieu khach hang</p>
                    <p class="text-sm font-semibold mt-1">${customerRange}</p>
                </div>
            `;
        }

        const actionHints = [];
        if (totalProducts === 0) {
            actionHints.push('Chua co san pham. Nen tao danh muc va du lieu ton kho truoc.');
        }

        if (inStockRate < 70 && totalProducts > 0) {
            actionHints.push(`Ty le con hang la ${formatPercent(inStockRate)}. Nen uu tien bo sung hang cho nhom ban chay.`);
        }

        if (lowStockProducts.length > 0) {
            actionHints.push(`Co ${lowStockProducts.length} san pham sap het hang. Nen lap danh sach nhap lai trong tuan.`);
        }

        if (outStockProducts.length > 0) {
            actionHints.push(`Co ${outStockProducts.length} san pham da het hang. Nen xem co can tam an ma hoac dat nhap gap.`);
        }

        const topCategory = topCategories[0];
        if (topCategory && topCategory.share >= 55) {
            actionHints.push(`Ton kho dang tap trung vao "${topCategory.name}" (${topCategory.share.toFixed(1)}%). Nen can bang them cac nhom khac.`);
        }

        if (customers.length > 0 && wholesaleRate < 20) {
            actionHints.push(`Ty le khach si moi ${formatPercent(wholesaleRate)}. Co the mo rong kenh dai ly/ban buôn.`);
        }

        if (actionHints.length === 0) {
            actionHints.push('So lieu hien tai can bang. Co the toi uu tiep theo theo bien loi nhuan va vong quay ton kho.');
        }

        renderRankCards(
            'anActionHints',
            actionHints,
            'Khong co goi y',
            hint => `
                <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-primary/10">
                    <p class="text-sm">${hint}</p>
                </div>
            `
        );
    } catch (error) {
        console.error('renderAnalytics error:', error);
        renderEmptyState('anRevenueTrend', 'Khong the tai du lieu phan tich');
        renderEmptyState('anTopCategories', 'Khong the tai du lieu phan tich');
        renderEmptyState('anTopProducts', 'Khong the tai du lieu phan tich');
        renderEmptyState('anTopCustomers', 'Khong the tai du lieu phan tich');
        renderEmptyState('anStockAlerts', 'Khong the tai du lieu phan tich');
        renderEmptyState('anActionHints', 'Khong the tai du lieu phan tich');
        renderEmptyState('anSegmentMix', 'Khong the tai du lieu phan tich');
        renderEmptyState('anStatusMix', 'Khong the tai du lieu phan tich');
        renderEmptyState('anDataWindow', 'Khong the tai du lieu phan tich');
        showToast('Khong the tai trang phan tich', 'error');
    }
}
