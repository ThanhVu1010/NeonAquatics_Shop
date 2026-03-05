const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.json({ success: false, message: 'Vui lòng nhập tài khoản và mật khẩu' });
        }

        const result = await db.execute({
            sql: 'SELECT * FROM users WHERE username = ?',
            args: [username]
        });

        if (result.rows.length === 0) {
            return res.json({ success: false, message: 'Tài khoản không tồn tại' });
        }

        const user = result.rows[0];
        const isMatch = bcrypt.compareSync(password, user.password);

        if (!isMatch) {
            return res.json({ success: false, message: 'Mật khẩu không chính xác' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, message: 'Đăng nhập thành công', data: { token, user: { id: user.id, username: user.username, name: user.name, role: user.role } } });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.authenticateToken = (req, res, next) => {
    // Exempt shopee auth callback
    if (req.path === '/api/shopee/auth/callback') return next();

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ success: false, message: 'Không có quyền truy cập. Vui lòng đăng nhập.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(401).json({ success: false, message: 'Phiên đăng nhập hết hạn hoặc không hợp lệ.' });
        req.user = user;
        next();
    });
};
