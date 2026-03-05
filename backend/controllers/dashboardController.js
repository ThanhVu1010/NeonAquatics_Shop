const { db } = require('../config/db');

exports.getStats = async (req, res) => {
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
};
