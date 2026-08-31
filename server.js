// Catch all unhandled errors and log them
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});
// ============================================================
// LORRAINE BUSINESS PLATFORM - BACKEND
// Node.js + Express + SQLite
// ============================================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'lorraine_secret_key_2026';
const SALT_ROUNDS = 10;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// ============================================================
// DATABASE SETUP
// ============================================================
const db = new sqlite3.Database('/tmp/lorraine.db', (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to SQLite database');
        initDatabase();
    }
});

function initDatabase() {
    db.serialize(() => {
        // Users table (customers + admins)
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                full_name TEXT NOT NULL,
                phone TEXT,
                address TEXT,
                city TEXT,
                postal_code TEXT,
                country TEXT DEFAULT 'Kenya',
                role TEXT DEFAULT 'customer',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Products table
        db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                category TEXT NOT NULL,
                short_description TEXT,
                long_description TEXT,
                price REAL NOT NULL,
                compare_price REAL,
                cost_price REAL,
                sku TEXT,
                barcode TEXT,
                stock_quantity INTEGER DEFAULT 0,
                low_stock_threshold INTEGER DEFAULT 5,
                available BOOLEAN DEFAULT 1,
                featured BOOLEAN DEFAULT 0,
                image_url TEXT,
                images TEXT,
                specifications TEXT,
                weight REAL,
                dimensions TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Categories table
        db.run(`
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                description TEXT,
                parent_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Orders table
        db.run(`
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_number TEXT UNIQUE NOT NULL,
                user_id INTEGER,
                customer_name TEXT NOT NULL,
                customer_email TEXT NOT NULL,
                customer_phone TEXT NOT NULL,
                delivery_address TEXT NOT NULL,
                delivery_city TEXT,
                delivery_notes TEXT,
                subtotal REAL NOT NULL,
                delivery_fee REAL DEFAULT 0,
                total REAL NOT NULL,
                status TEXT DEFAULT 'Pending',
                payment_method TEXT,
                payment_status TEXT DEFAULT 'Pending',
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Order Items table
        db.run(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                product_name TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                total REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        `);

        // Order Status History
        db.run(`
            CREATE TABLE IF NOT EXISTS order_status_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                status TEXT NOT NULL,
                note TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            )
        `);

        // Services table (Lorraine Enterprise)
        db.run(`
            CREATE TABLE IF NOT EXISTS services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                category TEXT NOT NULL,
                short_description TEXT,
                long_description TEXT,
                benefits TEXT,
                pricing_type TEXT DEFAULT 'quote',
                price REAL,
                image_url TEXT,
                featured BOOLEAN DEFAULT 0,
                available BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Service Enquiries
        db.run(`
            CREATE TABLE IF NOT EXISTS service_enquiries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service_id INTEGER,
                customer_name TEXT NOT NULL,
                customer_email TEXT NOT NULL,
                customer_phone TEXT NOT NULL,
                message TEXT,
                status TEXT DEFAULT 'New',
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (service_id) REFERENCES services(id)
            )
        `);

        // Website Analytics
        db.run(`
            CREATE TABLE IF NOT EXISTS analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                page_url TEXT NOT NULL,
                referrer TEXT,
                user_agent TEXT,
                ip_address TEXT,
                session_id TEXT,
                visitor_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Notifications
        db.run(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                link TEXT,
                read BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Settings
        db.run(`
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create default admin if not exists
        db.get('SELECT * FROM users WHERE email = ?', ['admin@lorraine.com'], (err, row) => {
            if (!row) {
                const hashedPassword = bcrypt.hashSync('Admin@2026', SALT_ROUNDS);
                db.run(
                    `INSERT INTO users (email, password, full_name, phone, role) VALUES (?, ?, ?, ?, ?)`,
                    ['admin@lorraine.com', hashedPassword, 'System Administrator', '+254794066681', 'admin']
                );
                console.log('Default admin created: admin@lorraine.com / Admin@2026');
            }
        });

        // Add sample categories if empty
        db.get('SELECT COUNT(*) as count FROM categories', (err, row) => {
            if (row.count === 0) {
                const categories = [
                    ['Laptops', 'laptops', 'Premium laptops from top brands'],
                    ['Desktops', 'desktops', 'Powerful desktop computers'],
                    ['Accessories', 'accessories', 'Computer accessories and peripherals'],
                    ['Repairs', 'repairs', 'Professional repair services']
                ];
                categories.forEach(cat => {
                    db.run(`INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)`, cat);
                });
                console.log('Sample categories created');
            }
        });

        // Add sample products if empty
        db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
            if (row.count === 0) {
                const products = [
                    ['Dell Latitude 7400', 'dell-latitude-7400', 'laptops', 'Core i7, 16GB RAM, 512GB SSD, ex-UK', 'Premium business laptop. Grade A ex-UK stock with charger.', 45000, 10, 1, 1, '💻'],
                    ['HP EliteBook 840 G6', 'hp-elitebook-840-g6', 'laptops', 'Core i5, 8GB RAM, 256GB SSD, ex-USA', 'Reliable, sleek, and lightweight. Perfect for professionals.', 38000, 8, 1, 1, '💻'],
                    ['Lenovo ThinkCentre M720', 'lenovo-thinkcentre-m720', 'desktops', 'Core i5, 16GB RAM, 1TB HDD', 'Compact desktop tower ideal for office use.', 32000, 5, 1, 0, '🖥️'],
                    ['Samsung 1TB SSD', 'samsung-1tb-ssd', 'accessories', 'Portable SSD, USB 3.2, 1TB', 'Fast and reliable external storage.', 12000, 15, 1, 1, '💾'],
                    ['Kingston 16GB RAM', 'kingston-16gb-ram', 'accessories', 'DDR4 3200MHz laptop memory', 'Upgrade your laptop performance with high-quality RAM.', 6500, 20, 1, 0, '🧠']
                ];
                products.forEach(p => {
                    db.run(
                        `INSERT INTO products (name, slug, category, short_description, long_description, price, stock_quantity, available, featured, image_url) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        p
                    );
                });
                console.log('Sample products created');
            }
        });

        // Add sample services if empty
        db.get('SELECT COUNT(*) as count FROM services', (err, row) => {
            if (row.count === 0) {
                const services = [
                    ['Digital Marketing', 'digital-marketing', 'marketing', 'SEO, ads, and online strategy', 'Full-service digital marketing to grow your online presence and drive sales.', 'quote', null, '📈', 1],
                    ['Social Media Management', 'social-media-management', 'marketing', 'Content, posting, and engagement', 'We manage your social media to build a professional, active brand presence.', 'quote', null, '📱', 1],
                    ['Branding & Identity', 'branding-identity', 'branding', 'Logo, visual identity, positioning', 'Distinctive brand identity that communicates who you are and what you stand for.', 'quote', null, '🎯', 1],
                    ['Content Creation', 'content-creation', 'content', 'Copywriting, blogs, social content', 'Engaging content designed to attract attention and communicate clearly.', 'quote', null, '✍️', 1],
                    ['Graphic Design', 'graphic-design', 'design', 'Logos, marketing materials, graphics', 'Professional visual communication for your brand.', 'quote', null, '🎨', 1],
                    ['Business Solutions', 'business-solutions', 'solutions', 'Strategic digital & creative solutions', 'Practical solutions to help you operate, communicate, and grow effectively.', 'quote', null, '💼', 1]
                ];
                services.forEach(s => {
                    db.run(
                        `INSERT INTO services (name, slug, category, short_description, long_description, pricing_type, price, image_url, available) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        s
                    );
                });
                console.log('Sample services created');
            }
        });

        // Add default settings
        db.get('SELECT COUNT(*) as count FROM settings', (err, row) => {
            if (row.count === 0) {
                const settings = [
                    ['business_name', 'Lorraine'],
                    ['business_phone', '+254 794 066 681'],
                    ['business_whatsapp', '+254794066681'],
                    ['business_email', 'lorraine1ventures@gmail.com'],
                    ['business_email_alt', 'lorraineenterprise1@gmail.com'],
                    ['business_description', 'Electronics & enterprise solutions for modern businesses and individuals.'],
                    ['currency', 'KSh'],
                    ['currency_symbol', 'KSh'],
                    ['delivery_fee', '0'],
                    ['facebook_url', 'https://web.facebook.com/Loreltronix'],
                    ['instagram_url', 'https://www.instagram.com/loreltronix_tech'],
                    ['whatsapp_url', 'https://wa.me/254794066681']
                ];
                settings.forEach(s => {
                    db.run(`INSERT INTO settings (key, value) VALUES (?, ?)`, s);
                });
                console.log('Default settings created');
            }
        });
    });
}

