const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'signup' // your database
});

db.connect(err => {
    if (err) {
        console.error('DB Connection Failed:', err);
    } else {
        console.log('MySQL Connected');
    }
});

// =================== SIGNUP ===================
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = "INSERT INTO login (name, email, password) VALUES (?, ?, ?)";
        db.query(sql, [name, email, hashedPassword], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Email already registered' });
                console.log(err);
                return res.status(500).json({ message: 'Signup failed' });
            }
            res.json({ message: 'Signup successful! Please login.' });
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// =================== LOGIN ===================
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const sql = "SELECT * FROM login WHERE email = ?";
    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (results.length === 0) return res.status(401).json({ message: 'Invalid email or password' });

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid email or password' });

        res.json({ message: 'Login successful!', user: { id: user.id, name: user.name, email: user.email } });
    });
});

// =================== PRODUCT ROUTES ===================

// ADD PRODUCT
app.post('/add-product', (req, res) => {
    const { name, quantity, price_per_kg, location } = req.body;
    if (!name || !quantity || !price_per_kg || !location) return res.status(400).json({ message: 'All fields are required' });

    const sql = "INSERT INTO product_items (name, quantity, price_per_kg, location) VALUES (?, ?, ?, ?)";
    db.query(sql, [name, quantity, price_per_kg, location], (err, result) => {
        if (err) return res.status(500).json({ message: 'Failed to add product' });
        res.json({ message: 'Product added successfully' });
    });
});

// GET ALL PRODUCTS
app.get('/products', (req, res) => {
    const sql = "SELECT * FROM product_items";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Failed to fetch products' });
        res.json(results);
    });
});

// UPDATE PRODUCT
app.put('/update-product/:id', (req, res) => {
    const { id } = req.params;
    const { name, quantity, price_per_kg, location } = req.body;

    if (!name || !quantity || !price_per_kg || !location) return res.status(400).json({ message: 'All fields are required' });

    const sql = "UPDATE product_items SET name = ?, quantity = ?, price_per_kg = ?, location = ? WHERE id = ?";
    db.query(sql, [name, quantity, price_per_kg, location, id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Failed to update product' });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });
        res.json({ message: 'Product updated successfully' });
    });
});

// DELETE PRODUCT
app.delete('/delete-product/:id', (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM product_items WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Failed to delete product' });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });
        res.json({ message: 'Product deleted successfully' });
    });
});

// =================== START SERVER ===================
app.listen(8081, () => {
    console.log('Server running on http://localhost:8081');
});
