function normalizePhone(phone) {
    return (phone || '').toString().replace(/\D/g, '');
}

function isValidPhone(phone) {
    return /^\d{9,11}$/.test(phone);
}

async function loadCustomers() {
    const result = await api('/api/customers');
    if (result.success) {
        customers = result.data.map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            address: c.address,
            type: c.type,
            createdAt: c.created_at
        }));
    }
    return customers;
}

async function renderCustomers() {
    await loadCustomers();
    const tbody = document.getElementById('customersTable');
    const emptyState = document.getElementById('emptyCustomersState');
    const searchEl = document.getElementById('searchCustomer');
    const searchTerm = searchEl ? normalizePhone(searchEl.value) || searchEl.value.toLowerCase() : '';

    if (!tbody) return;

    const filteredCustomers = customers.filter(c => {
        const byName = c.name.toLowerCase().includes(searchTerm.toLowerCase());
        const byPhone = normalizePhone(c.phone).includes(searchTerm);
        return byName || byPhone;
    });

    if (filteredCustomers.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.classList.add('block');
        }
        return;
    }

    if (emptyState) {
        emptyState.classList.remove('block');
        emptyState.classList.add('hidden');
    }

    tbody.innerHTML = filteredCustomers.map((c, index) => {
        const typeLabel = c.type === 'retail' ? 'Khach le' : c.type === 'wholesale' ? 'Dai ly' : 'VIP';
        return `
            <tr class="border-b border-slate-200 dark:border-primary/10 hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                <td class="px-4 lg:px-6 py-3 lg:py-4 text-sm text-center">${index + 1}</td>
                <td class="px-4 lg:px-6 py-3 lg:py-4 text-sm font-bold">${c.name}</td>
                <td class="px-4 lg:px-6 py-3 lg:py-4 text-sm">${c.phone || '-'}</td>
                <td class="px-4 lg:px-6 py-3 lg:py-4 text-sm">${c.address || '-'}</td>
                <td class="px-4 lg:px-6 py-3 lg:py-4 text-sm text-center">
                    <span class="px-2 py-1 rounded bg-primary/10 text-primary font-medium text-xs border border-primary/20">${typeLabel}</span>
                </td>
                <td class="px-4 lg:px-6 py-3 lg:py-4 text-sm text-right w-24">
                    <div class="flex justify-end gap-2">
                        <button class="text-slate-400 hover:text-primary transition-colors cursor-pointer" onclick="editCustomer('${c.id}')" title="Sua">
                            <span class="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button class="text-slate-400 hover:text-red-500 transition-colors cursor-pointer" onclick="deleteCustomer('${c.id}')" title="Xoa">
                            <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openCustomerModal(id = null) {
    const modal = document.getElementById('customerModal');
    if (!modal) return;

    const title = document.getElementById('customerModalTitle');
    const idInput = document.getElementById('customerId');
    const nameInput = document.getElementById('customerName');
    const phoneInput = document.getElementById('customerPhone');
    const addressInput = document.getElementById('customerAddress');
    const typeInput = document.getElementById('customerType');

    if (id) {
        const customer = customers.find(c => c.id === id);
        if (customer) {
            title.textContent = 'Sua khach hang';
            idInput.value = customer.id;
            nameInput.value = customer.name;
            phoneInput.value = customer.phone || '';
            addressInput.value = customer.address || '';
            typeInput.value = customer.type || 'retail';
        }
    } else {
        title.textContent = 'Them khach hang';
        idInput.value = '';
        nameInput.value = '';
        phoneInput.value = '';
        addressInput.value = '';
        typeInput.value = 'retail';
    }

    modal.style.display = 'flex';
    setTimeout(() => nameInput.focus(), 100);
}

function closeCustomerModal() {
    const modal = document.getElementById('customerModal');
    if (modal) modal.style.display = 'none';
}

async function saveCustomer() {
    const id = document.getElementById('customerId').value;
    const name = document.getElementById('customerName').value.trim();
    const phoneInput = document.getElementById('customerPhone');
    const phone = normalizePhone(phoneInput.value);
    const address = document.getElementById('customerAddress').value.trim();
    const type = document.getElementById('customerType').value;

    if (!name) return showToast('Vui long nhap ten khach hang!', 'error');
    if (!phone) return showToast('Vui long nhap so dien thoai!', 'error');
    if (!isValidPhone(phone)) return showToast('So dien thoai khong hop le (9-11 so)!', 'error');

    phoneInput.value = phone;
    const payload = { name, phone, address, type };

    let result;
    if (id) {
        result = await api(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
        result = await api('/api/customers', { method: 'POST', body: JSON.stringify(payload) });
    }

    if (result.success) {
        showToast(result.message);
        closeCustomerModal();
        renderCustomers();
    } else {
        showToast(result.message, 'error');
    }
}

function editCustomer(id) {
    openCustomerModal(id);
}

async function deleteCustomer(id) {
    if (confirm('Ban co chac chan muon xoa khach hang nay?')) {
        const result = await api(`/api/customers/${id}`, { method: 'DELETE' });
        if (result.success) {
            showToast(result.message);
            renderCustomers();
        } else {
            showToast(result.message, 'error');
        }
    }
}
