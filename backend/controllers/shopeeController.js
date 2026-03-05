const fetch = require('node-fetch');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SHOPEE_API_HOST = 'https://partner.shopeemobile.com';
const CONFIG_PATH = path.join(__dirname, '../../shopee_config.json');
const TOKENS_PATH = path.join(__dirname, '../../shopee_tokens.json');

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        }
    } catch (e) { }
    return { partnerId: '', partnerKey: '', shopId: '', redirectUrl: '' };
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function loadTokens() {
    try {
        if (fs.existsSync(TOKENS_PATH)) {
            return JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf-8'));
        }
    } catch (e) { }
    return { accessToken: '', refreshToken: '', expireAt: 0 };
}

function saveTokens(tokens) {
    fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
}

function generateSign(apiPath, timestamp, config, accessToken = '', shopId = '') {
    const partnerId = parseInt(config.partnerId);
    let baseStr = `${partnerId}${apiPath}${timestamp}`;
    if (accessToken) baseStr += accessToken;
    if (shopId) baseStr += shopId;
    return crypto.createHmac('sha256', config.partnerKey).update(baseStr).digest('hex');
}

function buildShopeeUrl(apiPath, config, tokens = null) {
    const timestamp = Math.floor(Date.now() / 1000);
    const partnerId = parseInt(config.partnerId);
    const shopId = parseInt(config.shopId);
    const accessToken = tokens ? tokens.accessToken : '';
    const sign = generateSign(apiPath, timestamp, config, accessToken, shopId.toString());

    let url = `${SHOPEE_API_HOST}${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;
    if (accessToken) url += `&access_token=${accessToken}`;
    if (shopId) url += `&shop_id=${shopId}`;
    return url;
}

async function refreshAccessToken() {
    const config = loadConfig();
    const tokens = loadTokens();
    const apiPath = '/api/v2/auth/token/get';
    const timestamp = Math.floor(Date.now() / 1000);
    const partnerId = parseInt(config.partnerId);
    const shopId = parseInt(config.shopId);
    const sign = generateSign(apiPath, timestamp, config);

    const url = `${SHOPEE_API_HOST}${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            refresh_token: tokens.refreshToken,
            partner_id: partnerId,
            shop_id: shopId
        })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.message || 'Refresh token failed');

    const newTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expireAt: Math.floor(Date.now() / 1000) + data.expire_in
    };
    saveTokens(newTokens);
    return newTokens;
}

async function shopeeRequest(apiPath, method = 'GET', body = null, needAuth = true) {
    const config = loadConfig();
    if (!config.partnerId || !config.partnerKey) {
        throw new Error('Chưa cấu hình Partner ID và Partner Key');
    }

    const tokens = needAuth ? loadTokens() : null;
    if (needAuth && (!tokens || !tokens.accessToken)) {
        throw new Error('Chưa kết nối shop Shopee. Vui lòng kết nối trước.');
    }

    if (needAuth && tokens.expireAt && Date.now() / 1000 > tokens.expireAt) {
        try {
            await refreshAccessToken();
        } catch (e) {
            throw new Error('Token hết hạn, vui lòng kết nối lại shop.');
        }
    }

    const url = buildShopeeUrl(apiPath, config, needAuth ? loadTokens() : null);
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    const data = await response.json();

    if (data.error) {
        throw new Error(data.message || data.error || 'Shopee API error');
    }
    return data;
}

exports.getStatus = (req, res) => {
    const tokens = loadTokens();
    const config = loadConfig();
    const isConnected = !!tokens.accessToken && tokens.expireAt > Date.now() / 1000;
    const hasConfig = !!config.partnerId && !!config.partnerKey;
    res.json({
        success: true,
        data: {
            connected: isConnected,
            shopId: config.shopId || '',
            expireAt: tokens.expireAt || 0,
            hasConfig
        }
    });
};

exports.connect = (req, res) => {
    const config = loadConfig();
    if (!config.partnerId || !config.partnerKey) {
        return res.json({ success: false, message: 'Vui lòng cấu hình Partner ID và Partner Key trước!' });
    }

    const apiPath = '/api/v2/shop/auth_partner';
    const timestamp = Math.floor(Date.now() / 1000);
    const PORT = process.env.PORT || 3001;
    const redirectUrl = config.redirectUrl || `http://localhost:${PORT}/api/shopee/auth/callback`;
    const sign = generateSign(apiPath, timestamp, config);
    const partnerId = parseInt(config.partnerId);

    const authUrl = `${SHOPEE_API_HOST}${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl)}`;
    res.json({ success: true, data: { authUrl } });
};

