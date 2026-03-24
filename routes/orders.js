// backend/routes/orders.js
const express  = require('express');
const router   = express.Router();
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/mysql');

// ─── Middleware: cualquier usuario logueado ───────────────────────────────────
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// ─── Middleware: solo admin ───────────────────────────────────────────────────
const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden hacer esto' });
    }
    next();
  });
};

// ─── POST /api/orders — Crear pedido ─────────────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
  const { items, total, payment_method } = req.body;

  if (!items || !total || !payment_method) {
    return res.status(400).json({ error: 'Faltan datos del pedido' });
  }

  try {
    const id        = uuidv4();
    const reference = payment_method === 'oxxo' ? generateOXXOReference() : '';

    await pool.execute(
      `INSERT INTO orders 
        (id, user_id, user_email, user_name, items, total, payment_method, payment_reference, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmado')`,
      [
        id,
        req.user.id,
        req.user.email,
        req.user.name,
        JSON.stringify(items),
        Number(total),
        payment_method,
        reference,
      ]
    );

    res.status(201).json({
      id,
      status: 'confirmado',
      payment_reference: reference,
      created_at: new Date(),
    });
  } catch (error) {
    console.error('Error creando pedido:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── GET /api/orders/mine — Pedidos del usuario logueado ─────────────────────
router.get('/mine', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows.map(parseOrder));
  } catch (error) {
    console.error('Error obteniendo mis pedidos:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── GET /api/orders/all — Todos los pedidos (solo admin) ────────────────────
router.get('/all', verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM orders ORDER BY created_at DESC'
    );
    res.json(rows.map(parseOrder));
  } catch (error) {
    console.error('Error obteniendo todos los pedidos:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseOrder(row) {
  return {
    ...row,
    items: safeParseJSON(row.items, []),
    total: Number(row.total),
  };
}

function safeParseJSON(value, fallback) {
  try { return JSON.parse(value); }
  catch { return fallback; }
}

// Genera referencia de 18 dígitos estilo OXXO
function generateOXXOReference() {
  const digits = Math.floor(Math.random() * 1e18).toString().padStart(18, '0');
  return digits;
}

module.exports = router;