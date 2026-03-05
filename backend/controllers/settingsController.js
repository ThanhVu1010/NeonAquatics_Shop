const { db } = require('../config/db');

exports.getSettings = async (req, res) => {
    try {
        const result = await db.execute('SELECT * FROM settings');
        const settings = {};
        result.rows.forEach(row => { settings[row.key] = row.value; });
        res.json({ success: true, data: settings });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.updateSettings = async (req, res) => {
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
};
