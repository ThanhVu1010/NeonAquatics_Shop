const { db } = require('../config/db');

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function normalizePhone(phone) {
    return (phone || '').toString().replace(/\D/g, '');
}

function normalizeType(type) {
    const value = (type || '').toString().trim().toLowerCase();
    if (value === 'wholesale' || value === 'vip') return value;
    return 'retail';
}

function validateCustomerPayload(payload) {
    const name = (payload.name || '').toString().trim();
    const phone = normalizePhone(payload.phone);
    const address = (payload.address || '').toString().trim();
    const type = normalizeType(payload.type);

    if (!name) return { ok: false, message: 'Ten khach hang khong duoc trong!' };
    if (!phone) return { ok: false, message: 'So dien thoai khong duoc trong!' };
    if (!/^\d{9,11}$/.test(phone)) {
        return { ok: false, message: 'So dien thoai khong hop le (9-11 so)!' };
    }

    return { ok: true, value: { name, phone, address, type } };
}

async function isPhoneExists(phone, excludeId = null) {
    const result = await db.execute({
        sql: excludeId
            ? 'SELECT id FROM customers WHERE phone = ? AND id <> ? LIMIT 1'
            : 'SELECT id FROM customers WHERE phone = ? LIMIT 1',
        args: excludeId ? [phone, excludeId] : [phone]
    });
    return result.rows.length > 0;
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
        const parsed = validateCustomerPayload(req.body || {});
        if (!parsed.ok) return res.json({ success: false, message: parsed.message });

        const { name, phone, address, type } = parsed.value;
        if (await isPhoneExists(phone)) {
            return res.json({ success: false, message: 'So dien thoai da ton tai trong CRM!' });
        }

        const id = generateId();
        await db.execute({
            sql: 'INSERT INTO customers (id, name, phone, address, type, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            args: [id, name, phone, address, type, new Date().toISOString()]
        });
        res.json({ success: true, message: 'Da them khach hang!', data: { id } });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.updateCustomer = async (req, res) => {
    try {
        const parsed = validateCustomerPayload(req.body || {});
        if (!parsed.ok) return res.json({ success: false, message: parsed.message });

        const { name, phone, address, type } = parsed.value;
        if (await isPhoneExists(phone, req.params.id)) {
            return res.json({ success: false, message: 'So dien thoai da duoc su dung boi khach hang khac!' });
        }

        await db.execute({
            sql: 'UPDATE customers SET name = ?, phone = ?, address = ?, type = ? WHERE id = ?',
            args: [name, phone, address, type, req.params.id]
        });
        res.json({ success: true, message: 'Da cap nhat khach hang!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.deleteCustomer = async (req, res) => {
    try {
        await db.execute({ sql: 'DELETE FROM customers WHERE id = ?', args: [req.params.id] });
        res.json({ success: true, message: 'Da xoa khach hang!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};
