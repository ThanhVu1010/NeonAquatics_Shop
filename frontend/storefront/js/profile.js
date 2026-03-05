const API_BASE_PROFILE = '/api/storefront';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('neon_store_token');
    const userStr = localStorage.getItem('neon_store_user');

    if (!token || !userStr) {
        window.location.href = 'login.html';
        return;
    }

    let user;
    try {
        user = JSON.parse(userStr);
    } catch (e) {
        window.location.href = 'login.html';
        return;
    }

    // Populate user info
    document.getElementById('navUserName').textContent = user.name || user.username;
    document.getElementById('profileName').textContent = user.name || user.username;
    document.getElementById('profilePhone').textContent = user.phone || 'Chưa cập nhật SĐT';
    document.getElementById('profileAddress').textContent = user.address || 'Chưa có địa chỉ giao hàng tĩnh';

    // Fetch Orders
    const container = document.getElementById('ordersContainer');
    try {
        const res = await fetch(`${API_BASE_PROFILE}/my-orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            if (data.data.length === 0) {
                container.innerHTML = `<div class="text-center py-12 text-slate-500 bg-dark/30 rounded-2xl border border-slate-800">Bạn chưa có đơn hàng nào. <br/> <a href="/" class="text-primary hover:underline mt-2 inline-block">Mua sắm ngay</a></div>`;
                return;
            }

            const statusColors = {
                'quote': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
                'order': 'bg-primary/20 text-primary border-primary/30',
                'cancel': 'bg-red-500/20 text-red-500 border-red-500/30'
            };
            const statusText = {
                'quote': 'Đang chờ xử lý',
                'order': 'Đã chốt (Hoàn thành)',
                'cancel': 'Đã hủy'
            };

            container.innerHTML = data.data.map(order => `
                <div class="glass-card rounded-xl p-5 border border-slate-800 hover:border-primary/30 transition-colors">
                    <div class="flex flex-wrap justify-between items-center gap-4 mb-4">
                        <div>
                            <span class="text-xs text-slate-500 uppercase tracking-wider block mb-1">Mã đơn hàng</span>
                            <span class="text-lg font-bold text-slate-200">${order.quote_number}</span>
                        </div>
                        <div class="text-right">
                            <span class="text-xs text-slate-500 uppercase tracking-wider block mb-1">Ngày đặt</span>
                            <span class="text-sm text-slate-300">${new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <div class="px-3 py-1 rounded-full text-xs font-bold border ${statusColors[order.status] || statusColors['quote']}">
                            ${statusText[order.status] || 'Đang chờ xứ lý'}
                        </div>
                    </div>
                    
                    ${order.note ? `<div class="text-sm text-slate-400 bg-dark/50 p-3 rounded-lg mb-4 italic">Ghi chú: ${order.note}</div>` : ''}

                    <div class="flex justify-between items-center pt-4 border-t border-slate-800">
                        <span class="text-slate-400">Tổng thanh toán:</span>
                        <span class="text-xl font-bold text-secondary">${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total || 0)}</span>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `<div class="text-center text-red-500">Lỗi: ${data.message}</div>`;
        }
    } catch (err) {
        container.innerHTML = `<div class="text-center text-red-500">Lỗi kết nối máy chủ</div>`;
    }
});
