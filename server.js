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
try {
    const connectionString = process.env.DATABASE__UNPOOLED || process.env.DATABASE_URL;
    if (connectionString) {
        sql = neon(connectionString);
        console.log('✅ Database connected');
    } else {
        console.log('⚠️ No database connection string found');
    }
} catch (error) {
    console.error('❌ Database error:', error.message);
}

// ============================================================
// API ROUTES
// ============================================================

// Products
app.get('/api/products', (req, res) => {
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
    res.json([
        { id: 101, name: 'Digital Marketing', price: 'Custom Quote', category: 'marketing', available: true },
        { id: 102, name: 'Branding Services', price: 'Custom Quote', category: 'branding', available: true },
        { id: 103, name: 'Web Development', price: 'Custom Quote', category: 'solutions', available: true }
    ]);
});

// ============================================================
// AUTH
// ============================================================

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    console.log('�� Login attempt:', email);
    
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
// ORDERS (with Database)
// ============================================================

app.post('/api/orders', async (req, res) => {
    try {
        const { 
            customer_name, 
            customer_email, 
            customer_phone, 
            delivery_address, 
            delivery_city, 
            delivery_notes,
            items,
            subtotal,
            delivery_fee,
            total
        } = req.body;
        
        console.log('📦 New order from:', customer_name);
        
        if (!sql) {
            // Fallback to in-memory if no database
            const order = {
                order_number: 'ORD-' + Date.now(),
                customer_name: customer_name || 'Guest',
                customer_email: customer_email || '',
                customer_phone: customer_phone || '',
                delivery_address: delivery_address || '',
                items: items || [],
                total: total || 0,
                status: 'Pending'
            };
            return res.json(order);
        }
        
        // Generate order number
        const orderNumber = 'ORD-' + Date.now();
        
        // Insert order into database
        await sql`
            INSERT INTO orders (
                order_number,
                customer_name,
                customer_email,
                customer_phone,
                delivery_address,
                delivery_city,
                delivery_notes,
                items,
                subtotal,
                delivery_fee,
                total,
                status
            ) VALUES (
                ${orderNumber},
                ${customer_name || 'Guest'},
                ${customer_email || ''},
                ${customer_phone || ''},
                ${delivery_address || ''},
                ${delivery_city || ''},
                ${delivery_notes || ''},
                ${JSON.stringify(items || [])}::jsonb,
                ${subtotal || 0},
                ${delivery_fee || 0},
                ${total || 0},
                'Pending'
            );
        `;
        
        res.json({
            success: true,
            order_number: orderNumber,
            status: 'Pending',
            customer_name,
            customer_email,
            total: total || 0
        });
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ 
            error: 'Failed to place order',
            details: error.message 
        });
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        if (!sql) {
            return res.json([]);
        }
        
        const orders = await sql`
            SELECT * FROM orders 
            ORDER BY created_at DESC 
            LIMIT 100;
        `;
        
        res.json(orders || []);
    } catch (error) {
        console.error('Orders fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// ============================================================
// ADMIN
// ============================================================

app.get('/api/admin/dashboard', async (req, res) => {
    try {
        if (!sql) {
            return res.json({
                total_products: 6,
                products_in_stock: 6,
                low_stock_products: 0,
                total_orders: 0,
                visitors_today: 42,
                total_revenue: 0,
                recent_orders: []
            });
        }
        
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

app.get('/api/admin/orders', async (req, res) => {
    try {
        if (!sql) {
            return res.json([]);
        }
        
        const orders = await sql`
            SELECT * FROM orders 
            ORDER BY created_at DESC;
        `;
        res.json(orders || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

app.get('/api/admin/products', (req, res) => {
    res.json([
        { id: 1, name: 'Premium Laptop', price: 45000, category: 'laptops', available: true },
        { id: 2, name: 'Gaming Desktop', price: 85000, category: 'desktops', available: true },
        { id: 3, name: 'Wireless Headset', price: 3500, category: 'accessories', available: true }
    ]);
});

app.get('/api/admin/users', (req, res) => {
    res.json([]);
});

app.get('/api/admin/enquiries', (req, res) => {
    res.json([]);
});

// ============================================================
// SETUP DATABASE TABLES
// ============================================================

app.get('/api/setup', async (req, res) => {
    try {
        if (!sql) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        
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
        
        res.json({ 
            success: true, 
            message: '✅ Orders table created successfully!',
            tables: ['orders']
        });
    } catch (error) {
        console.error('Table creation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// TEST
// ============================================================

app.get('/api/test', (req, res) => {
    res.json({ message: '✅ API is working!', timestamp: new Date().toISOString() });
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
    });
}

// ============================================================
// ORDER MANAGEMENT
// ============================================================

// Update order status
app.put('/api/admin/orders/:orderId/status', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, note } = req.body;
        
        if (!sql) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        
        // Update the order status
        await sql`
            UPDATE orders 
            SET 
                status = ${status || 'Pending'},
                updated_at = NOW()
            WHERE id = ${parseInt(orderId)}
        `;
        
        // Get the updated order
        const updatedOrder = await sql`
            SELECT * FROM orders WHERE id = ${parseInt(orderId)}
        `;
        
        res.json({
            success: true,
            message: `Order status updated to ${status}`,
            order: updatedOrder[0] || null
        });
    } catch (error) {
        console.error('Status update error:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// Get order details
app.get('/api/admin/orders/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        if (!sql) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        
        const order = await sql`
            SELECT * FROM orders WHERE id = ${parseInt(orderId)}
        `;
        
        if (order && order.length > 0) {
            res.json(order[0]);
        } else {
            res.status(404).json({ error: 'Order not found' });
        }
    } catch (error) {
        console.error('Order fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// ============================================================
// TRACK ORDER - Customer Facing
// ============================================================

app.get('/api/orders/track/:orderNumber', async (req, res) => {
    try {
        if (!sql) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        
        const { orderNumber } = req.params;
        console.log('🔍 Customer tracking order:', orderNumber);
        
        const orders = await sql`
            SELECT 
                order_number,
                customer_name,
                customer_email,
                customer_phone,
                delivery_address,
                delivery_city,
                items,
                total,
                status,
                created_at
            FROM orders 
            WHERE order_number = ${orderNumber}
            LIMIT 1;
        `;
        
        if (orders && orders.length > 0) {
            res.json(orders[0]);
        } else {
            res.status(404).json({ error: 'Order not found. Please check the order number.' });
        }
    } catch (error) {
        console.error('Track order error:', error);
        res.status(500).json({ error: 'Failed to track order' });
    }
});
