async function loadCustomers() {
    const result = await api('/api/customers');
    if (result.success) {
        customers = result.data.map(c => ({
            id: c.id, name: c.name, phone: c.phone,
            address: c.address, type: c.type, createdAt: c.created_at
        }));
    }
    return customers;
}

async function renderCustomers() {
    await loadCustomers();
    const tbody = document.getElementById('customersTable');
    const emptyState = document.getElementById('emptyCustomersState');
    const searchEl = document.getElementById('searchCustomer');
    const searchTerm = searchEl ? searchEl.value.toLowerCase() : '';

    if (!tbody) return;

    let filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm) ||
        (c.phone && c.phone.toLowerCase().includes(searchTerm))
    );

    if (filteredCustomers.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.classList.add('block');
        }
    } else {
        if (emptyState) {
            emptyState.classList.remove('block');
            emptyState.classList.add('hidden');
        }
        tbody.innerHTML = filteredCustomers.map((c, index) => {
            let typeLabel = c.type === 'retail' ? 'Khách lẻ' : c.type === 'wholesale' ? 'Đại lý' : 'VIP';
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
                        <button class="text-slate-400 hover:text-primary transition-colors cursor-pointer" onclick="editCustomer('${c.id}')" title="Sửa">
                            <span class="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button class="text-slate-400 hover:text-red-500 transition-colors cursor-pointer" onclick="deleteCustomer('${c.id}')" title="Xóa">
                            <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    }
}

function openCustomerModal(id = null) {
    const modal = document.getElementById('customerModal');
    if (!modal) return;
    const title = document.getElementById('customerModalTitle');
    const idInput = document.getElementById('editCustomerId');
    const nameInput = document.getElementById('customerName');
    const phoneInput = document.getElementById('customerPhone');
    const addressInput = document.getElementById('customerAddress');
    const typeInput = document.getElementById('customerType');

    if (id) {
        const customer = customers.find(c => c.id === id);
        if (customer) {
            title.textContent = 'Sửa khách hàng';
            idInput.value = customer.id;
            nameInput.value = customer.name;
            phoneInput.value = customer.phone || '';
            addressInput.value = customer.address || '';
            typeInput.value = customer.type || 'retail';
        }
    } else {
        title.textContent = 'Thêm khách hàng';
        idInput.value = '';
        nameInput.value = '';
        phoneInput.value = '';
        addressInput.value = '';
        typeInput.value = 'retail';
    }
    modal.classList.add('active');
    setTimeout(() => nameInput.focus(), 100);
}

function closeCustomerModal() {
    const modal = document.getElementById('customerModal');
    if (modal) modal.classList.remove('active');
}

async function saveCustomer() {
    const id = document.getElementById('editCustomerId').value;
    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;
    const address = document.getElementById('customerAddress').value;
    const type = document.getElementById('customerType').value;

    if (!name.trim()) return showToast('Vui lòng nhập tên khách hàng!', 'error');

    const payload = { name, phone, address, type };

    let res;
    if (id) {
        res = await api(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
        res = await api('/api/customers', { method: 'POST', body: JSON.stringify(payload) });
    }

    if (res.success) {
        showToast(res.message);
        closeCustomerModal();
        renderCustomers();
    } else {
        showToast(res.message, 'error');
    }
}

function editCustomer(id) {
    openCustomerModal(id);
}

async function deleteCustomer(id) {
    if (confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
        const res = await api(`/api/customers/${id}`, { method: 'DELETE' });
        if (res.success) {
            showToast(res.message);
            renderCustomers();
        } else {
            showToast(res.message, 'error');
        }
    }
}
