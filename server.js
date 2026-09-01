const express = require('express');
const path = require('path');
const cors = require('cors');
const { neon } = require('@neondatabase/serverless');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

console.log('🚀 SERVER STARTING...');

// Database connection
let sql = null;
let dbConnected = false;
try {
    const connectionString = process.env.DATABASE__UNPOOLED || process.env.DATABASE_URL || process.env.POSTGRES_URL;
    console.log('🔍 Connection string found:', connectionString ? '✅ YES' : '❌ NO');
    
    if (connectionString) {
        sql = neon(connectionString);
        dbConnected = true;
        console.log('✅ Database connected');
    } else {
        console.log('⚠️ No database connection string found');
    }
} catch (error) {
    console.error('❌ Database connection error:', error.message);
}

// ============================================================
// API ROUTES
// ============================================================

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: '✅ API is working!', 
        timestamp: new Date().toISOString(),
        dbConnected: dbConnected
    });
});

// Products - with detailed error handling
app.get('/api/products', async (req, res) => {
    console.log('📦 Products API called');
    console.log('📦 dbConnected:', dbConnected);
    
    try {
        if (!dbConnected || !sql) {
            console.log('❌ No database connection');
            return res.status(500).json({ error: 'Database not connected' });
        }
        
        // Simple query to test connection
        console.log('📦 Running query...');
        const products = await sql`
            SELECT * FROM products ORDER BY created_at DESC;
        `;
        console.log('📦 Products found:', products ? products.length : 0);
        
        res.json(products || []);
    } catch (error) {
        console.error('❌ Products error:', error.message);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Failed to fetch products',
            details: error.message,
            stack: error.stack
        });
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

// Admin Dashboard
app.get('/api/admin/dashboard', async (req, res) => {
    console.log('📊 Dashboard API called');
    try {
        if (!dbConnected || !sql) {
            return res.json({
                total_products: 0,
                products_in_stock: 0,
                low_stock_products: 0,
                total_orders: 0,
                visitors_today: 42,
                total_revenue: 0,
                recent_orders: []
            });
        }
        
        const productCount = await sql`SELECT COUNT(*) as count FROM products;`;
        const totalProducts = productCount[0]?.count || 0;
        
        res.json({
            total_products: parseInt(totalProducts) || 0,
            products_in_stock: parseInt(totalProducts) || 0,
            low_stock_products: 0,
            total_orders: 0,
            visitors_today: 42,
            total_revenue: 0,
            recent_orders: []
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.json({
            total_products: 0,
            products_in_stock: 0,
            low_stock_products: 0,
            total_orders: 0,
            visitors_today: 42,
            total_revenue: 0,
            recent_orders: []
        });
    }
});

// Orders
app.post('/api/orders', async (req, res) => {
    const { customer_name, customer_email, customer_phone, delivery_address, items, total } = req.body;
    console.log('📦 New order from:', customer_name);
    res.json({
        success: true,
        order_number: 'ORD-' + Date.now(),
        status: 'Pending',
        customer_name,
        customer_email,
        total: total || 0
    });
});

app.get('/api/orders', (req, res) => {
    res.json([]);
});

app.get('/api/orders/track/:orderNumber', (req, res) => {
    const { orderNumber } = req.params;
    res.json({
        order_number: orderNumber,
        status: 'Pending',
        customer_name: 'Test Customer',
        total: 0
    });
});

// ============================================================
// HTML ROUTES - MUST COME LAST!
// ============================================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'lorraineenterprise.html'));
});

app.get('*', (req, res) => {
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