exports.callback = async (req, res) => {
    try {
        const { code, shop_id } = req.query;
        const config = loadConfig();
        config.shopId = shop_id;
        saveConfig(config);

        const apiPath = '/api/v2/auth/token/get';
        const timestamp = Math.floor(Date.now() / 1000);
        const partnerId = parseInt(config.partnerId);
        const sign = generateSign(apiPath, timestamp, config);

        const url = `${SHOPEE_API_HOST}${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                partner_id: partnerId,
                shop_id: parseInt(shop_id)
            })
        });

        const data = await response.json();
        if (data.error) {
            return res.send(`<html><body><h2>❌ Kết nối thất bại</h2><p>${data.message}</p><script>setTimeout(()=>window.close(),3000)</script></body></html>`);
        }

        const newTokens = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expireAt: Math.floor(Date.now() / 1000) + data.expire_in
        };
        saveTokens(newTokens);

        res.send(`<html><body style="font-family:Inter,sans-serif;text-align:center;padding:60px;background:#0f1117;color:#e8eaed">
            <h2 style="color:#22c55e">✅ Kết nối Shopee thành công!</h2>
            <p>Shop ID: ${shop_id}</p>
            <p>Bạn có thể đóng trang này và quay lại phần mềm.</p>
            <script>setTimeout(()=>{window.opener&&window.opener.checkShopeeConnection&&window.opener.checkShopeeConnection();window.close()},2000)</script>
        </body></html>`);
    } catch (err) {
        res.send(`<html><body><h2>❌ Lỗi</h2><p>${err.message}</p></body></html>`);
    }
};

exports.disconnect = (req, res) => {
    saveTokens({ accessToken: '', refreshToken: '', expireAt: 0 });
    res.json({ success: true, message: 'Đã ngắt kết nối Shopee!' });
};

exports.getShopInfo = async (req, res) => {
    try {
        const data = await shopeeRequest('/api/v2/shop/get_shop_info');
        res.json({ success: true, data: data.response });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.getProducts = async (req, res) => {
    try {
        const data = await shopeeRequest('/api/v2/product/get_item_list', 'GET');
        if (data.response && data.response.item) {
            const itemIds = data.response.item.map(i => i.item_id);
            if (itemIds.length > 0) {
                const detailData = await shopeeRequest(`/api/v2/product/get_item_base_info&item_id_list=${itemIds.join(',')}`, 'GET');
                return res.json({
                    success: true,
                    data: {
                        items: detailData.response ? detailData.response.item_list : [],
                        total: data.response.total_count || 0
                    }
                });
            }
        }
        res.json({ success: true, data: { items: [], total: 0 } });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.addProduct = async (req, res) => {
    try {
        const product = req.body;
        const data = await shopeeRequest('/api/v2/product/add_item', 'POST', {
            original_price: product.price,
            description: product.description || product.name,
            item_name: product.name,
            normal_stock: product.stock || 999,
            weight: product.weight || 0.5,
            category_id: product.shopee_category_id,
            image: product.images || {},
            item_sku: product.code || ''
        });
        res.json({ success: true, data: data.response, message: 'Đã thêm sản phẩm lên Shopee!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.updatePrice = async (req, res) => {
    try {
        const { itemId, price } = req.body;
        const data = await shopeeRequest('/api/v2/product/update_price', 'POST', {
            item_id: itemId,
            price_list: [{ original_price: price }]
        });
        res.json({ success: true, data: data.response, message: 'Đã cập nhật giá!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.updateStock = async (req, res) => {
    try {
        const { itemId, stock } = req.body;
        const data = await shopeeRequest('/api/v2/product/update_stock', 'POST', {
            item_id: itemId,
            stock_list: [{ normal_stock: stock }]
        });
        res.json({ success: true, data: data.response, message: 'Đã cập nhật tồn kho!' });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.getOrders = async (req, res) => {
    try {
        const data = await shopeeRequest('/api/v2/order/get_order_list', 'GET');
        res.json({
            success: true,
            data: {
                orders: data.response ? data.response.order_list : [],
                total: data.response ? data.response.total_count : 0
            }
        });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

exports.getCategories = async (req, res) => {
    try {
        const data = await shopeeRequest('/api/v2/product/get_category', 'GET');
        res.json({
            success: true,
            data: data.response ? data.response.category_list : []
        });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};
