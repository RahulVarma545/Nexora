require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const axios = require('axios'); // Import axios

const app = express();
app.use(cors());
app.use(express.json());

const dbPath = path.resolve(__dirname, 'ecommerce.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        description TEXT,
        category TEXT,
        image TEXT
      )`, async (err) => {
        if (err) {
          console.error('Error creating products table:', err.message);
        } else {
          db.get('SELECT COUNT(*) as count FROM products', async (err, row) => {
            if (err) {
              console.error('Error checking products count:', err.message);
            } else if (row.count === 0) {
              console.log('Fetching products from Fake Store API...');
              try {
                const response = await axios.get('https://fakestoreapi.com/products');
                const products = response.data;
                const stmt = db.prepare('INSERT INTO products (id, name, price, description, category, image) VALUES (?, ?, ?, ?, ?, ?)');
                products.forEach(product => {
                  stmt.run(product.id, product.title, product.price, product.description, product.category, product.image);
                });
                stmt.finalize((err) => {
                  if (err) console.error('Error finalizing statement:', err.message);
                  else console.log('Products inserted successfully.');
                });
              } catch (apiError) {
                console.error('Failed to fetch products from API:', apiError.message);
              }
            }
          });
        }
      });
      db.run(`CREATE TABLE IF NOT EXISTS cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        quantity INTEGER,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )`);
    });
  }
});

app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/cart', (req, res) => {
  const { productId, quantity } = req.body;
  db.get('SELECT * FROM cart_items WHERE product_id = ?', [productId], (err, item) => {
    if (item) {
      db.run('UPDATE cart_items SET quantity = quantity + ? WHERE product_id = ?', [quantity, productId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
      });
    } else {
      db.run('INSERT INTO cart_items (product_id, quantity) VALUES (?, ?)', [productId, quantity], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
      });
    }
  });
});

app.delete('/api/cart/:id', (req, res) => {
  db.run('DELETE FROM cart_items WHERE id = ?', req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.put('/api/cart/:id', (req, res) => {
  const { quantity } = req.body;
  db.run('UPDATE cart_items SET quantity = ? WHERE id = ?', [quantity, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.get('/api/cart', (req, res) => {
  const sql = `
    SELECT c.id, p.name, p.price, c.quantity, p.image 
    FROM cart_items c 
    JOIN products p ON c.product_id = p.id
  `;
  db.all(sql, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const total = rows.reduce((acc, item) => acc + item.price * item.quantity, 0);
    res.json({ items: rows, total });
  });
});

app.post('/api/checkout', (req, res) => {
  const { customerInfo } = req.body;
  // In a real app, you'd process payment here
  db.all('SELECT p.name, c.quantity, p.price FROM cart_items c JOIN products p ON c.product_id = p.id', (err, items) => {
    if (err) return res.status(500).json({ error: err.message });
    const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const receipt = {
      customer: customerInfo,
      items,
      total,
      date: new Date().toISOString()
    };
    db.run('DELETE FROM cart_items', () => {
      res.json(receipt);
    });
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGINT', () => {
  server.close(() => {
    db.close((err) => {
      if (err) {
        return console.error(err.message);
      }
      console.log('Closed the database connection.');
    });
    console.log('Server closed.');
  });
});