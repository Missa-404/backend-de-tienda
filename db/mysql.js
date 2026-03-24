// backend/db/mysql.js
// ─── ÚNICO ARCHIVO DE CONEXIÓN A BASE DE DATOS ───────────────────────────────
const mysql = require('mysql2/promise');
require('dotenv').config();

// ─── Verificar que las variables de entorno se cargaron ───────────────────────
if (!process.env.DB_PASSWORD) {
  console.warn('⚠️  ADVERTENCIA: No se encontró el archivo .env o está vacío.');
  console.warn('   Asegúrate de que el archivo se llame exactamente ".env" (no "_env")');
  console.warn('   y que esté en la carpeta raíz del backend.\n');
}

// Pool de conexiones (maneja múltiples peticiones al mismo tiempo)
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || 'sanzumivieja',
  database: process.env.DB_NAME     || 'tienda_db',
  waitForConnections: true,
  connectionLimit: 10,
  // Permite reconexión automática si MySQL se reinicia
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// ─── Crear todas las tablas si no existen ────────────────────────────────────
const initDB = async () => {
  const conn = await pool.getConnection();
  try {
    console.log('📋 Verificando/creando tablas...');

    // Tabla de usuarios
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id            VARCHAR(36)   PRIMARY KEY,
        name          VARCHAR(100)  NOT NULL,
        email         VARCHAR(150)  NOT NULL UNIQUE,
        password_hash VARCHAR(255)  NOT NULL,
        role          ENUM('admin','client') NOT NULL DEFAULT 'client',
        created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Tabla de productos
    // ⚠️ Las columnas TEXT no admiten DEFAULT en MySQL con modo estricto (NO_BLOB_VALUE)
    //    Se usan NULL en su lugar; el backend maneja los valores vacíos en el código
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id             VARCHAR(36)   PRIMARY KEY,
        name           VARCHAR(200)  NOT NULL,
        category       VARCHAR(50)   NOT NULL,
        subcategory    VARCHAR(50)   NULL,
        price          DECIMAL(10,2) NOT NULL,
        discount_price DECIMAL(10,2) NULL,
        description    TEXT          NULL,
        images         TEXT          NULL,
        sizes          TEXT          NULL,
        stock          INT           NOT NULL DEFAULT 0,
        created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Tabla de pedidos
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id                VARCHAR(36)   PRIMARY KEY,
        user_id           VARCHAR(36)   NOT NULL,
        user_email        VARCHAR(150)  NOT NULL,
        user_name         VARCHAR(100)  NOT NULL,
        items             TEXT          NOT NULL,
        total             DECIMAL(10,2) NOT NULL,
        payment_method    VARCHAR(20)   NOT NULL,
        payment_reference VARCHAR(50)   NULL,
        status            VARCHAR(30)   NOT NULL DEFAULT 'confirmado',
        created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id    (user_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('✅ Tablas verificadas/creadas correctamente');
    console.log('   → users, products, orders\n');
  } catch (error) {
    console.error('❌ Error creando tablas:', error.message);
    throw error;
  } finally {
    conn.release();
  }
};

// ─── Verificar conexión ───────────────────────────────────────────────────────
const connectDB = async () => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT 1 + 1 AS result');
    console.log('✅ Conectado a MySQL correctamente');
    console.log(`   Base de datos: ${process.env.DB_NAME || 'tienda_db'}`);
    conn.release();
    await initDB();
  } catch (error) {
    console.error('\n❌ Error conectando a MySQL:', error.message);
    console.error('\n💡 Posibles causas:');
    console.error('   1. MySQL no está corriendo → ábrelo en MySQL Workbench o como servicio');
    console.error('   2. Credenciales incorrectas en .env');
    console.error(`   3. La base de datos "${process.env.DB_NAME || 'tienda_db'}" no existe`);
    console.error(`      → Créala en MySQL Workbench: CREATE DATABASE ${process.env.DB_NAME || 'tienda_db'};`);
    console.error('   4. El archivo se llama "_env" en vez de ".env"\n');
    process.exit(1);
  }
};

module.exports = { pool, connectDB };