// ============================================================
// MIDDLEWARE - AUTH
// ============================================================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }
        req.user = user;
        next();
    });
}

function isAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required.' });
    }
}

// ============================================================
// AUTH ROUTES
// ============================================================
// Register
app.post('/api/auth/register', async (req, res) => {
    const { email, password, full_name, phone, address, city, postal_code } = req.body;

    if (!email || !password || !full_name) {
        return res.status(400).json({ error: 'Email, password, and full name are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        db.run(
            `INSERT INTO users (email, password, full_name, phone, address, city, postal_code, role) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'customer')`,
            [email, hashedPassword, full_name, phone || '', address || '', city || '', postal_code || ''],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: 'Email already registered.' });
                    }
                    return res.status(500).json({ error: 'Registration failed.' });
                }

                const token = jwt.sign(
                    { id: this.lastID, email, role: 'customer' },
                    JWT_SECRET,
                    { expiresIn: '7d' }
                );

                res.status(201).json({
                    success: true,
                    token,
                    user: { id: this.lastID, email, full_name, role: 'customer' }
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Registration failed.' });
    }
});

// Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                phone: user.phone,
                address: user.address,
                city: user.city,
                postal_code: user.postal_code,
                role: user.role
            }
        });
    });
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
    db.get(
        'SELECT id, email, full_name, phone, address, city, postal_code, country, role, created_at FROM users WHERE id = ?',
        [req.user.id],
        (err, user) => {
            if (err || !user) {
                return res.status(404).json({ error: 'User not found.' });
            }
            res.json(user);
        }
    );
});

