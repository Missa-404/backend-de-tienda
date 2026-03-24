// backend/server.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { connectDB } = require('./db/mysql');

const authRoutes    = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes   = require('./routes/orders');

const app = express();

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders',   orderRoutes);

// Ruta de prueba — abre http://TU_IP:3001 en el navegador para verificar
app.get('/', (req, res) => {
  res.json({ message: '🛍️ API Tienda funcionando correctamente con MySQL' });
});

const PORT = process.env.PORT || 3001;

const start = async () => {
  await connectDB(); // Conecta a MySQL y crea las tablas automáticamente
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🌐 Prueba en navegador: http://localhost:${PORT}`);
    console.log(`📱 Desde la app usa:   http://TU_IP:${PORT}`);
  });
};

start();