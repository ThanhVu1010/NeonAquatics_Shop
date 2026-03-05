async function loadQuotes() {
    const result = await api('/api/quotes');
    if (result.success) {
        quotes = result.data.map(q => ({
            id: q.id, quoteNumber: q.quote_number, customer: q.customer,
            customerPhone: q.customer_phone, customerAddress: q.customer_address,
            note: q.note, total: q.total, status: q.status, createdAt: q.created_at,
            updatedAt: q.updated_at, items: q.items || []
        }));
    }
    return quotes;
}

async function populateQuoteProductSelect() {
    await loadProducts();
    await loadCategories();
    const select = document.getElementById('quoteProductSelect');
    if (!select) return;
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

async function populateCustomerSelect() {
    await loadCustomers();
    const select = document.getElementById('quoteCustomerSelect');
    if (!select) return;

    let html = '<option value="">-- Chọn khách hàng đã lưu --</option>';
    customers.forEach(c => {
        html += `<option value="${c.id}">${c.name} - ${c.phone || ''}</option>`;
    });
    select.innerHTML = html;
}

function onQuoteCustomerSelect() {
    const select = document.getElementById('quoteCustomerSelect');
    if (!select || !select.value) return;

    const customer = customers.find(c => c.id === select.value);
    if (customer) {
        document.getElementById('quoteCustomer').value = customer.name;
        document.getElementById('quoteCustomerPhone').value = customer.phone || '';
        document.getElementById('quoteCustomerAddress').value = customer.address || '';
    }
}

function renderQuoteItems() {
    const tbody = document.getElementById('quoteItemsTable');
    if (!tbody) return;
    if (currentQuoteItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="px-6 py-8 text-center text-slate-500 text-sm">Chưa có sản phẩm nào trong báo giá</td></tr>';
        document.getElementById('quoteTotal').textContent = formatCurrency(0);
        return;
    }

    let total = 0;
    tbody.innerHTML = currentQuoteItems.map((item, index) => {
        const lineTotal = item.price * item.qty * (1 - item.discount / 100);
        total += lineTotal;
        return `
        <tr class="border-b border-slate-200 dark:border-primary/10 hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
            <td class="px-4 py-3 text-sm text-center">${index + 1}</td>
            <td class="px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-200">${item.name}</td>
            <td class="px-4 py-3 text-sm text-center text-slate-500 dark:text-slate-400">${item.unit || '-'}</td>
            <td class="px-4 py-3 text-sm text-right font-medium text-emerald-500">${formatCurrency(item.price)}</td>
            <td class="px-4 py-3 text-sm text-center font-medium shadow-sm border border-slate-200 dark:border-primary/10 bg-white dark:bg-background-dark m-1 rounded bg-clip-padding">${item.qty}</td>
            <td class="px-4 py-3 text-sm text-center font-medium text-orange-500">${item.discount > 0 ? item.discount + '%' : '-'}</td>
            <td class="px-4 py-3 text-sm text-right font-bold text-primary">${formatCurrency(lineTotal)}</td>
            <td class="px-4 py-3 text-sm text-center">
                <button class="text-slate-400 hover:text-red-500 transition-colors" onclick="removeQuoteItem(${index})" title="Xóa">
                    <span class="material-symbols-outlined text-sm">delete</span>
                </button>
            </td>
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
    await populateCustomerSelect();
    const modal = document.getElementById('quoteModal');
    if (!modal) return;
    modal.classList.add('active');
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
        document.getElementById('quoteCustomerSelect').value = '';
        document.getElementById('quoteNote').value = settings.defaultNote || '';
        currentQuoteItems = [];
    }
    renderQuoteItems();
}

function closeQuoteModal() {
    const modal = document.getElementById('quoteModal');
    if (modal) modal.classList.remove('active');
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

    if (editId) {
        const q = quotes.find(qt => qt.id === editId);
        if (q) quoteData.status = q.status;
    } else {
        quoteData.status = 'quote';
    }

    let result;
    if (editId) {
        result = await api(`/api/quotes/${editId}`, {
            method: 'PUT',
            body: JSON.stringify(quoteData)
        });
    } else {
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
    const searchEl = document.getElementById('searchQuote');
    const search = searchEl ? searchEl.value.toLowerCase() : '';
    const filtered = quotes.filter(q => {
        return (q.customer || '').toLowerCase().includes(search) ||
            (q.quoteNumber || '').toLowerCase().includes(search);
    });

    const listEl = document.getElementById('quotesList');
    const emptyState = document.getElementById('emptyQuotesState');
    if (!listEl) return;

    if (filtered.length === 0) {
        listEl.innerHTML = '';
        if (emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.classList.add('block');
        }
    } else {
        if (emptyState) {
            emptyState.classList.remove('block');
            emptyState.classList.add('hidden');
        }
        listEl.innerHTML = filtered.map(q => {
            let statusText = 'Báo giá';
            if (q.status === 'ordered') { statusText = 'Đã đặt hàng'; }
            if (q.status === 'completed') { statusText = 'Hoàn thành'; }
            if (q.status === 'cancelled') { statusText = 'Đã hủy'; }

            return `
            <div class="bg-slate-100 dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-xl p-5 hover:border-primary/30 transition-colors relative group">
                <div class="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 text-slate-800 dark:text-slate-100 items-end z-10">
                    <button class="p-1.5 rounded bg-white dark:bg-background-dark text-slate-400 hover:text-primary border border-slate-200 dark:border-primary/20 transition-colors shadow-sm flex items-center justify-center" onclick="previewQuote('${q.id}')" title="Xem trước">
                        <span class="material-symbols-outlined text-sm">visibility</span>
                    </button>
                    ${q.status === 'quote' ? `
                    <button class="p-1.5 rounded bg-white dark:bg-background-dark text-slate-400 hover:text-emerald-500 border border-slate-200 dark:border-primary/20 transition-colors shadow-sm flex items-center justify-center" onclick="convertToOrder('${q.id}')" title="Chốt đơn">
                        <span class="material-symbols-outlined text-sm">check_circle</span>
                    </button>
                    ` : ''}
                    <button class="p-1.5 rounded bg-white dark:bg-background-dark text-slate-400 hover:text-blue-500 border border-slate-200 dark:border-primary/20 transition-colors shadow-sm flex items-center justify-center" onclick="duplicateQuote('${q.id}')" title="Nhân bản">
                        <span class="material-symbols-outlined text-sm">content_copy</span>
                    </button>
                    <button class="p-1.5 rounded bg-white dark:bg-background-dark text-slate-400 hover:text-orange-500 border border-slate-200 dark:border-primary/20 transition-colors shadow-sm flex items-center justify-center" onclick="editQuote('${q.id}')" title="Sửa">
                        <span class="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button class="p-1.5 rounded bg-white dark:bg-background-dark text-slate-400 hover:text-red-500 border border-slate-200 dark:border-primary/20 transition-colors shadow-sm flex items-center justify-center" onclick="deleteQuote('${q.id}')" title="Xóa">
                        <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                </div>
                
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="font-bold text-lg text-slate-800 dark:text-slate-200">${q.quoteNumber || 'BG-0001'}</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${formatDate(q.createdAt)}</p>
                    </div>
                </div>
                
                <div class="space-y-3 mb-4">
                    <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span class="material-symbols-outlined text-[18px] text-primary">person</span>
                        <span class="font-medium truncate">${q.customer}</span>
                    </div>
                    ${q.customerPhone ? `
                    <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <span class="material-symbols-outlined text-[18px]">call</span>
                        <span>${q.customerPhone}</span>
                    </div>
                    ` : ''}
                    <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span class="material-symbols-outlined text-[18px] text-emerald-500">inventory_2</span>
                        <span>${q.items.length} sản phẩm</span>
                    </div>
                </div>

                <div class="pt-4 border-t border-slate-200 dark:border-primary/10 flex justify-between items-end">
                    <div>
                        <p class="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1">Tổng tiền</p>
                        <p class="text-xl font-bold text-primary">${formatCurrency(q.total)}</p>
                    </div>
                    <span class="px-2.5 py-1 rounded-full text-xs font-medium ${q.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                    q.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                        q.status === 'ordered' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                            'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                }">${statusText}</span>
                </div>
            </div>
            `;
        }).join('');
    }
}

async function convertToOrder(id) {
    if (confirm('Xác nhận chốt đơn báo giá này?\nHệ thống sẽ tự động trừ số lượng sản phẩm trong kho tương ứng.')) {
        const res = await api(`/api/quotes/${id}/convert`, { method: 'POST' });
        if (res.success) {
            showToast(res.message);
            renderQuotes();
            renderDashboard();
            loadProducts();
        } else {
            showToast(res.message, 'error');
        }
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
    const modal = document.getElementById('quotePreviewModal');
    if (modal) modal.classList.remove('active');
}

function printQuote() {
    window.print();
}