// Update user profile
app.put('/api/auth/me', authenticateToken, (req, res) => {
    const { full_name, phone, address, city, postal_code, country } = req.body;

    db.run(
        `UPDATE users SET full_name = ?, phone = ?, address = ?, city = ?, postal_code = ?, country = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [full_name, phone, address, city, postal_code, country, req.user.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Update failed.' });
            }
            res.json({ success: true, message: 'Profile updated successfully.' });
        }
    );
});

// Change password
app.put('/api/auth/password', authenticateToken, async (req, res) => {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
        return res.status(400).json({ error: 'Current and new password are required.' });
    }

    db.get('SELECT password FROM users WHERE id = ?', [req.user.id], async (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const valid = await bcrypt.compare(current_password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Current password is incorrect.' });
        }

        const hashedPassword = await bcrypt.hash(new_password, SALT_ROUNDS);
        db.run(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedPassword, req.user.id],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Password update failed.' });
                }
                res.json({ success: true, message: 'Password changed successfully.' });
            }
        );
    });
});

// ============================================================
// PRODUCT ROUTES
// ============================================================
// Get all products
app.get('/api/products', (req, res) => {
    const { category, search, sort, limit, featured } = req.query;

    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
        sql += ' AND category = ?';
        params.push(category);
    }

    if (search) {
        sql += ' AND (name LIKE ? OR short_description LIKE ? OR long_description LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    if (featured === 'true') {
        sql += ' AND featured = 1';
    }

    sql += ' AND available = 1';

    if (sort === 'price-asc') {
        sql += ' ORDER BY price ASC';
    } else if (sort === 'price-desc') {
        sql += ' ORDER BY price DESC';
    } else if (sort === 'name-asc') {
        sql += ' ORDER BY name ASC';
    } else {
        sql += ' ORDER BY created_at DESC';
    }

    if (limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(limit));
    }

    db.all(sql, params, (err, products) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch products.' });
        }
        res.json(products);
    });
});

// Get single product
app.get('/api/products/:id', (req, res) => {
    db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, product) => {
        if (err || !product) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        res.json(product);
    });
});

// Get product by slug
app.get('/api/products/slug/:slug', (req, res) => {
    db.get('SELECT * FROM products WHERE slug = ?', [req.params.slug], (err, product) => {
        if (err || !product) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        res.json(product);
    });
});

// Get product categories
app.get('/api/categories', (req, res) => {
    db.all('SELECT * FROM categories ORDER BY name', (err, categories) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch categories.' });
        }
        res.json(categories);
    });
});

// ============================================================
// ADMIN PRODUCT ROUTES
// ============================================================
// Add product
app.post('/api/admin/products', authenticateToken, isAdmin, (req, res) => {
    const {
        name, slug, category, short_description, long_description,
        price, compare_price, cost_price, sku, barcode,
        stock_quantity, low_stock_threshold, available, featured,
        image_url, images, specifications, weight, dimensions
    } = req.body;

    if (!name || !slug || !category || price === undefined) {
        return res.status(400).json({ error: 'Name, slug, category, and price are required.' });
    }

    db.run(
        `INSERT INTO products (
            name, slug, category, short_description, long_description,
            price, compare_price, cost_price, sku, barcode,
            stock_quantity, low_stock_threshold, available, featured,
            image_url, images, specifications, weight, dimensions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            name, slug, category, short_description || '', long_description || '',
            price, compare_price || null, cost_price || null, sku || '', barcode || '',
            stock_quantity || 0, low_stock_threshold || 5, available !== undefined ? available : 1,
            featured || 0, image_url || '', images || '', specifications || '',
            weight || null, dimensions || ''
        ],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Product slug already exists.' });
                }
                return res.status(500).json({ error: 'Failed to create product.' });
            }
            res.status(201).json({ success: true, id: this.lastID, message: 'Product created successfully.' });
        }
    );
});

