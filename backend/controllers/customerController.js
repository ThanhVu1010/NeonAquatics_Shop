const { db } = require('../config/db');

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

exports.getCustomers = async (req, res) => {
    try {
        const result = await db.execute('SELECT * FROM customers ORDER BY created_at DESC');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.createCustomer = async (req, res) => {
    try {
        const { name, phone, address, type } = req.body;
        if (!name) return res.json({ success: false, message: 'Tên khách hàng không được trống!' });
        const id = generateId();
        await db.execute({
            sql: 'INSERT INTO customers (id, name, phone, address, type, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            args: [id, name, phone || '', address || '', type || 'retail', new Date().toISOString()]
        });
        res.json({ success: true, message: 'Đã thêm khách hàng!', data: { id } });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.updateCustomer = async (req, res) => {
    try {
        const { name, phone, address, type } = req.body;
        if (!name) return res.json({ success: false, message: 'Tên khách hàng không được trống!' });
        await db.execute({
            sql: 'UPDATE customers SET name = ?, phone = ?, address = ?, type = ? WHERE id = ?',
            args: [name, phone || '', address || '', type || 'retail', req.params.id]
        });
        res.json({ success: true, message: 'Đã cập nhật khách hàng!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.deleteCustomer = async (req, res) => {
    try {
        await db.execute({ sql: 'DELETE FROM customers WHERE id = ?', args: [req.params.id] });
        res.json({ success: true, message: 'Đã xóa khách hàng!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};
