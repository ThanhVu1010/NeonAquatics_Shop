const path = require('path');
const multer = require('multer');
const { db } = require('../config/db');

function generateImageId() {
    return `img_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function toBuffer(rawData) {
    if (Buffer.isBuffer(rawData)) return rawData;
    if (rawData instanceof ArrayBuffer) return Buffer.from(new Uint8Array(rawData));
    if (rawData instanceof Uint8Array) return Buffer.from(rawData);
    if (typeof rawData === 'string') return Buffer.from(rawData, 'base64');
    return null;
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const mimeType = (file.mimetype || '').toLowerCase();
        const ext = path.extname(file.originalname || '').toLowerCase();
        const allowedExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.avif'];
        if (mimeType.startsWith('image/') || allowedExt.includes(ext)) return cb(null, true);
        cb(new Error('Chi cho phep file anh'));
    }
});

exports.uploadMiddleware = upload.single('image');

exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.json({ success: false, message: 'Vui long chon anh' });
        }

        const imageId = generateImageId();
        await db.execute({
            sql: 'INSERT INTO product_images (id, mime_type, data, created_at) VALUES (?, ?, ?, ?)',
            args: [imageId, req.file.mimetype, req.file.buffer, new Date().toISOString()]
        });

        res.json({ success: true, url: `/api/upload/${imageId}` });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.getImage = async (req, res) => {
    try {
        const imageId = (req.params.imageId || '').trim();
        if (!imageId) {
            return res.status(400).json({ success: false, message: 'Thieu image id' });
        }

        const result = await db.execute({
            sql: 'SELECT mime_type, data FROM product_images WHERE id = ? LIMIT 1',
            args: [imageId]
        });

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Khong tim thay anh' });
        }

        const row = result.rows[0];
        const imageBuffer = toBuffer(row.data);

        if (!imageBuffer || imageBuffer.length === 0) {
            return res.status(404).json({ success: false, message: 'Du lieu anh khong hop le' });
        }

        res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(imageBuffer);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