// Update product
app.put('/api/admin/products/:id', authenticateToken, isAdmin, (req, res) => {
    const {
        name, slug, category, short_description, long_description,
        price, compare_price, cost_price, sku, barcode,
        stock_quantity, low_stock_threshold, available, featured,
        image_url, images, specifications, weight, dimensions
    } = req.body;

    db.run(
        `UPDATE products SET
            name = ?, slug = ?, category = ?, short_description = ?, long_description = ?,
            price = ?, compare_price = ?, cost_price = ?, sku = ?, barcode = ?,
            stock_quantity = ?, low_stock_threshold = ?, available = ?, featured = ?,
            image_url = ?, images = ?, specifications = ?, weight = ?, dimensions = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
            name, slug, category, short_description || '', long_description || '',
            price, compare_price || null, cost_price || null, sku || '', barcode || '',
            stock_quantity || 0, low_stock_threshold || 5, available !== undefined ? available : 1,
            featured || 0, image_url || '', images || '', specifications || '',
            weight || null, dimensions || '', req.params.id
        ],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update product.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Product not found.' });
            }
            res.json({ success: true, message: 'Product updated successfully.' });
        }
    );
});

// Delete product
app.delete('/api/admin/products/:id', authenticateToken, isAdmin, (req, res) => {
    db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete product.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        res.json({ success: true, message: 'Product deleted successfully.' });
    });
});

// Update product stock
app.patch('/api/admin/products/:id/stock', authenticateToken, isAdmin, (req, res) => {
    const { stock_quantity, available } = req.body;

    db.run(
        'UPDATE products SET stock_quantity = ?, available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [stock_quantity, available !== undefined ? available : 1, req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update stock.' });
            }
            res.json({ success: true, message: 'Stock updated successfully.' });
        }
    );
});

// ============================================================
// ORDER ROUTES (Updated - Allows Guest Checkout)
// ============================================================
// Create order - NOW ALLOWS GUESTS (no authentication required)
app.post('/api/orders', (req, res) => {
    const {
        customer_name, customer_email, customer_phone,
        delivery_address, delivery_city, delivery_notes,
        items, subtotal, delivery_fee, total, notes
    } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'No items in order.' });
    }

    // Generate order number
    const orderNumber = 'ORD-' + Date.now().toString().slice(-8) + '-' + Math.random().toString(36).slice(-4).toUpperCase();

    // Get user ID if logged in, otherwise null
    const userId = req.user ? req.user.id : null;

    db.run(
        `INSERT INTO orders (
            order_number, user_id, customer_name, customer_email, customer_phone,
            delivery_address, delivery_city, delivery_notes,
            subtotal, delivery_fee, total, notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            orderNumber, userId, customer_name, customer_email, customer_phone,
            delivery_address, delivery_city || '', delivery_notes || '',
            subtotal, delivery_fee || 0, total, notes || '', 'Pending'
        ],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to create order.' });
            }

            const orderId = this.lastID;

            // Insert order items
            const stmt = db.prepare(
                `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?)`
            );

            items.forEach(item => {
                stmt.run(orderId, item.product_id, item.product_name, item.quantity, item.price, item.total);
            });

            stmt.finalize();

            // Add status history
            db.run(
                `INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)`,
                [orderId, 'Pending', 'Order placed']
            );

            // Create notification for admin
            db.run(
                `INSERT INTO notifications (type, title, message, link) VALUES (?, ?, ?, ?)`,
                ['new_order', 'New Order Received', `Order #${orderNumber} has been placed.`, `/admin/orders/${orderId}`]
            );

            res.status(201).json({
                success: true,
                order_id: orderId,
                order_number: orderNumber,
                message: 'Order placed successfully.'
            });
        }
    );
});

