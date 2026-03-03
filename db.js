/* ============================================
   TURSO DATABASE MODULE
   Khởi tạo kết nối và tạo bảng
   ============================================ */

require('dotenv').config();
const { createClient } = require('@libsql/client');

const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initDatabase() {
    console.log('🔄 Đang khởi tạo database...');

    // Create tables one by one to avoid batch issues
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
        created_at TEXT
    )`);

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

    console.log('✅ Database đã sẵn sàng!');
}

module.exports = { db, initDatabase };
