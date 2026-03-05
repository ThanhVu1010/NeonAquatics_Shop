async function shopeeApi(endpoint, options = {}) {
    return api(endpoint, options);
}

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
        if (shopeeBadge) shopeeBadge.style.display = 'inline';
    } else {
        shopeeConnected = false;
        statusText.textContent = 'Chưa kết nối shop Shopee';
        badge.textContent = 'Chưa kết nối';
        badge.className = 'connection-badge disconnected';
        btnConnect.style.display = 'inline-block';
        btnDisconnect.style.display = 'none';
        if (shopeeBadge) shopeeBadge.style.display = 'none';

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

function switchShopeeTab(tab) {
    document.querySelectorAll('.shopee-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.shopeeTab === tab);
    });
    document.querySelectorAll('.shopee-subtab').forEach(t => {
        t.classList.toggle('active', t.id === `shopee-tab-${tab}`);
    });
    if (tab === 'sync') renderSyncProducts();
}

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
                ? `<img class="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-primary/20 mx-auto" src="${item.image.image_url_list[0]}" alt="">`
                : '<div class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-primary/10 border border-slate-200 dark:border-primary/20 flex items-center justify-center text-slate-400 mx-auto"><span class="material-symbols-outlined text-sm">inventory_2</span></div>';
            const status = item.item_status === 'NORMAL' ? 'active' : item.item_status || 'unknown';
            return `
                <tr class="border-b border-slate-200 dark:border-primary/10 hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                    <td class="px-4 py-3 text-sm text-center font-semibold w-12">${index + 1}</td>
                    <td class="px-4 py-3 text-sm text-center w-24">${img}</td>
                    <td class="px-4 py-3 text-sm font-bold">${item.item_name || ''}</td>
                    <td class="px-4 py-3 text-sm text-right font-medium text-primary">${item.price_info ? formatCurrency(item.price_info[0].original_price * 1) : '-'}</td>
                    <td class="px-4 py-3 text-sm text-center font-medium">${item.stock_info_v2 ? item.stock_info_v2.summary_info.total_available_stock : '-'}</td>
                    <td class="px-4 py-3 text-sm text-center">
                        <span class="px-2 py-1 rounded text-xs font-medium ${status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}">${status}</span>
                    </td>
                    <td class="px-4 py-3 text-sm text-right w-24">
                        <div class="flex justify-end gap-2">
                            <button class="text-slate-400 hover:text-primary transition-colors cursor-pointer" onclick="window.open('https://shopee.vn/product/${item.item_id}','_blank')" title="Xem trên Shopee">
                                <span class="material-symbols-outlined text-sm">open_in_new</span>
                            </button>
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

function renderSyncProducts() {
    const list = document.getElementById('syncProductList');
    if (!list) return;
    if (products.length === 0) {
        list.innerHTML = '<p class="empty-state p-4 text-center text-slate-500">Chưa có sản phẩm nào. Hãy thêm sản phẩm trước.</p>';
        return;
    }
    list.innerHTML = products.map(p => {
        const cat = categories.find(c => c.id === p.categoryId);
        return `
            <label class="flex items-start gap-4 p-4 hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors border-b border-slate-100 dark:border-primary/10 cursor-pointer group">
                <div class="pt-1">
                    <input type="checkbox" class="w-4 h-4 text-primary bg-white dark:bg-background-dark border-slate-300 dark:border-primary/30 rounded focus:ring-primary dark:focus:ring-primary focus:ring-2" value="${p.id}">
                </div>
                <div class="flex-1 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                        <div class="font-bold text-slate-800 dark:text-slate-200 text-sm">${p.code ? '<span class="text-primary mr-1">[' + p.code + ']</span>' : ''}${p.name}</div>
                        <div class="text-xs text-slate-500 mt-1">${cat ? cat.name : 'Chưa phân loại'}</div>
                    </div>
                    <div class="text-left sm:text-right">
                        <div class="font-bold text-emerald-500">${formatCurrency(p.price)}</div>
                        <div class="text-xs text-slate-500 mt-1">Tồn kho: <span class="font-medium text-slate-700 dark:text-slate-300">${p.stock || 0}</span></div>
                    </div>
                </div>
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
                'READY_TO_SHIP': { text: 'Sẵn sàng gửi', cls: 'bg-orange-500/10 text-orange-500 border border-orange-500/20' },
                'SHIPPED': { text: 'Đang giao', cls: 'bg-blue-500/10 text-blue-500 border border-blue-500/20' },
                'COMPLETED': { text: 'Hoàn thành', cls: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' },
                'CANCELLED': { text: 'Đã hủy', cls: 'bg-red-500/10 text-red-500 border border-red-500/20' },
                'IN_CANCEL': { text: 'Đang hủy', cls: 'bg-red-500/10 text-red-500 border border-red-500/20' },
                'UNPAID': { text: 'Chưa TT', cls: 'bg-slate-500/10 text-slate-500 border border-slate-500/20' }
            };
            const st = statusMap[order.order_status] || { text: order.order_status || 'N/A', cls: 'bg-slate-500/10 text-slate-500 border border-slate-500/20' };
            return `
                <div class="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl p-5 hover:border-primary/40 transition-colors relative">
                    <div class="flex justify-between items-start mb-4 border-b border-slate-100 dark:border-primary/10 pb-3">
                        <div>
                            <h4 class="font-bold text-slate-800 dark:text-slate-200">#${order.order_sn || ''}</h4>
                            <p class="text-xs text-slate-500 mt-1">${order.create_time ? formatDate(order.create_time * 1000) : ''}</p>
                        </div>
                        <span class="px-2.5 py-1 rounded-full text-xs font-medium ${st.cls}">${st.text}</span>
                    </div>
                    
                    <div class="space-y-2 mb-4">
                        <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <span class="material-symbols-outlined text-[18px] text-slate-400">person</span>
                            <span class="truncate">${order.buyer_username || 'N/A'}</span>
                        </div>
                        <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <span class="material-symbols-outlined text-[18px] text-emerald-500">payments</span>
                            <span class="font-bold text-emerald-500">${order.total_amount ? formatCurrency(order.total_amount) : '-'}</span>
                        </div>
                    </div>
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