// Get user orders (requires authentication)
app.get('/api/orders', authenticateToken, (req, res) => {
    db.all(
        `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
        [req.user.id],
        (err, orders) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch orders.' });
            }
            res.json(orders);
        }
    );
});

// Get single order (requires authentication)
app.get('/api/orders/:id', authenticateToken, (req, res) => {
    db.get(
        'SELECT * FROM orders WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id],
        (err, order) => {
            if (err || !order) {
                return res.status(404).json({ error: 'Order not found.' });
            }

            // Get order items
            db.all(
                'SELECT * FROM order_items WHERE order_id = ?',
                [req.params.id],
                (err, items) => {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to fetch order items.' });
                    }

                    // Get status history
                    db.all(
                        'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at DESC',
                        [req.params.id],
                        (err, history) => {
                            if (err) {
                                return res.status(500).json({ error: 'Failed to fetch status history.' });
                            }
                            res.json({ ...order, items, history });
                        }
                    );
                }
            );
        }
    );
});

// Track order by number (public - no auth required)
app.get('/api/orders/track/:number', (req, res) => {
    db.get(
        'SELECT * FROM orders WHERE order_number = ?',
        [req.params.number],
        (err, order) => {
            if (err || !order) {
                return res.status(404).json({ error: 'Order not found.' });
            }

            db.all(
                'SELECT * FROM order_items WHERE order_id = ?',
                [order.id],
                (err, items) => {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to fetch order items.' });
                    }

                    db.all(
                        'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at DESC',
                        [order.id],
                        (err, history) => {
                            if (err) {
                                return res.status(500).json({ error: 'Failed to fetch status history.' });
                            }
                            res.json({ ...order, items, history });
                        }
                    );
                }
            );
        }
    );
});

// ============================================================
// ADMIN ORDER ROUTES
// ============================================================
// Get all orders (admin)
app.get('/api/admin/orders', authenticateToken, isAdmin, (req, res) => {
    const { status, search, limit } = req.query;

    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (status) {
        sql += ' AND status = ?';
        params.push(status);
    }

    if (search) {
        sql += ' AND (order_number LIKE ? OR customer_name LIKE ? OR customer_email LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term);
    }

    sql += ' ORDER BY created_at DESC';

    if (limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(limit));
    }

    db.all(sql, params, (err, orders) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch orders.' });
        }

        // Get item counts for each order
        const ordersWithCounts = orders.map(order => {
            return new Promise((resolve, reject) => {
                db.get(
                    'SELECT COUNT(*) as item_count, SUM(total) as total_sum FROM order_items WHERE order_id = ?',
                    [order.id],
                    (err, result) => {
                        if (err) reject(err);
                        resolve({ ...order, item_count: result ? result.item_count : 0 });
                    }
                );
            });
        });

        Promise.all(ordersWithCounts).then(results => {
            res.json(results);
        }).catch(() => {
            res.json(orders);
        });
    });
});

// Get single order (admin)
app.get('/api/admin/orders/:id', authenticateToken, isAdmin, (req, res) => {
    db.get('SELECT * FROM orders WHERE id = ?', [req.params.id], (err, order) => {
        if (err || !order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        db.all('SELECT * FROM order_items WHERE order_id = ?', [req.params.id], (err, items) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch order items.' });
            }

            db.all(
                'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at DESC',
                [req.params.id],
                (err, history) => {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to fetch status history.' });
                    }

                    // Get customer details
                    db.get(
                        'SELECT id, email, full_name, phone, address, city FROM users WHERE id = ?',
                        [order.user_id],
                        (err, customer) => {
                            res.json({ ...order, items, history, customer });
                        }
                    );
                }
            );
        });
    });
});

// Update order status (admin)
app.patch('/api/admin/orders/:id/status', authenticateToken, isAdmin, (req, res) => {
    const { status, note } = req.body;

    const validStatuses = ['Pending', 'Confirmed', 'Processing', 'Ready', 'Dispatched', 'Out for Delivery', 'Delivered',
        'Cancelled'
    ];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status.' });
    }

    db.run(
        'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update order status.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Order not found.' });
            }

            // Add status history
            db.run(
                `INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)`,
                [req.params.id, status, note || '']
            );

            res.json({ success: true, message: 'Order status updated successfully.' });
        }
    );
});

// ============================================================
// SERVICE ROUTES
// ============================================================
// Get all services
app.get('/api/services', (req, res) => {
    const { category, search, featured } = req.query;

    let sql = 'SELECT * FROM services WHERE available = 1';
    const params = [];

    if (category && category !== 'all') {
        sql += ' AND category = ?';
        params.push(category);
    }

    if (search) {
        sql += ' AND (name LIKE ? OR short_description LIKE ? OR long_description LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term);
    }

    if (featured === 'true') {
        sql += ' AND featured = 1';
    }

    sql += ' ORDER BY name ASC';

    db.all(sql, params, (err, services) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch services.' });
        }
        res.json(services);
    });
});

// Get single service
app.get('/api/services/:id', (req, res) => {
    db.get('SELECT * FROM services WHERE id = ?', [req.params.id], (err, service) => {
        if (err || !service) {
            return res.status(404).json({ error: 'Service not found.' });
        }
        res.json(service);
    });
});

// Create service enquiry
app.post('/api/service-enquiries', (req, res) => {
    const { service_id, customer_name, customer_email, customer_phone, message } = req.body;

    if (!customer_name || !customer_email || !customer_phone) {
        return res.status(400).json({ error: 'Name, email, and phone are required.' });
    }

    db.run(
        `INSERT INTO service_enquiries (service_id, customer_name, customer_email, customer_phone, message, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [service_id || null, customer_name, customer_email, customer_phone, message || '', 'New'],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to submit enquiry.' });
            }

            // Create notification for admin
            db.run(
                `INSERT INTO notifications (type, title, message, link) VALUES (?, ?, ?, ?)`,
                ['new_enquiry', 'New Service Enquiry', `Enquiry from ${customer_name} about ${service_id ? 'a service' : 'general inquiry'}.`, '/admin/enquiries']
            );

            res.status(201).json({
                success: true,
                id: this.lastID,
                message: 'Enquiry submitted successfully.'
            });
        }
    );
});

