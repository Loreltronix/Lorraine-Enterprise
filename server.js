const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

console.log('🚀 SERVER STARTING...');

// ============================================================
// API ROUTES
// ============================================================

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: '✅ API is working!', timestamp: new Date().toISOString() });
});

// Products
app.get('/api/products', (req, res) => {
    console.log('📦 Products API called');
    res.json([
        { id: 1, name: 'Premium Laptop', price: 45000, category: 'laptops', available: true, stock_quantity: 10 },
        { id: 2, name: 'Gaming Desktop', price: 85000, category: 'desktops', available: true, stock_quantity: 5 },
        { id: 3, name: 'Wireless Headset', price: 3500, category: 'accessories', available: true, stock_quantity: 20 },
        { id: 4, name: '4K Monitor', price: 28000, category: 'monitors', available: true, stock_quantity: 8 },
        { id: 5, name: 'Mechanical Keyboard', price: 4500, category: 'accessories', available: true, stock_quantity: 15 },
        { id: 6, name: 'Gaming Mouse', price: 2500, category: 'accessories', available: true, stock_quantity: 25 }
    ]);
});

// Services
app.get('/api/services', (req, res) => {
    console.log('�� Services API called');
    res.json([
        { id: 101, name: 'Digital Marketing', price: 'Custom Quote', category: 'marketing', available: true },
        { id: 102, name: 'Branding Services', price: 'Custom Quote', category: 'branding', available: true },
        { id: 103, name: 'Web Development', price: 'Custom Quote', category: 'solutions', available: true }
    ]);
});

// ============================================================
// AUTH ENDPOINTS
// ============================================================

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

app.post('/api/auth/register', (req, res) => {
    const { email, password, full_name } = req.body;
    res.json({
        token: 'fake-token-' + Date.now(),
        user: { id: 2, email, full_name: full_name || 'Customer', role: 'customer' }
    });
});

app.get('/api/auth/me', (req, res) => {
    res.json({ id: 1, email: 'admin@lorraine.com', full_name: 'Admin', role: 'admin' });
});

// ============================================================
// ORDERS ENDPOINTS
// ============================================================

app.post('/api/orders', (req, res) => {
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
// ADMIN ENDPOINTS
// ============================================================


app.get('/api/admin/dashboard', async (req, res) => {
    try {
        const { neon } = require('@neondatabase/serverless');
        const sql = neon(process.env.DATABASE__UNPOOLED);
        
        // Get order count
        const orderCount = await sql`SELECT COUNT(*) as count FROM orders;`;
        const totalOrders = orderCount[0]?.count || 0;
        
        // Get recent orders
        const recentOrders = await sql`
            SELECT * FROM orders 
            ORDER BY created_at DESC 
            LIMIT 5;
        `;
        
        res.json({
            total_products: 6,
            products_in_stock: 6,
            low_stock_products: 0,
            total_orders: parseInt(totalOrders),
            visitors_today: 42,
            total_revenue: 0,
            recent_orders: recentOrders || []
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

});

app.get('/api/admin/orders', (req, res) => {
    res.json([]);
});

app.get('/api/admin/products', (req, res) => {
    res.json([]);
});

app.get('/api/admin/users', (req, res) => {
    res.json([]);
});

app.get('/api/admin/enquiries', (req, res) => {
    res.json([]);
});

// ============================================================
// SERVICE ENQUIRIES
// ============================================================

app.post('/api/service-enquiries', (req, res) => {
    const { customer_name, customer_email, message } = req.body;
    console.log('📧 New enquiry from:', customer_name);
    res.json({ success: true, message: 'Enquiry sent successfully!' });
});

// ============================================================
// HTML ROUTES
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
        console.log('📦 API: http://localhost:' + PORT + '/api/products');
    });
}

// ============================================================
// SETUP DATABASE TABLES
// ============================================================

app.get('/api/setup-orders', async (req, res) => {
    try {
        const { neon } = require('@neondatabase/serverless');
        const sql = neon(process.env.DATABASE__UNPOOLED);
        
        // Create orders table
        await sql`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                order_number TEXT UNIQUE NOT NULL,
                customer_name TEXT NOT NULL,
                customer_email TEXT,
                customer_phone TEXT NOT NULL,
                delivery_address TEXT,
                delivery_city TEXT,
                delivery_notes TEXT,
                items JSONB,
                subtotal DECIMAL(10,2),
                delivery_fee DECIMAL(10,2),
                total DECIMAL(10,2),
                status TEXT DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `;
        
        // Create order_items table for detailed tracking
        await sql`
            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES orders(id),
                product_name TEXT,
                product_price DECIMAL(10,2),
                quantity INTEGER,
                total DECIMAL(10,2)
            );
        `;
        
        res.json({ 
            success: true, 
            message: 'Orders tables created successfully!',
            tables: ['orders', 'order_items']
        });
    } catch (error) {
        console.error('Table creation error:', error);
        res.status(500).json({ error: error.message });
    }
});
