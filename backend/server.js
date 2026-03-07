require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const customerRoutes = require('./routes/customerRoutes');
const quoteRoutes = require('./routes/quoteRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const shopeeRoutes = require('./routes/shopeeRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const dataRoutes = require('./routes/dataRoutes');
const storefrontRoutes = require('./routes/storefrontRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Config uploads directory
const uploadDir = path.join(__dirname, '../uploads');
try {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
} catch (e) {
    console.warn("⚠️ Vercel/Serverless environment detected (Read-only file system). Skipping auto-create /uploads directory.");
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// Static files
app.use(express.static(path.join(__dirname, '../frontend/storefront'))); // Public storefront
app.use('/admin', express.static(path.join(__dirname, '../frontend/admin'))); // Admin panel

const isVercel = process.env.VERCEL === '1';
app.use('/uploads', express.static(isVercel ? '/tmp/uploads' : path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/shopee', shopeeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/storefront', storefrontRoutes);

// Export for testing or start directly
if (require.main === module) {
    async function startServer() {
        await initDatabase();
        app.listen(PORT, () => {
            console.log('');
            console.log('  ┌──────────────────────────────────────────┐');
            console.log('  │                                          │');
            console.log('  │   💰 Báo Giá Mini + Turso DB            │');
            console.log(`  │   🌐 http://localhost:${PORT}               │`);
            console.log('  │   💾 Tách module: /backend, /frontend    │');
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
}

module.exports = app;