// ============================================================
// ADMIN SERVICE ENQUIRY ROUTES
// ============================================================
// Get all enquiries (admin)
app.get('/api/admin/enquiries', authenticateToken, isAdmin, (req, res) => {
    const { status, search } = req.query;

    let sql = `
        SELECT e.*, s.name as service_name 
        FROM service_enquiries e
        LEFT JOIN services s ON e.service_id = s.id
        WHERE 1=1
    `;
    const params = [];

    if (status) {
        sql += ' AND e.status = ?';
        params.push(status);
    }

    if (search) {
        sql += ' AND (e.customer_name LIKE ? OR e.customer_email LIKE ? OR e.customer_phone LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term);
    }

    sql += ' ORDER BY e.created_at DESC';

    db.all(sql, params, (err, enquiries) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch enquiries.' });
        }
        res.json(enquiries);
    });
});

// Update enquiry status (admin)
app.patch('/api/admin/enquiries/:id', authenticateToken, isAdmin, (req, res) => {
    const { status, notes } = req.body;

    const validStatuses = ['New', 'Contacted', 'In Discussion', 'Quoted', 'Approved', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status.' });
    }

    db.run(
        'UPDATE service_enquiries SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, notes || '', req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update enquiry.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Enquiry not found.' });
            }
            res.json({ success: true, message: 'Enquiry updated successfully.' });
        }
    );
});

// ============================================================
// ADMIN SERVICE MANAGEMENT
// ============================================================
// Add service (admin)
app.post('/api/admin/services', authenticateToken, isAdmin, (req, res) => {
    const {
        name, slug, category, short_description, long_description,
        benefits, pricing_type, price, image_url, available, featured
    } = req.body;

    if (!name || !slug || !category) {
        return res.status(400).json({ error: 'Name, slug, and category are required.' });
    }

    db.run(
        `INSERT INTO services (
            name, slug, category, short_description, long_description,
            benefits, pricing_type, price, image_url, available, featured
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            name, slug, category, short_description || '', long_description || '',
            benefits || '', pricing_type || 'quote', price || null,
            image_url || '', available !== undefined ? available : 1, featured || 0
        ],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Service slug already exists.' });
                }
                return res.status(500).json({ error: 'Failed to create service.' });
            }
            res.status(201).json({ success: true, id: this.lastID, message: 'Service created successfully.' });
        }
    );
});

// Update service (admin)
app.put('/api/admin/services/:id', authenticateToken, isAdmin, (req, res) => {
    const {
        name, slug, category, short_description, long_description,
        benefits, pricing_type, price, image_url, available, featured
    } = req.body;

    db.run(
        `UPDATE services SET
            name = ?, slug = ?, category = ?, short_description = ?, long_description = ?,
            benefits = ?, pricing_type = ?, price = ?, image_url = ?, available = ?, featured = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
            name, slug, category, short_description || '', long_description || '',
            benefits || '', pricing_type || 'quote', price || null,
            image_url || '', available !== undefined ? available : 1, featured || 0,
            req.params.id
        ],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update service.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Service not found.' });
            }
            res.json({ success: true, message: 'Service updated successfully.' });
        }
    );
});

