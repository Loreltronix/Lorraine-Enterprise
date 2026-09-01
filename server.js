const express = require('express');
const path = require('path');
const cors = require('cors');
const { neon } = require('@neondatabase/serverless');

const app = express();

// Logging middleware - shows every request
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.url}`);
    next();
});

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

console.log('🚀 SERVER STARTING...');

// Database connection
let sql = null;
let dbConnected = false;
try {
    const connectionString = process.env.DATABASE__UNPOOLED || process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (connectionString) {
        sql = neon(connectionString);
        dbConnected = true;
        console.log('✅ Database connected');
    } else {
        console.log('⚠️ No database connection string. Using sample data.');
    }
} catch (error) {
    console.error('❌ Database connection error:', error.message);
}

// ============================================================
// SAMPLE DATA (for when database is not available)
// ============================================================
const sampleProducts = [
    { id: 1, name: 'Premium Laptop', price: 45000, category: 'laptops', available: true, stock_quantity: 10 },
    { id: 2, name: 'Gaming Desktop', price: 85000, category: 'desktops', available: true, stock_quantity: 5 },
    { id: 3, name: 'Wireless Headset', price: 3500, category: 'accessories', available: true, stock_quantity: 20 },
    { id: 4, name: '4K Monitor', price: 28000, category: 'monitors', available: true, stock_quantity: 8 }
];

// ============================================================
// API ROUTES - ALL /api/* MUST COME FIRST
// ============================================================

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: '✅ API is working!', dbConnected });
});

// Products
app.get('/api/products', async (req, res) => {
    console.log('📦 /api/products called');
    try {
        if (!dbConnected || !sql) {
            console.log('⚠️ Using sample products');
            return res.json(sampleProducts);
        }
        const products = await sql`SELECT * FROM products ORDER BY created_at DESC;`;
        res.json(products.length ? products : sampleProducts);
    } catch (error) {
        console.error('Products error:', error.message);
        res.json(sampleProducts);
    }
});

app.get('/api/products/:id', async (req, res) => {
    console.log(`📦 /api/products/${req.params.id} called`);
    try {
        if (!dbConnected || !sql) {
            const product = sampleProducts.find(p => p.id === parseInt(req.params.id));
            return product ? res.json(product) : res.status(404).json({ error: 'Product not found' });
        }
        const products = await sql`SELECT * FROM products WHERE id = ${parseInt(req.params.id)}`;
        if (products && products.length) res.json(products[0]);
        else res.status(404).json({ error: 'Product not found' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Services
app.get('/api/services', (req, res) => {
    res.json([
        { id: 101, name: 'Digital Marketing', price: 'Custom Quote', category: 'marketing', available: true },
        { id: 102, name: 'Branding Services', price: 'Custom Quote', category: 'branding', available: true },
        { id: 103, name: 'Web Development', price: 'Custom Quote', category: 'solutions', available: true }
    ]);
});

// Auth
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    console.log('🔐 Login attempt:', email);
    if (email === 'admin@lorraine.com' && password === 'Admin@2026') {
        res.json({
            token: 'fake-token-' + Date.now(),
            user: { id: 1, email, full_name: 'Admin', role: 'admin' }
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Admin - Add product
app.post('/api/admin/products', async (req, res) => {
    console.log('📦 /api/admin/products POST');
    try {
        if (!dbConnected || !sql) {
            // Simulate adding product
            const newProduct = { id: Date.now(), ...req.body };
            return res.json({ success: true, message: 'Product added (sample)', product: newProduct });
        }
        const { name, category, price, sale_price, description, features, stock_quantity, available, main_image } = req.body;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const result = await sql`
            INSERT INTO products (name, slug, category, price, sale_price, description, features, stock_quantity, available, main_image)
            VALUES (${name}, ${slug}, ${category}, ${price}, ${sale_price || null}, ${description || ''}, ${features || ''}, ${stock_quantity || 0}, ${available !== false}, ${main_image || ''})
            RETURNING *;
        `;
        res.json({ success: true, message: 'Product added successfully!', product: result[0] });
    } catch (error) {
        console.error('Add product error:', error.message);
        res.status(500).json({ error: 'Failed to add product', details: error.message });
    }
});

// Admin - Dashboard
app.get('/api/admin/dashboard', async (req, res) => {
    console.log('📊 /api/admin/dashboard called');
    try {
        const totalProducts = dbConnected && sql ? (await sql`SELECT COUNT(*) as count FROM products;`)[0]?.count || 0 : sampleProducts.length;
        res.json({
            total_products: parseInt(totalProducts) || sampleProducts.length,
            products_in_stock: parseInt(totalProducts) || sampleProducts.length,
            low_stock_products: 0,
            total_orders: 0,
            visitors_today: 42,
            total_revenue: 0,
            recent_orders: []
        });
    } catch (error) {
        res.json({
            total_products: sampleProducts.length,
            products_in_stock: sampleProducts.length,
            low_stock_products: 0,
            total_orders: 0,
            visitors_today: 42,
            total_revenue: 0,
            recent_orders: []
        });
    }
});

// Admin - Orders (empty for now)
app.get('/api/admin/orders', (req, res) => res.json([]));

// Orders
app.post('/api/orders', (req, res) => {
    const { customer_name } = req.body;
    console.log('📦 New order from:', customer_name);
    res.json({ success: true, order_number: 'ORD-' + Date.now(), status: 'Pending' });
});

app.get('/api/orders', (req, res) => res.json([]));
app.get('/api/orders/track/:orderNumber', (req, res) => {
    res.json({ order_number: req.params.orderNumber, status: 'Pending' });
});

// ============================================================
// HTML ROUTES - CATCH-ALL (MUST BE LAST)
// ============================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'lorraineenterprise.html'));
});

app.get('*', (req, res) => {
    // If it's an API request that wasn't matched, return 404 JSON
    if (req.url.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'lorraineenterprise.html'));
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log('📧 Email: admin@lorraine.com');
        console.log('🔑 Password: Admin@2026');
    });
}
