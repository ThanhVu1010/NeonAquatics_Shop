/* ============================================
   TURSO DATABASE MODULE
   Khởi tạo kết nối và tạo bảng
   ============================================ */

require('dotenv').config();
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initDatabase() {
    console.log('🔄 Đang khởi tạo database...');

    // Create tables one by one to avoid batch issues
    await db.execute(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'staff',
        created_at TEXT
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        type TEXT DEFAULT 'retail',
        created_at TEXT
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        code TEXT,
        name TEXT NOT NULL,
        category_id TEXT,
        unit TEXT,
        price INTEGER NOT NULL DEFAULT 0,
        cost_price INTEGER DEFAULT 0,
        description TEXT,
        image_url TEXT,
        created_at TEXT
    )`);

    try {
        await db.execute(`ALTER TABLE products ADD COLUMN image_url TEXT`);
        console.log('✅ Đã thêm cột image_url vào bảng products');
    } catch (e) {
        // Assume column already exists
    }

    await db.execute(`CREATE TABLE IF NOT EXISTS quotes (
        id TEXT PRIMARY KEY,
        quote_number TEXT,
        customer TEXT NOT NULL,
        customer_phone TEXT,
        customer_address TEXT,
        note TEXT,
        total INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS quote_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quote_id TEXT NOT NULL,
        product_id TEXT,
        code TEXT,
        name TEXT NOT NULL,
        unit TEXT,
        price INTEGER NOT NULL DEFAULT 0,
        qty INTEGER NOT NULL DEFAULT 1,
        discount REAL DEFAULT 0
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);

    // Add stock column to products if it doesn't exist
    try {
        await db.execute('ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0');
        console.log('✅ Added stock column to products');
    } catch (e) {
        // Ignored if column already exists
    }

    // Add username and password column to customers if it doesn't exist
    try {
        await db.execute('ALTER TABLE customers ADD COLUMN username TEXT UNIQUE');
        await db.execute('ALTER TABLE customers ADD COLUMN password TEXT');
        console.log('✅ Added username and password columns to customers');
    } catch (e) {
        // Ignored if column already exists
    }

    // Add status column to quotes if it doesn't exist
    try {
        await db.execute("ALTER TABLE quotes ADD COLUMN status TEXT DEFAULT 'quote'");
        console.log('✅ Added status column to quotes');
    } catch (e) {
        // Ignored if column already exists
    }

    // Ensure default admin user exists
    const adminCheck = await db.execute("SELECT * FROM users WHERE username = 'admin'");
    if (adminCheck.rows.length === 0) {
        // password is 'admin123' hashed with bcrypt
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        await db.execute({
            sql: "INSERT INTO users (id, username, password, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            args: ['user_admin_001', 'admin', hashedPassword, 'Quản trị viên', 'admin', new Date().toISOString()]
        });
        console.log('✅ Đã tạo tài khoản admin mặc định (admin / admin123)');
    }

    console.log('✅ Database đã sẵn sàng!');
}

module.exports = { db, initDatabase };