// Delete service (admin)
app.delete('/api/admin/services/:id', authenticateToken, isAdmin, (req, res) => {
    db.run('DELETE FROM services WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete service.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Service not found.' });
        }
        res.json({ success: true, message: 'Service deleted successfully.' });
    });
});

// ============================================================
// ADMIN USER MANAGEMENT
// ============================================================
// Get all customers (admin)
app.get('/api/admin/users', authenticateToken, isAdmin, (req, res) => {
    const { search } = req.query;

    let sql = "SELECT id, email, full_name, phone, address, city, role, created_at FROM users WHERE role = 'customer'";
    const params = [];

    if (search) {
        sql += ' AND (email LIKE ? OR full_name LIKE ? OR phone LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term);
    }

    sql += ' ORDER BY created_at DESC';

    db.all(sql, params, (err, users) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch users.' });
        }

        // Get order counts for each user
        const usersWithOrders = users.map(user => {
            return new Promise((resolve, reject) => {
                db.get(
                    'SELECT COUNT(*) as order_count FROM orders WHERE user_id = ?',
                    [user.id],
                    (err, result) => {
                        if (err) reject(err);
                        resolve({ ...user, order_count: result ? result.order_count : 0 });
                    }
                );
            });
        });

        Promise.all(usersWithOrders).then(results => {
            res.json(results);
        }).catch(() => {
            res.json(users);
        });
    });
});

