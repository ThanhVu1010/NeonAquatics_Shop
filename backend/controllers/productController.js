const { db } = require('../config/db');

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

exports.getProducts = async (req, res) => {
    try {
        const result = await db.execute('SELECT * FROM products ORDER BY created_at DESC');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const { code, name, categoryId, unit, price, costPrice, stock, description, image_url } = req.body;
        if (!name) return res.json({ success: false, message: 'Tên sản phẩm không được trống!' });
        const id = generateId();
        await db.execute({
            sql: 'INSERT INTO products (id, code, name, category_id, unit, price, cost_price, stock, description, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            args: [id, code || '', name, categoryId || '', unit || '', price || 0, costPrice || 0, stock || 0, description || '', image_url || null, new Date().toISOString()]
        });
        res.json({ success: true, message: 'Đã thêm sản phẩm!', data: { id } });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { code, name, categoryId, unit, price, costPrice, stock, description, image_url } = req.body;
        if (!name) return res.json({ success: false, message: 'Tên sản phẩm không được trống!' });
        await db.execute({
            sql: 'UPDATE products SET code = ?, name = ?, category_id = ?, unit = ?, price = ?, cost_price = ?, stock = ?, description = ?, image_url = ? WHERE id = ?',
            args: [code || '', name, categoryId || '', unit || '', price || 0, costPrice || 0, stock || 0, description || '', image_url || null, req.params.id]
        });
        res.json({ success: true, message: 'Đã cập nhật sản phẩm!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        await db.execute({
            sql: 'DELETE FROM products WHERE id = ?',
            args: [req.params.id]
        });
        res.json({ success: true, message: 'Đã xóa sản phẩm!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};
