const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

exports.registerCustomer = async (req, res) => {
    try {
        const { username, password, name, phone, address } = req.body;

        if (!username || !password || !name || !phone) {
            return res.json({ success: false, message: 'Vui lòng nhập đủ các trường (Username, Password, Name, Phone)' });
        }

        // Check if username exists
        const check = await db.execute({
            sql: 'SELECT * FROM customers WHERE username = ?',
            args: [username]
        });
        if (check.rows.length > 0) {
            return res.json({ success: false, message: 'Tên đăng nhập này đã tồn tại' });
        }

        const id = 'customer_' + Date.now();
        const hashedPassword = bcrypt.hashSync(password, 10);
        const createdAt = new Date().toISOString();

        await db.execute({
            sql: 'INSERT INTO customers (id, username, password, name, phone, address, type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            args: [id, username, hashedPassword, name, phone, address || '', 'retail', createdAt]
        });

        res.json({ success: true, message: 'Đăng ký thành công' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.loginCustomer = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.json({ success: false, message: 'Vui lòng nhập tài khoản và mật khẩu' });
        }

        const result = await db.execute({
            sql: 'SELECT * FROM customers WHERE username = ?',
            args: [username]
        });

        if (result.rows.length === 0) {
            return res.json({ success: false, message: 'Tài khoản không tồn tại' });
        }

        const customer = result.rows[0];

        if (!customer.password) {
            return res.json({ success: false, message: 'Tài khoản này được tạo bởi cửa hàng và chưa có mật khẩu trên web' });
        }

        const isMatch = bcrypt.compareSync(password, customer.password);
        if (!isMatch) {
            return res.json({ success: false, message: 'Mật khẩu không chính xác' });
        }

        const token = jwt.sign({ id: customer.id, username: customer.username, isCustomer: true }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            data: {
                token,
                user: { id: customer.id, username: customer.username, name: customer.name, phone: customer.phone, address: customer.address }
            }
        });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.authenticateCustomer = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ success: false, message: 'Không có quyền truy cập.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err || !user.isCustomer) return res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ.' });
        req.user = user;
        next();
    });
};

exports.getCategories = async (req, res) => {
    try {
        const result = await db.execute('SELECT * FROM categories ORDER BY name');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.getProducts = async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            ORDER BY p.name
        `);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.processCheckout = async (req, res) => {
    try {
        const { items, note, total } = req.body;
        const customerId = req.user.id;

        // Fetch customer details
        const cResult = await db.execute({
            sql: 'SELECT * FROM customers WHERE id = ?',
            args: [customerId]
        });

        if (cResult.rows.length === 0) {
            return res.json({ success: false, message: 'Không tìm thấy thông tin khách hàng' });
        }
        const customer = cResult.rows[0];

        // Generate Quote number
        const result = await db.execute('SELECT quote_number FROM quotes ORDER BY created_at DESC LIMIT 1');
        let nextNumber = 'BG001';
        if (result.rows.length > 0) {
            const lastNumber = result.rows[0].quote_number;
            const match = lastNumber.match(/BG(\d+)/);
            if (match) {
                const num = parseInt(match[1]) + 1;
                nextNumber = `BG${num.toString().padStart(3, '0')}`;
            }
        }

        const quoteId = 'quote_' + Date.now();
        const now = new Date().toISOString();

        // Save Quote/Order
        await db.execute({
            sql: `INSERT INTO quotes (id, quote_number, customer, customer_phone, customer_address, note, total, created_at, updated_at, status) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [quoteId, nextNumber, customer.name, customer.phone, customer.address, `[WEB ORDER] ${note || ''}`, total, now, now, 'quote']
        });

        // Save Quote Items
        for (const item of items) {
            await db.execute({
                sql: `INSERT INTO quote_items (quote_id, product_id, code, name, unit, price, qty, discount) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [quoteId, item.product_id, item.code, item.name, item.unit, item.price, item.qty, item.discount || 0]
            });
        }

        res.json({ success: true, message: 'Đặt hàng thành công! Vui lòng chờ xử lý' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        const customerId = req.user.id;

        // Match customer by phone to cover quotes created directly by admin vs storefront
        const cResult = await db.execute({
            sql: 'SELECT phone FROM customers WHERE id = ?',
            args: [customerId]
        });

        if (cResult.rows.length === 0) return res.json({ success: true, data: [] });
        const phone = cResult.rows[0].phone;

        const result = await db.execute({
            sql: 'SELECT * FROM quotes WHERE customer_phone = ? ORDER BY created_at DESC',
            args: [phone]
        });

        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};
