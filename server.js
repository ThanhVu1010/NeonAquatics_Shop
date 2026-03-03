/* ============================================
   BACKEND SERVER
   - Turso Database API (Categories, Products, Quotes, Settings)
   - Shopee Open Platform API v2 Proxy
   ============================================ */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const { db, initDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});
app.use(express.static(__dirname));

// ============= ID Generator =============
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/* =============================================
   TURSO DATABASE API - Categories, Products, Quotes, Settings
   ============================================= */

// ============= Categories API =============

app.get('/api/categories', async (req, res) => {
    try {
        const result = await db.execute('SELECT * FROM categories ORDER BY created_at DESC');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.post('/api/categories', async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.json({ success: false, message: 'Tên danh mục không được trống!' });
        const id = generateId();
        await db.execute({
            sql: 'INSERT INTO categories (id, name, description, created_at) VALUES (?, ?, ?, ?)',
            args: [id, name, description || '', new Date().toISOString()]
        });
        res.json({ success: true, message: 'Đã thêm danh mục!', data: { id } });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.put('/api/categories/:id', async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.json({ success: false, message: 'Tên danh mục không được trống!' });
        await db.execute({
            sql: 'UPDATE categories SET name = ?, description = ? WHERE id = ?',
            args: [name, description || '', req.params.id]
        });
        res.json({ success: true, message: 'Đã cập nhật danh mục!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.delete('/api/categories/:id', async (req, res) => {
    try {
        await db.execute({
            sql: 'DELETE FROM categories WHERE id = ?',
            args: [req.params.id]
        });
        res.json({ success: true, message: 'Đã xóa danh mục!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// ============= Products API =============

app.get('/api/products', async (req, res) => {
    try {
        const result = await db.execute('SELECT * FROM products ORDER BY created_at DESC');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const { code, name, categoryId, unit, price, costPrice, description } = req.body;
        if (!name) return res.json({ success: false, message: 'Tên sản phẩm không được trống!' });
        const id = generateId();
        await db.execute({
            sql: 'INSERT INTO products (id, code, name, category_id, unit, price, cost_price, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            args: [id, code || '', name, categoryId || '', unit || '', price || 0, costPrice || 0, description || '', new Date().toISOString()]
        });
        res.json({ success: true, message: 'Đã thêm sản phẩm!', data: { id } });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        const { code, name, categoryId, unit, price, costPrice, description } = req.body;
        if (!name) return res.json({ success: false, message: 'Tên sản phẩm không được trống!' });
        await db.execute({
            sql: 'UPDATE products SET code = ?, name = ?, category_id = ?, unit = ?, price = ?, cost_price = ?, description = ? WHERE id = ?',
            args: [code || '', name, categoryId || '', unit || '', price || 0, costPrice || 0, description || '', req.params.id]
        });
        res.json({ success: true, message: 'Đã cập nhật sản phẩm!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await db.execute({
            sql: 'DELETE FROM products WHERE id = ?',
            args: [req.params.id]
        });
        res.json({ success: true, message: 'Đã xóa sản phẩm!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// ============= Quotes API =============

app.get('/api/quotes', async (req, res) => {
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
});

app.post('/api/quotes', async (req, res) => {
    try {
        const { customer, customerPhone, customerAddress, note, total, items, quoteNumber } = req.body;
        if (!customer) return res.json({ success: false, message: 'Tên khách hàng không được trống!' });
        const id = generateId();

        await db.execute({
            sql: 'INSERT INTO quotes (id, quote_number, customer, customer_phone, customer_address, note, total, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            args: [id, quoteNumber || '', customer, customerPhone || '', customerAddress || '', note || '', total || 0, new Date().toISOString()]
        });

        // Insert quote items
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
});

app.put('/api/quotes/:id', async (req, res) => {
    try {
        const { customer, customerPhone, customerAddress, note, total, items } = req.body;
        if (!customer) return res.json({ success: false, message: 'Tên khách hàng không được trống!' });

        await db.execute({
            sql: 'UPDATE quotes SET customer = ?, customer_phone = ?, customer_address = ?, note = ?, total = ?, updated_at = datetime(\'now\') WHERE id = ?',
            args: [customer, customerPhone || '', customerAddress || '', note || '', total || 0, req.params.id]
        });

        // Delete old items and insert new ones
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
});

app.delete('/api/quotes/:id', async (req, res) => {
    try {
        await db.execute({ sql: 'DELETE FROM quote_items WHERE quote_id = ?', args: [req.params.id] });
        await db.execute({ sql: 'DELETE FROM quotes WHERE id = ?', args: [req.params.id] });
        res.json({ success: true, message: 'Đã xóa báo giá!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// ============= Settings API =============

app.get('/api/settings', async (req, res) => {
    try {
        const result = await db.execute('SELECT * FROM settings');
        const settings = {};
        result.rows.forEach(row => { settings[row.key] = row.value; });
        res.json({ success: true, data: settings });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.post('/api/settings', async (req, res) => {
    try {
        const settings = req.body;
        for (const [key, value] of Object.entries(settings)) {
            await db.execute({
                sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                args: [key, value || '']
            });
        }
        res.json({ success: true, message: 'Đã lưu cài đặt!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// ============= Export / Import API =============

app.get('/api/data/export', async (req, res) => {
    try {
        const categoriesResult = await db.execute('SELECT * FROM categories');
        const productsResult = await db.execute('SELECT * FROM products');
        const quotesResult = await db.execute('SELECT * FROM quotes');
        const settingsResult = await db.execute('SELECT * FROM settings');

        // Map products back to camelCase for compatibility
        const products = productsResult.rows.map(p => ({
            id: p.id, code: p.code, name: p.name,
            categoryId: p.category_id, unit: p.unit,
            price: p.price, costPrice: p.cost_price,
            description: p.description, createdAt: p.created_at
        }));

        const categories = categoriesResult.rows.map(c => ({
            id: c.id, name: c.name, description: c.description, createdAt: c.created_at
        }));

        // Build quotes with items
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
});

app.post('/api/data/import', async (req, res) => {
    try {
        const { categories, products, quotes, settings } = req.body;

        // Clear existing data
        await db.execute('DELETE FROM quote_items');
        await db.execute('DELETE FROM quotes');
        await db.execute('DELETE FROM products');
        await db.execute('DELETE FROM categories');
        await db.execute('DELETE FROM settings');

        // Import categories
        if (categories && categories.length > 0) {
            for (const c of categories) {
                await db.execute({
                    sql: 'INSERT INTO categories (id, name, description, created_at) VALUES (?, ?, ?, ?)',
                    args: [c.id, c.name, c.description || '', c.createdAt || new Date().toISOString()]
                });
            }
        }

        // Import products
        if (products && products.length > 0) {
            for (const p of products) {
                await db.execute({
                    sql: 'INSERT INTO products (id, code, name, category_id, unit, price, cost_price, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    args: [p.id, p.code || '', p.name, p.categoryId || '', p.unit || '', p.price || 0, p.costPrice || 0, p.description || '', p.createdAt || new Date().toISOString()]
                });
            }
        }

        // Import quotes + items
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

        // Import settings
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
});

// ============= Dashboard Stats API =============

app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const catCount = await db.execute('SELECT COUNT(*) as count FROM categories');
        const prodCount = await db.execute('SELECT COUNT(*) as count FROM products');
        const quoteCount = await db.execute('SELECT COUNT(*) as count FROM quotes');
        const revenue = await db.execute('SELECT COALESCE(SUM(total), 0) as total FROM quotes');

        res.json({
            success: true,
            data: {
                totalCategories: catCount.rows[0].count,
                totalProducts: prodCount.rows[0].count,
                totalQuotes: quoteCount.rows[0].count,
                totalRevenue: revenue.rows[0].total
            }
        });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// ============= Quote Number Generator =============

app.get('/api/quotes/next-number', async (req, res) => {
    try {
        const result = await db.execute('SELECT COUNT(*) as count FROM quotes');
        const nextNum = (result.rows[0].count || 0) + 1;
        res.json({ success: true, data: { quoteNumber: `BG-${String(nextNum).padStart(4, '0')}` } });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

/* =============================================
   SHOPEE API PROXY (giữ nguyên)
   ============================================= */

const SHOPEE_API_HOST = 'https://partner.shopeemobile.com';
const CONFIG_PATH = path.join(__dirname, 'shopee_config.json');
const TOKENS_PATH = path.join(__dirname, 'shopee_tokens.json');

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        }
    } catch (e) { }
    return { partnerId: '', partnerKey: '', shopId: '', redirectUrl: '' };
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function loadTokens() {
    try {
        if (fs.existsSync(TOKENS_PATH)) {
            return JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf-8'));
        }
    } catch (e) { }
    return { accessToken: '', refreshToken: '', expireAt: 0 };
}

function saveTokens(tokens) {
    fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
}

function generateSign(apiPath, timestamp, config, accessToken = '', shopId = '') {
    const partnerId = parseInt(config.partnerId);
    let baseStr = `${partnerId}${apiPath}${timestamp}`;
    if (accessToken) baseStr += accessToken;
    if (shopId) baseStr += shopId;
    return crypto.createHmac('sha256', config.partnerKey).update(baseStr).digest('hex');
}

function buildShopeeUrl(apiPath, config, tokens = null) {
    const timestamp = Math.floor(Date.now() / 1000);
    const partnerId = parseInt(config.partnerId);
    const shopId = parseInt(config.shopId);
    const accessToken = tokens ? tokens.accessToken : '';
    const sign = generateSign(apiPath, timestamp, config, accessToken, shopId.toString());

    let url = `${SHOPEE_API_HOST}${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;
    if (accessToken) url += `&access_token=${accessToken}`;
    if (shopId) url += `&shop_id=${shopId}`;
    return url;
}

async function shopeeRequest(apiPath, method = 'GET', body = null, needAuth = true) {
    const config = loadConfig();
    if (!config.partnerId || !config.partnerKey) {
        throw new Error('Chưa cấu hình Partner ID và Partner Key');
    }

    const tokens = needAuth ? loadTokens() : null;
    if (needAuth && (!tokens || !tokens.accessToken)) {
        throw new Error('Chưa kết nối shop Shopee. Vui lòng kết nối trước.');
    }

    if (needAuth && tokens.expireAt && Date.now() / 1000 > tokens.expireAt) {
        try {
            await refreshAccessToken();
        } catch (e) {
            throw new Error('Token hết hạn, vui lòng kết nối lại shop.');
        }
    }

    const url = buildShopeeUrl(apiPath, config, needAuth ? loadTokens() : null);
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    const data = await response.json();

    if (data.error) {
        throw new Error(data.message || data.error || 'Shopee API error');
    }
    return data;
}

async function refreshAccessToken() {
    const config = loadConfig();
    const tokens = loadTokens();
    const apiPath = '/api/v2/auth/token/get';
    const timestamp = Math.floor(Date.now() / 1000);
    const partnerId = parseInt(config.partnerId);
    const shopId = parseInt(config.shopId);
    const sign = generateSign(apiPath, timestamp, config);

    const url = `${SHOPEE_API_HOST}${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            refresh_token: tokens.refreshToken,
            partner_id: partnerId,
            shop_id: shopId
        })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.message || 'Refresh token failed');

    const newTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expireAt: Math.floor(Date.now() / 1000) + data.expire_in
    };
    saveTokens(newTokens);
    return newTokens;
}

// --- Auth ---
app.get('/api/shopee/auth/status', (req, res) => {
    const tokens = loadTokens();
    const config = loadConfig();
    const isConnected = !!tokens.accessToken && tokens.expireAt > Date.now() / 1000;
    const hasConfig = !!config.partnerId && !!config.partnerKey;
    res.json({
        success: true,
        data: {
            connected: isConnected,
            shopId: config.shopId || '',
            expireAt: tokens.expireAt || 0,
            hasConfig
        }
    });
});

app.get('/api/shopee/auth/connect', (req, res) => {
    const config = loadConfig();
    if (!config.partnerId || !config.partnerKey) {
        return res.json({ success: false, message: 'Vui lòng cấu hình Partner ID và Partner Key trước!' });
    }

    const apiPath = '/api/v2/shop/auth_partner';
    const timestamp = Math.floor(Date.now() / 1000);
    const redirectUrl = config.redirectUrl || `http://localhost:${PORT}/api/shopee/auth/callback`;
    const sign = generateSign(apiPath, timestamp, config);
    const partnerId = parseInt(config.partnerId);

    const authUrl = `${SHOPEE_API_HOST}${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl)}`;
    res.json({ success: true, data: { authUrl } });
});

app.get('/api/shopee/auth/callback', async (req, res) => {
    try {
        const { code, shop_id } = req.query;
        const config = loadConfig();
        config.shopId = shop_id;
        saveConfig(config);

        const apiPath = '/api/v2/auth/token/get';
        const timestamp = Math.floor(Date.now() / 1000);
        const partnerId = parseInt(config.partnerId);
        const sign = generateSign(apiPath, timestamp, config);

        const url = `${SHOPEE_API_HOST}${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                partner_id: partnerId,
                shop_id: parseInt(shop_id)
            })
        });

        const data = await response.json();
        if (data.error) {
            return res.send(`<html><body><h2>❌ Kết nối thất bại</h2><p>${data.message}</p><script>setTimeout(()=>window.close(),3000)</script></body></html>`);
        }

        const newTokens = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expireAt: Math.floor(Date.now() / 1000) + data.expire_in
        };
        saveTokens(newTokens);

        res.send(`<html><body style="font-family:Inter,sans-serif;text-align:center;padding:60px;background:#0f1117;color:#e8eaed">
            <h2 style="color:#22c55e">✅ Kết nối Shopee thành công!</h2>
            <p>Shop ID: ${shop_id}</p>
            <p>Bạn có thể đóng trang này và quay lại phần mềm.</p>
            <script>setTimeout(()=>{window.opener&&window.opener.checkShopeeConnection&&window.opener.checkShopeeConnection();window.close()},2000)</script>
        </body></html>`);
    } catch (err) {
        res.send(`<html><body><h2>❌ Lỗi</h2><p>${err.message}</p></body></html>`);
    }
});

app.post('/api/shopee/auth/disconnect', (req, res) => {
    saveTokens({ accessToken: '', refreshToken: '', expireAt: 0 });
    res.json({ success: true, message: 'Đã ngắt kết nối Shopee!' });
});

app.get('/api/shopee/shop/info', async (req, res) => {
    try {
        const data = await shopeeRequest('/api/v2/shop/get_shop_info');
        res.json({ success: true, data: data.response });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.get('/api/shopee/products', async (req, res) => {
    try {
        const data = await shopeeRequest('/api/v2/product/get_item_list', 'GET');
        if (data.response && data.response.item) {
            const itemIds = data.response.item.map(i => i.item_id);
            if (itemIds.length > 0) {
                const detailData = await shopeeRequest(`/api/v2/product/get_item_base_info&item_id_list=${itemIds.join(',')}`, 'GET');
                return res.json({
                    success: true,
                    data: {
                        items: detailData.response ? detailData.response.item_list : [],
                        total: data.response.total_count || 0
                    }
                });
            }
        }
        res.json({ success: true, data: { items: [], total: 0 } });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.post('/api/shopee/products/add', async (req, res) => {
    try {
        const product = req.body;
        const data = await shopeeRequest('/api/v2/product/add_item', 'POST', {
            original_price: product.price,
            description: product.description || product.name,
            item_name: product.name,
            normal_stock: product.stock || 999,
            weight: product.weight || 0.5,
            category_id: product.shopee_category_id,
            image: product.images || {},
            item_sku: product.code || ''
        });
        res.json({ success: true, data: data.response, message: 'Đã thêm sản phẩm lên Shopee!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.put('/api/shopee/products/update-price', async (req, res) => {
    try {
        const { itemId, price } = req.body;
        const data = await shopeeRequest('/api/v2/product/update_price', 'POST', {
            item_id: itemId,
            price_list: [{ original_price: price }]
        });
        res.json({ success: true, data: data.response, message: 'Đã cập nhật giá!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.put('/api/shopee/products/update-stock', async (req, res) => {
    try {
        const { itemId, stock } = req.body;
        const data = await shopeeRequest('/api/v2/product/update_stock', 'POST', {
            item_id: itemId,
            stock_list: [{ normal_stock: stock }]
        });
        res.json({ success: true, data: data.response, message: 'Đã cập nhật tồn kho!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.get('/api/shopee/orders', async (req, res) => {
    try {
        const data = await shopeeRequest('/api/v2/order/get_order_list', 'GET');
        res.json({
            success: true,
            data: {
                orders: data.response ? data.response.order_list : [],
                total: data.response ? data.response.total_count : 0
            }
        });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.get('/api/shopee/categories', async (req, res) => {
    try {
        const data = await shopeeRequest('/api/v2/product/get_category', 'GET');
        res.json({
            success: true,
            data: data.response ? data.response.category_list : []
        });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// ============= Start Server =============
async function startServer() {
    await initDatabase();
    app.listen(PORT, () => {
        console.log('');
        console.log('  ┌──────────────────────────────────────────┐');
        console.log('  │                                          │');
        console.log('  │   💰 Báo Giá Mini + Turso DB            │');
        console.log(`  │   🌐 http://localhost:${PORT}               │`);
        console.log('  │   💾 Database: Turso (SQLite cloud)      │');
        console.log('  │                                          │');
        console.log('  │   Nhấn Ctrl+C để dừng server             │');
        console.log('  │                                          │');
        console.log('  └──────────────────────────────────────────┘');
        console.log('');
    });
}

startServer().catch(err => {
    console.error('❌ Không thể khởi động server:', err.message);
    process.exit(1);
});
