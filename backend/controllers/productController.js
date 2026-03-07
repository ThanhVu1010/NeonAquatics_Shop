const { db } = require('../config/db');

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function normalizeText(value) {
    return (value || '').toString().trim();
}

function toNonNegativeInt(value, label) {
    const num = Number(value ?? 0);
    if (!Number.isFinite(num) || num < 0) {
        return { ok: false, message: `${label} khong hop le!` };
    }
    return { ok: true, value: Math.floor(num) };
}

function validateProductPayload(payload) {
    const code = normalizeText(payload.code);
    const name = normalizeText(payload.name);
    const categoryId = normalizeText(payload.categoryId);
    const unit = normalizeText(payload.unit);
    const description = normalizeText(payload.description);
    const image_url = normalizeText(payload.image_url) || null;
    const phanKhuc = normalizeText(payload.phanKhuc);
    const nguonHang = normalizeText(payload.nguonHang);
    const sanChuLuc = normalizeText(payload.sanChuLuc);
    const usp = normalizeText(payload.usp);
    const nhap = Number(payload.nhap) > 0 ? 1 : 0;

    if (!name) return { ok: false, message: 'Ten san pham khong duoc trong!' };
    if (!categoryId) return { ok: false, message: 'Vui long chon dong hang!' };

    const priceParsed = toNonNegativeInt(payload.price, 'Gia ban');
    if (!priceParsed.ok) return priceParsed;

    const costParsed = toNonNegativeInt(payload.costPrice, 'Gia von');
    if (!costParsed.ok) return costParsed;

    const stockParsed = toNonNegativeInt(payload.stock, 'So luong ton');
    if (!stockParsed.ok) return stockParsed;

    return {
        ok: true,
        value: {
            code,
            name,
            categoryId,
            unit,
            price: priceParsed.value,
            costPrice: costParsed.value,
            stock: stockParsed.value,
            description,
            image_url,
            phanKhuc,
            nguonHang,
            sanChuLuc,
            nhap,
            usp
        }
    };
}

async function isCodeExists(code, excludeId = null) {
    if (!code) return false;

    const result = await db.execute({
        sql: excludeId
            ? 'SELECT id FROM products WHERE code = ? AND id <> ? LIMIT 1'
            : 'SELECT id FROM products WHERE code = ? LIMIT 1',
        args: excludeId ? [code, excludeId] : [code]
    });
    return result.rows.length > 0;
}

async function isNameExistsInCategory(name, categoryId, excludeId = null) {
    const normalizedName = normalizeText(name);
    const normalizedCategoryId = normalizeText(categoryId);
    if (!normalizedName || !normalizedCategoryId) return false;

    const result = await db.execute({
        sql: excludeId
            ? 'SELECT id FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND category_id = ? AND id <> ? LIMIT 1'
            : 'SELECT id FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND category_id = ? LIMIT 1',
        args: excludeId
            ? [normalizedName, normalizedCategoryId, excludeId]
            : [normalizedName, normalizedCategoryId]
    });
    return result.rows.length > 0;
}

exports.getProducts = async (req, res) => {
    try {
        const result = await db.execute('SELECT * FROM products ORDER BY created_at DESC');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const parsed = validateProductPayload(req.body || {});
        if (!parsed.ok) return res.json({ success: false, message: parsed.message });

        const data = parsed.value;
        if (await isCodeExists(data.code)) {
            return res.json({ success: false, message: 'Ma san pham da ton tai!' });
        }
        if (await isNameExistsInCategory(data.name, data.categoryId)) {
            return res.json({ success: false, message: 'San pham nay da ton tai trong dong hang da chon!' });
        }

        const id = generateId();
        await db.execute({
            sql: 'INSERT INTO products (id, code, name, category_id, unit, price, cost_price, stock, description, image_url, phan_khuc, nguon_hang, san_chu_luc, nhap, usp, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            args: [
                id,
                data.code,
                data.name,
                data.categoryId,
                data.unit,
                data.price,
                data.costPrice,
                data.stock,
                data.description,
                data.image_url,
                data.phanKhuc,
                data.nguonHang,
                data.sanChuLuc,
                data.nhap,
                data.usp,
                new Date().toISOString()
            ]
        });

        res.json({ success: true, message: 'Da them san pham!', data: { id } });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const parsed = validateProductPayload(req.body || {});
        if (!parsed.ok) return res.json({ success: false, message: parsed.message });

        const data = parsed.value;
        if (await isCodeExists(data.code, req.params.id)) {
            return res.json({ success: false, message: 'Ma san pham da duoc su dung boi san pham khac!' });
        }
        if (await isNameExistsInCategory(data.name, data.categoryId, req.params.id)) {
            return res.json({ success: false, message: 'San pham nay da ton tai trong dong hang da chon!' });
        }

        await db.execute({
            sql: 'UPDATE products SET code = ?, name = ?, category_id = ?, unit = ?, price = ?, cost_price = ?, stock = ?, description = ?, image_url = ?, phan_khuc = ?, nguon_hang = ?, san_chu_luc = ?, nhap = ?, usp = ? WHERE id = ?',
            args: [
                data.code,
                data.name,
                data.categoryId,
                data.unit,
                data.price,
                data.costPrice,
                data.stock,
                data.description,
                data.image_url,
                data.phanKhuc,
                data.nguonHang,
                data.sanChuLuc,
                data.nhap,
                data.usp,
                req.params.id
            ]
        });

        res.json({ success: true, message: 'Da cap nhat san pham!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        await db.execute({
            sql: 'DELETE FROM products WHERE id = ?',
            args: [req.params.id]
        });
        res.json({ success: true, message: 'Da xoa san pham!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};
