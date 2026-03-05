async function loadSettingsData() {
    const result = await api('/api/settings');
    if (result.success) {
        settings = result.data;
    }
    return settings;
}

async function loadSettings() {
    await loadSettingsData();
    const nameEl = document.getElementById('companyName');
    if (!nameEl) return;
    nameEl.value = settings.companyName || '';
    document.getElementById('companyAddress').value = settings.companyAddress || '';
    document.getElementById('companyPhone').value = settings.companyPhone || '';
    document.getElementById('companyEmail').value = settings.companyEmail || '';
    document.getElementById('defaultNote').value = settings.defaultNote || '';
}

async function saveSettings() {
    const settingsData = {
        companyName: document.getElementById('companyName').value.trim(),
        companyAddress: document.getElementById('companyAddress').value.trim(),
        companyPhone: document.getElementById('companyPhone').value.trim(),
        companyEmail: document.getElementById('companyEmail').value.trim(),
        defaultNote: document.getElementById('defaultNote').value.trim()
    };

    const result = await api('/api/settings', {
        method: 'POST',
        body: JSON.stringify(settingsData)
    });

    if (result.success) {
        settings = settingsData;
        showToast('Đã lưu cài đặt!');
    } else {
        showToast(result.message || 'Lỗi!', 'error');
    }
}

async function exportData() {
    const result = await api('/api/data/export');
    if (result.success) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `baogia_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Đã xuất dữ liệu!');
    } else {
        showToast(result.message || 'Lỗi xuất dữ liệu!', 'error');
    }
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const data = JSON.parse(e.target.result);
            if (confirm('Nhập dữ liệu sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại. Bạn có chắc chắn?')) {
                const result = await api('/api/data/import', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                if (result.success) {
                    showToast('Đã nhập dữ liệu thành công!');
                    renderDashboard();
                    switchTab('dashboard');
                } else {
                    showToast(result.message || 'Lỗi!', 'error');
                }
            }
        } catch (err) {
            showToast('File không hợp lệ!', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}
