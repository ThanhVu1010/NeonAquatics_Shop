const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../uploads')); // Assuming backend/controllers is dir
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

exports.uploadMiddleware = upload.single('image');

exports.uploadImage = (req, res) => {
    try {
        if (!req.file) {
            return res.json({ success: false, message: 'Vui lòng chọn ảnh' });
        }
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ success: true, url: fileUrl });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};