// ============================================================
// ANALYTICS ROUTES
// ============================================================
// Track page visit
app.post('/api/analytics/track', (req, res) => {
    const { page_url, referrer, user_agent, session_id, visitor_id } = req.body;

    const ip_address = req.ip || req.connection.remoteAddress || '';

    db.run(
        `INSERT INTO analytics (page_url, referrer, user_agent, ip_address, session_id, visitor_id) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [page_url || '/', referrer || '', user_agent || '', ip_address, session_id || '', visitor_id || '']
    );

    res.status(200).json({ success: true });
});

// Get analytics (admin)
app.get('/api/admin/analytics', authenticateToken, isAdmin, (req, res) => {
    const { period } = req.query;

    let dateFilter = '';
    if (period === 'today') {
        dateFilter = "DATE(created_at) = DATE('now')";
    } else if (period === 'week') {
        dateFilter = "created_at >= DATE('now', '-7 days')";
    } else if (period === 'month') {
        dateFilter = "created_at >= DATE('now', '-30 days')";
    } else {
        dateFilter = "1=1";
    }

    // Total visitors
    db.get(`SELECT COUNT(DISTINCT visitor_id) as total_visitors FROM analytics WHERE ${dateFilter}`, (err, total) => {
        // Unique visitors
        db.get(`SELECT COUNT(DISTINCT session_id) as unique_visitors FROM analytics WHERE ${dateFilter}`, (err,
            unique) => {
            // Page views
            db.get(`SELECT COUNT(*) as page_views FROM analytics WHERE ${dateFilter}`, (err, views) => {
                // Most visited pages
                db.all(
                    `SELECT page_url, COUNT(*) as views FROM analytics WHERE ${dateFilter} GROUP BY page_url ORDER BY views DESC LIMIT 10`,
                    (err, pages) => {
                        // Daily visitors trend
                        db.all(
                            `SELECT DATE(created_at) as date, COUNT(DISTINCT visitor_id) as visitors, COUNT(*) as views 
                             FROM analytics WHERE ${dateFilter} GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30`,
                            (err, trend) => {
                                res.json({
                                    total_visitors: total ? total.total_visitors : 0,
                                    unique_visitors: unique ? unique.unique_visitors : 0,
                                    page_views: views ? views.page_views : 0,
                                    top_pages: pages || [],
                                    daily_trend: trend || []
                                });
                            }
                        );
                    }
                );
            });
        });
    });
});

// Get admin dashboard stats
app.get('/api/admin/dashboard', authenticateToken, isAdmin, (req, res) => {
    const stats = {};

    // Total products
    db.get('SELECT COUNT(*) as total FROM products', (err, result) => {
        stats.total_products = result ? result.total : 0;

        // Products in stock
        db.get('SELECT COUNT(*) as in_stock FROM products WHERE stock_quantity > 0', (err, result) => {
            stats.products_in_stock = result ? result.in_stock : 0;

            // Low stock
            db.get('SELECT COUNT(*) as low_stock FROM products WHERE stock_quantity > 0 AND stock_quantity <= low_stock_threshold',
                (err, result) => {
                    stats.low_stock_products = result ? result.low_stock : 0;

                    // Orders by status
                    db.all('SELECT status, COUNT(*) as count FROM orders GROUP BY status', (err, results) => {
                        stats.orders_by_status = results || [];

                        // Total orders
                        db.get('SELECT COUNT(*) as total FROM orders', (err, result) => {
                            stats.total_orders = result ? result.total : 0;

                            // Total revenue
                            db.get('SELECT SUM(total) as revenue FROM orders WHERE status = "Delivered" OR status = "Completed"',
                                (err, result) => {
                                    stats.total_revenue = result ? result.revenue : 0;

                                    // Recent orders
                                    db.all(
                                        `SELECT * FROM orders ORDER BY created_at DESC LIMIT 10`,
                                        (err, recentOrders) => {
                                            stats.recent_orders = recentOrders || [];

                                            // Recent customers
                                            db.all(
                                                `SELECT id, email, full_name, phone, created_at FROM users WHERE role = 'customer' ORDER BY created_at DESC LIMIT 10`,
                                                (err, recentCustomers) => {
                                                    stats.recent_customers =
                                                    recentCustomers || [];

                                                    // Recent enquiries
                                                    db.all(
                                                        `SELECT e.*, s.name as service_name FROM service_enquiries e LEFT JOIN services s ON e.service_id = s.id ORDER BY e.created_at DESC LIMIT 10`,
                                                        (err, recentEnquiries) => {
                                                            stats.recent_enquiries =
                                                                recentEnquiries || [];

                                                            // Total visitors today
                                                            db.get(
                                                                `SELECT COUNT(DISTINCT visitor_id) as today_visitors FROM analytics WHERE DATE(created_at) = DATE('now')`,
                                                                (err, result) => {
                                                                    stats.visitors_today =
                                                                        result ? result
                                                                        .today_visitors :
                                                                        0;
                                                                    res.json(stats);
                                                                }
                                                            );
                                                        }
                                                    );
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        });
                    });
                }
            );
        });
    });
});

// ============================================================
// SETTINGS ROUTES
// ============================================================
// Get all settings
app.get('/api/settings', (req, res) => {
    db.all('SELECT * FROM settings', (err, settings) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch settings.' });
        }
        const settingsObj = {};
        settings.forEach(s => {
            settingsObj[s.key] = s.value;
        });
        res.json(settingsObj);
    });
});

// Update settings (admin)
app.put('/api/admin/settings', authenticateToken, isAdmin, (req, res) => {
    const settings = req.body;

    const queries = Object.keys(settings).map(key => {
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) 
                 ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
                [key, settings[key], settings[key]],
                function(err) {
                    if (err) reject(err);
                    resolve();
                }
            );
        });
    });

    Promise.all(queries).then(() => {
        res.json({ success: true, message: 'Settings updated successfully.' });
    }).catch(() => {
        res.status(500).json({ error: 'Failed to update settings.' });
    });
});

// ============================================================
// NOTIFICATIONS ROUTES
// ============================================================
// Get notifications (admin)
app.get('/api/admin/notifications', authenticateToken, isAdmin, (req, res) => {
    db.all(
        'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50',
        (err, notifications) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch notifications.' });
            }
            res.json(notifications);
        }
    );
});

// Mark notification as read
app.patch('/api/admin/notifications/:id/read', authenticateToken, isAdmin, (req, res) => {
    db.run(
        'UPDATE notifications SET read = 1 WHERE id = ?',
        [req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update notification.' });
            }
            res.json({ success: true });
        }
    );
});

// ============================================================
// WHATSAPP HELPER
// ============================================================
app.get('/api/whatsapp-link', (req, res) => {
    const { message } = req.query;
    const phone = '254794066681';
    let url = `https://wa.me/${phone}`;
    if (message) {
        url += `?text=${encodeURIComponent(message)}`;
    }
    res.json({ url });
});

// ============================================================
// START SERVER
// ============================================================

// Export for Vercel
module.exports = app;

// Only listen locally when not on Vercel
if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 5000;
}

// Export for Vercel
module.exports = app;

// Only listen locally when not on Vercel
if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log("🚀 Lorraine Business Platform running on http://localhost:5000");
        console.log("📧 Admin: admin@lorraine.com");
        console.log("🔑 Password: Admin@2026");
        console.log("🛒 Guest checkout is now ENABLED!");
    });
}
