const { db } = require('../config/db');

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

exports.getQuotes = async (req, res) => {
    try {
        const quotesResult = await db.execute('SELECT * FROM quotes ORDER BY created_at DESC');
        const quotes = [];
        for (const q of quotesResult.rows) {
            const itemsResult = await db.execute({
                sql: 'SELECT * FROM quote_items WHERE quote_id = ? ORDER BY id',
                args: [q.id]
            });
            quotes.push({
                ...q,
                items: itemsResult.rows.map(item => ({
                    productId: item.product_id,
                    code: item.code,
                    name: item.name,
                    unit: item.unit,
                    price: item.price,
                    qty: item.qty,
                    discount: item.discount
                }))
            });
        }
        res.json({ success: true, data: quotes });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.createQuote = async (req, res) => {
    try {
        const { customer, customerPhone, customerAddress, note, total, items, quoteNumber, status } = req.body;
        if (!customer) return res.json({ success: false, message: 'Tên khách hàng không được trống!' });
        const id = generateId();

        await db.execute({
            sql: 'INSERT INTO quotes (id, quote_number, customer, customer_phone, customer_address, note, status, total, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            args: [id, quoteNumber || '', customer, customerPhone || '', customerAddress || '', note || '', status || 'quote', total || 0, new Date().toISOString()]
        });

        if (items && items.length > 0) {
            for (const item of items) {
                await db.execute({
                    sql: 'INSERT INTO quote_items (quote_id, product_id, code, name, unit, price, qty, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    args: [id, item.productId || '', item.code || '', item.name, item.unit || '', item.price || 0, item.qty || 1, item.discount || 0]
                });
            }
        }
        res.json({ success: true, message: 'Đã tạo báo giá!', data: { id } });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.updateQuote = async (req, res) => {
    try {
        const { customer, customerPhone, customerAddress, note, total, items, status } = req.body;
        if (!customer) return res.json({ success: false, message: 'Tên khách hàng không được trống!' });

        await db.execute({
            sql: 'UPDATE quotes SET customer = ?, customer_phone = ?, customer_address = ?, note = ?, status = ?, total = ?, updated_at = datetime(\'now\') WHERE id = ?',
            args: [customer, customerPhone || '', customerAddress || '', note || '', status || 'quote', total || 0, req.params.id]
        });

        await db.execute({
            sql: 'DELETE FROM quote_items WHERE quote_id = ?',
            args: [req.params.id]
        });

        if (items && items.length > 0) {
            for (const item of items) {
                await db.execute({
                    sql: 'INSERT INTO quote_items (quote_id, product_id, code, name, unit, price, qty, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    args: [req.params.id, item.productId || '', item.code || '', item.name, item.unit || '', item.price || 0, item.qty || 1, item.discount || 0]
                });
            }
        }
        res.json({ success: true, message: 'Đã cập nhật báo giá!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.convertQuoteToOrder = async (req, res) => {
    try {
        const quoteId = req.params.id;

        const quoteResult = await db.execute({
            sql: 'SELECT * FROM quotes WHERE id = ?',
            args: [quoteId]
        });

        if (quoteResult.rows.length === 0) {
            return res.json({ success: false, message: 'Không tìm thấy báo giá!' });
        }

        const currentQuote = quoteResult.rows[0];
        if (currentQuote.status === 'ordered' || currentQuote.status === 'completed') {
            return res.json({ success: false, message: 'Báo giá này đã được chốt đơn trước đó!' });
        }

        const itemsResult = await db.execute({
            sql: 'SELECT * FROM quote_items WHERE quote_id = ?',
            args: [quoteId]
        });

        for (const item of itemsResult.rows) {
            if (item.product_id) {
                await db.execute({
                    sql: 'UPDATE products SET stock = stock - ? WHERE id = ?',
                    args: [item.qty, item.product_id]
                });
            }
        }

        await db.execute({
            sql: "UPDATE quotes SET status = 'ordered', updated_at = datetime('now') WHERE id = ?",
            args: [quoteId]
        });

        res.json({ success: true, message: 'Đã chốt đơn và tự động trừ kho thành công!' });
    } catch (err) {
        console.error('Lỗi khi chốt đơn:', err);
        res.json({ success: false, message: 'Lỗi khi chốt đơn và trừ kho: ' + err.message });
    }
};

exports.deleteQuote = async (req, res) => {
    try {
        await db.execute({ sql: 'DELETE FROM quote_items WHERE quote_id = ?', args: [req.params.id] });
        await db.execute({ sql: 'DELETE FROM quotes WHERE id = ?', args: [req.params.id] });
        res.json({ success: true, message: 'Đã xóa báo giá!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.getNextQuoteNumber = async (req, res) => {
    try {
        const result = await db.execute('SELECT COUNT(*) as count FROM quotes');
        const nextNum = (result.rows[0].count || 0) + 1;
        res.json({ success: true, data: { quoteNumber: `BG-${String(nextNum).padStart(4, '0')}` } });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};
