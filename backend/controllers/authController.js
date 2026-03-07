const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'mat-khau-admin-mac-dinh-thuy-sinh-bao-gia';
const AUTH_SESSION_ID = Date.now().toString();

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.json({ success: false, message: 'Vui long nhap tai khoan va mat khau' });
        }

        const result = await db.execute({
            sql: 'SELECT * FROM users WHERE username = ?',
            args: [username]
        });

        if (result.rows.length === 0) {
            return res.json({ success: false, message: 'Tai khoan khong ton tai' });
        }

        const user = result.rows[0];
        const isMatch = bcrypt.compareSync(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: 'Mat khau khong chinh xac' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, sid: AUTH_SESSION_ID },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Dang nhap thanh cong',
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    role: user.role
                }
            }
        });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.authenticateToken = (req, res, next) => {
    if (req.path === '/api/shopee/auth/callback') return next();

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'Khong co quyen truy cap. Vui long dang nhap.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(401).json({ success: false, message: 'Phien dang nhap het han hoac khong hop le.' });
        }
        if (user.sid !== AUTH_SESSION_ID) {
            return res.status(401).json({ success: false, message: 'Phien dang nhap da het hieu luc sau khi khoi dong lai he thong.' });
        }

        req.user = user;
        next();
    });
};

exports.verify = async (req, res) => {
    res.json({
        success: true,
        data: {
            user: {
                id: req.user.id,
                username: req.user.username,
                role: req.user.role
            }
        }
    });
};
