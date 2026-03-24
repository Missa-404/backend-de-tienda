// backend/routes/products.js
const express  = require('express');
const router   = express.Router();
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/mysql');

// ─── Middleware: solo admin ───────────────────────────────────────────────────
const verifyAdmin = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden hacer esto' });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// ─── GET /api/products — Todos los productos ─────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM products ORDER BY created_at DESC'
    );
    // Convertir images y sizes de JSON string a array
    const products = rows.map(parseProduct);
    res.json(products);
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── GET /api/products/category/:category — Por categoría ────────────────────
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const [rows] = await pool.execute(
      'SELECT * FROM products WHERE category = ? ORDER BY created_at DESC',
      [category]
    );
    res.json(rows.map(parseProduct));
  } catch (error) {
    console.error('Error obteniendo por categoría:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── GET /api/products/:id — Un producto ─────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(parseProduct(rows[0]));
  } catch (error) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── POST /api/products — Crear producto (solo admin) ────────────────────────
router.post('/', verifyAdmin, async (req, res) => {
  const { name, category, subcategory, price, discount_price, description, images, sizes, stock } = req.body;

  if (!name || !category || price === undefined) {
    return res.status(400).json({ error: 'Nombre, categoría y precio son requeridos' });
  }

  try {
    const id = uuidv4();

    await pool.execute(
      `INSERT INTO products 
        (id, name, category, subcategory, price, discount_price, description, images, sizes, stock)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name.trim(),
        category,
        subcategory || '',
        Number(price),
        discount_price ? Number(discount_price) : null,
        description || '',
        JSON.stringify(images || []),
        JSON.stringify(sizes || []),
        Number(stock) || 0,
      ]
    );

    res.status(201).json({ id, name, category, price: Number(price), message: 'Producto creado' });
  } catch (error) {
    console.error('Error creando producto:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── PUT /api/products/:id — Actualizar producto (solo admin) ────────────────
router.put('/:id', verifyAdmin, async (req, res) => {
  const { name, category, subcategory, price, discount_price, description, images, sizes, stock } = req.body;

  try {
    const [existing] = await pool.execute(
      'SELECT id FROM products WHERE id = ?',
      [req.params.id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await pool.execute(
      `UPDATE products SET
        name=?, category=?, subcategory=?, price=?, discount_price=?,
        description=?, images=?, sizes=?, stock=?
       WHERE id=?`,
      [
        name.trim(),
        category,
        subcategory || '',
        Number(price),
        discount_price ? Number(discount_price) : null,
        description || '',
        JSON.stringify(images || []),
        JSON.stringify(sizes || []),
        Number(stock) || 0,
        req.params.id,
      ]
    );

    res.json({ message: 'Producto actualizado correctamente' });
  } catch (error) {
    console.error('Error actualizando producto:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── DELETE /api/products/:id — Eliminar producto (solo admin) ───────────────
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM products WHERE id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando producto:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── Helper: convierte JSON strings a arrays ──────────────────────────────────
function parseProduct(row) {
  return {
    ...row,
    images: safeParseJSON(row.images, []),
    sizes:  safeParseJSON(row.sizes,  []),
    price:          Number(row.price),
    discount_price: row.discount_price ? Number(row.discount_price) : null,
    stock:          Number(row.stock),
  };
}

function safeParseJSON(value, fallback) {
  try { return JSON.parse(value); } 
  catch { return fallback; }
}

module.exports = router;