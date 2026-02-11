const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

// ===== DATABASE CONNECTION =====
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'signup'
});

db.connect(err => {
    if (err) console.error('DB Connection Failed:', err);
    else console.log('MySQL Connected');
});

/* =====================================================
   ADMIN SIGNUP & LOGIN
===================================================== */
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ message: 'All fields required' });

    try {
        const hashed = await bcrypt.hash(password, 10);
        db.query(
            "INSERT INTO login (name, email, password) VALUES (?, ?, ?)",
            [name, email, hashed],
            (err) => {
                if (err) return res.status(500).json({ message: 'Signup failed' });
                res.json({ message: 'Signup successful' });
            }
        );
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.query("SELECT * FROM login WHERE email = ?", [email], async (err, result) => {
        if (err || result.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
        const admin = result[0];
        const match = await bcrypt.compare(password, admin.password);
        if (!match) return res.status(401).json({ message: 'Invalid credentials' });
        res.json({ message: 'Login successful', admin });
    });
});

/* =====================================================
   CUSTOMER REGISTER & LOGIN
===================================================== */
app.post('/customers/register', async (req, res) => {
    const { full_name, email, password } = req.body;
    if (!full_name || !email || !password) return res.status(400).json({ message: 'All fields required' });
    try {
        const hashed = await bcrypt.hash(password, 10);
        db.query(
            "INSERT INTO customers (full_name, email, password) VALUES (?, ?, ?)",
            [full_name, email, hashed],
            (err) => {
                if (err) return res.status(500).json({ message: 'Register failed' });
                res.json({ message: 'Customer registered' });
            }
        );
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/customers/login', (req, res) => {
    const { email, password } = req.body;
    db.query("SELECT * FROM customers WHERE email = ?", [email], async (err, result) => {
        if (err || result.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
        const user = result[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid credentials' });
        res.json({ message: 'Login successful', customer: user });
    });
});

/* =====================================================
   FARMER REGISTER & LOGIN
===================================================== */
app.post('/farmers/register', async (req, res) => {
    const { full_name, email, password, farm_name, location, contact_number } = req.body;
    if (!full_name || !email || !password || !farm_name || !location || !contact_number)
        return res.status(400).json({ message: 'All fields required' });
    try {
        const hashed = await bcrypt.hash(password, 10);
        db.query(
            `INSERT INTO farmers (full_name, email, password, farm_name, location, contact_number) VALUES (?, ?, ?, ?, ?, ?)`,
            [full_name, email, hashed, farm_name, location, contact_number],
            (err) => {
                if (err) return res.status(500).json({ message: 'Registration failed' });
                res.json({ message: 'Farmer registered' });
            }
        );
    } catch {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/farmers/login', (req, res) => {
    const { email, password } = req.body;
    db.query("SELECT * FROM farmers WHERE email = ?", [email], async (err, result) => {
        if (err || result.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
        const farmer = result[0];
        const match = await bcrypt.compare(password, farmer.password);
        if (!match) return res.status(401).json({ message: 'Invalid credentials' });
        res.json({
            message: 'Login successful',
            farmer: {
                id: farmer.id,
                full_name: farmer.full_name,
                contact_number: farmer.contact_number,
                farm_name: farmer.farm_name,
                location: farmer.location
            }
        });
    });
});

/* =====================================================
   PRODUCTS
===================================================== */
app.post('/add-product', (req, res) => {
    let { name, quantity, price_per_kg, location, farmer_name, farmer_contact, farm_name } = req.body;
    if (!name || !quantity || !price_per_kg || !location || !farmer_name || !farmer_contact || !farm_name)
        return res.status(400).json({ message: 'All fields required' });

    quantity = parseInt(quantity);
    price_per_kg = parseFloat(price_per_kg);

    db.query(
        `INSERT INTO product_items
        (name, quantity, price_per_kg, location, farmer_name, farmer_contact, farm_name, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [name, quantity, price_per_kg, location, farmer_name, farmer_contact, farm_name],
        (err) => {
            if (err) return res.status(500).json({ message: 'Add failed' });
            res.json({ message: 'Product added successfully' });
        }
    );
});

app.get('/products', (req, res) => {
    db.query("SELECT * FROM product_items ORDER BY created_at DESC", (err, result) => {
        if (err) return res.status(500).json({ message: 'Fetch failed' });
        res.json(result);
    });
});

/* =====================================================
   PLACE ORDER (WITH STOCK UPDATE)
===================================================== */
app.post('/orders', (req, res) => {
    let { product_id, quantity, customer_name, customer_email } = req.body;
    if (!product_id || !quantity || !customer_name || !customer_email)
        return res.status(400).json({ message: 'All fields required' });

    quantity = parseInt(quantity);

    db.query("SELECT * FROM product_items WHERE id = ? AND is_active = 1", [product_id], (err, result) => {
        if (err || result.length === 0) return res.status(404).json({ message: 'Product not found' });

        const product = result[0];

        if (quantity > product.quantity) return res.status(400).json({ message: 'Not enough stock available' });

        const total_price = quantity * parseFloat(product.price_per_kg);

        // Insert order
        db.query(
            `INSERT INTO orders 
            (product_id, product_name, quantity, price_per_kg, total_price, customer_name, customer_email, farmer_name, farmer_contact, farm_name, location, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                product.id,
                product.name,
                quantity,
                parseFloat(product.price_per_kg),
                total_price,
                customer_name,
                customer_email,
                product.farmer_name,
                product.farmer_contact,
                product.farm_name,
                product.location
            ],
            (err) => {
                if (err) return res.status(500).json({ message: 'Order failed' });

                // Reduce product stock
                db.query(
                    "UPDATE product_items SET quantity = quantity - ? WHERE id = ?",
                    [quantity, product.id],
                    (err2) => {
                        if (err2) console.error('Stock update failed', err2);
                        res.json({ message: 'Order placed successfully' });
                    }
                );
            }
        );
    });
});

app.get('/orders', (req, res) => {
    db.query("SELECT * FROM orders ORDER BY created_at DESC", (err, result) => {
        if (err) return res.status(500).json({ message: 'Fetch failed' });
        res.json(result);
    });
});

/* =====================================================
   START SERVER
===================================================== */
app.listen(8081, () => console.log('Server running on http://localhost:8081'));
