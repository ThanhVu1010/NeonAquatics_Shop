const { db } = require('../config/db');

exports.exportData = async (req, res) => {
    try {
        const categoriesResult = await db.execute('SELECT * FROM categories');
        const productsResult = await db.execute('SELECT * FROM products');
        const quotesResult = await db.execute('SELECT * FROM quotes');
        const settingsResult = await db.execute('SELECT * FROM settings');

        const products = productsResult.rows.map(p => ({
            id: p.id, code: p.code, name: p.name,
            categoryId: p.category_id, unit: p.unit,
            price: p.price, costPrice: p.cost_price,
            description: p.description, createdAt: p.created_at
        }));

        const categories = categoriesResult.rows.map(c => ({
            id: c.id, name: c.name, description: c.description, createdAt: c.created_at
        }));

        const quotes = [];
        for (const q of quotesResult.rows) {
            const itemsResult = await db.execute({
                sql: 'SELECT * FROM quote_items WHERE quote_id = ?', args: [q.id]
            });
            quotes.push({
                id: q.id, quoteNumber: q.quote_number, customer: q.customer,
                customerPhone: q.customer_phone, customerAddress: q.customer_address,
                note: q.note, total: q.total, createdAt: q.created_at, updatedAt: q.updated_at,
                items: itemsResult.rows.map(item => ({
                    productId: item.product_id, code: item.code, name: item.name,
                    unit: item.unit, price: item.price, qty: item.qty, discount: item.discount
                }))
            });
        }

        const settings = {};
        settingsResult.rows.forEach(row => { settings[row.key] = row.value; });

        res.json({
            success: true,
            data: { categories, products, quotes, settings, exportedAt: new Date().toISOString() }
        });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.importData = async (req, res) => {
    try {
        const { categories, products, quotes, settings } = req.body;

        await db.execute('DELETE FROM quote_items');
        await db.execute('DELETE FROM quotes');
        await db.execute('DELETE FROM products');
        await db.execute('DELETE FROM categories');
        await db.execute('DELETE FROM settings');

        if (categories && categories.length > 0) {
            for (const c of categories) {
                await db.execute({
                    sql: 'INSERT INTO categories (id, name, description, created_at) VALUES (?, ?, ?, ?)',
                    args: [c.id, c.name, c.description || '', c.createdAt || new Date().toISOString()]
                });
            }
        }

        if (products && products.length > 0) {
            for (const p of products) {
                await db.execute({
                    sql: 'INSERT INTO products (id, code, name, category_id, unit, price, cost_price, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    args: [p.id, p.code || '', p.name, p.categoryId || '', p.unit || '', p.price || 0, p.costPrice || 0, p.description || '', p.createdAt || new Date().toISOString()]
                });
            }
        }

        if (quotes && quotes.length > 0) {
            for (const q of quotes) {
                await db.execute({
                    sql: 'INSERT INTO quotes (id, quote_number, customer, customer_phone, customer_address, note, total, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    args: [q.id, q.quoteNumber || '', q.customer, q.customerPhone || '', q.customerAddress || '', q.note || '', q.total || 0, q.createdAt || new Date().toISOString(), q.updatedAt || null]
                });
                if (q.items && q.items.length > 0) {
                    for (const item of q.items) {
                        await db.execute({
                            sql: 'INSERT INTO quote_items (quote_id, product_id, code, name, unit, price, qty, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                            args: [q.id, item.productId || '', item.code || '', item.name, item.unit || '', item.price || 0, item.qty || 1, item.discount || 0]
                        });
                    }
                }
            }
        }

        if (settings) {
            for (const [key, value] of Object.entries(settings)) {
                await db.execute({
                    sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                    args: [key, value || '']
                });
            }
        }

        res.json({ success: true, message: 'Đã nhập dữ liệu thành công!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};
