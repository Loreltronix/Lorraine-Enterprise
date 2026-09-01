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
// API ROUTES - MUST COME FIRST!
// ============================================================

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: '✅ API is working!', timestamp: new Date().toISOString() });
});

// Setup products table
app.get('/api/setup-products', async (req, res) => {
    try {
        if (!sql) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        
        await sql`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                sale_price DECIMAL(10,2),
                description TEXT,
                features TEXT,
                specifications TEXT,
                category TEXT NOT NULL,
                stock_quantity INTEGER DEFAULT 0,
                available BOOLEAN DEFAULT true,
                main_image TEXT,
                images TEXT[],
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `;
        
        res.json({ 
            success: true, 
            message: '✅ Products table created successfully!'
        });
    } catch (error) {
        console.error('Table creation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Products
app.get('/api/products', async (req, res) => {
    try {
        if (!sql) {
            return res.json([]);
        }
        
        const { category, search, sort, featured, limit } = req.query;
        let query = sql`SELECT * FROM products WHERE 1=1`;
        
        if (category && category !== 'all') {
            query = sql`${query} AND category = ${category}`;
        }
        if (search) {
            query = sql`${query} AND name ILIKE ${'%' + search + '%'}`;
        }
        if (sort === 'price-asc') {
            query = sql`${query} ORDER BY price ASC`;
        } else if (sort === 'price-desc') {
            query = sql`${query} ORDER BY price DESC`;
        } else {
            query = sql`${query} ORDER BY created_at DESC`;
        }
        if (limit) {
            query = sql`${query} LIMIT ${parseInt(limit)}`;
        }
        
        const products = await query;
        res.json(products || []);
    } catch (error) {
        console.error('Products fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        if (!sql) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        
        const { id } = req.params;
        console.log('🔍 Fetching product ID:', id);
        
        const products = await sql`
            SELECT * FROM products WHERE id = ${parseInt(id)}
        `;
        
        if (products && products.length > 0) {
            console.log('✅ Product found:', products[0].name);
            res.json(products[0]);
        } else {
            console.log('❌ Product not found:', id);
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (error) {
        console.error('Product fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
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

// Admin - Products
app.post('/api/admin/products', async (req, res) => {
    console.log('📦 Adding new product...');
    try {
        if (!sql) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        
        const { 
            name, category, price, sale_price, description, 
            features, specifications, stock_quantity, available,
            main_image
        } = req.body;
        
        console.log('Product data:', { name, category, price });
        
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        const result = await sql`
            INSERT INTO products (
                name, slug, category, price, sale_price, 
                description, features, specifications, 
                stock_quantity, available, main_image
            ) VALUES (
                ${name}, ${slug}, ${category}, ${price}, ${sale_price || null},
                ${description || ''}, ${features || ''}, ${specifications || ''},
                ${stock_quantity || 0}, ${available !== false}, ${main_image || ''}
            )
            RETURNING *;
        `;
        
        console.log('✅ Product added:', result[0].id);
        res.json({ 
            success: true, 
            message: 'Product added successfully!',
            product: result[0]
        });
    } catch (error) {
        console.error('Add product error:', error);
        res.status(500).json({ 
            error: 'Failed to add product', 
            details: error.message 
        });
    }
});

app.put('/api/admin/products/:id', async (req, res) => {
    try {
        if (!sql) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        
        const { id } = req.params;
        const { 
            name, category, price, sale_price, description, 
            features, specifications, stock_quantity, available,
            main_image
        } = req.body;
        
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        const result = await sql`
            UPDATE products SET
                name = ${name},
                slug = ${slug},
                category = ${category},
                price = ${price},
                sale_price = ${sale_price || null},
                description = ${description || ''},
                features = ${features || ''},
                specifications = ${specifications || ''},
                stock_quantity = ${stock_quantity || 0},
                available = ${available !== false},
                main_image = ${main_image || ''},
                updated_at = NOW()
            WHERE id = ${parseInt(id)}
            RETURNING *;
        `;
        
        if (result && result.length > 0) {
            res.json({ 
                success: true, 
                message: 'Product updated successfully!',
                product: result[0]
            });
        } else {
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

app.delete('/api/admin/products/:id', async (req, res) => {
    try {
        if (!sql) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        
        const { id } = req.params;
        await sql`
            DELETE FROM products WHERE id = ${parseInt(id)}
        `;
        
        res.json({ 
            success: true, 
            message: 'Product deleted successfully!'
        });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// Admin - Dashboard
app.get('/api/admin/dashboard', async (req, res) => {
    try {
        if (!sql) {
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
            total_products: parseInt(totalProducts),
            products_in_stock: parseInt(totalProducts),
            low_stock_products: 0,
            total_orders: 0,
            visitors_today: 42,
            total_revenue: 0,
            recent_orders: []
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to load dashboard' });
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
