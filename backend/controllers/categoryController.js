const { db } = require('../config/db');

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

exports.getCategories = async (req, res) => {
    try {
        const result = await db.execute('SELECT * FROM categories ORDER BY created_at DESC');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.json({ success: false, message: 'Ten dong hang khong duoc trong!' });

        const id = generateId();
        await db.execute({
            sql: 'INSERT INTO categories (id, name, description, created_at) VALUES (?, ?, ?, ?)',
            args: [id, name, description || '', new Date().toISOString()]
        });

        res.json({ success: true, message: 'Da them dong hang!', data: { id } });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.json({ success: false, message: 'Ten dong hang khong duoc trong!' });

        await db.execute({
            sql: 'UPDATE categories SET name = ?, description = ? WHERE id = ?',
            args: [name, description || '', req.params.id]
        });

        res.json({ success: true, message: 'Da cap nhat dong hang!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        await db.execute({
            sql: 'DELETE FROM categories WHERE id = ?',
            args: [req.params.id]
        });
        res.json({ success: true, message: 'Da xoa dong hang!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};
