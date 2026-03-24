// backend/crear_admin.js
// ─── SCRIPT PARA CREAR EL USUARIO ADMINISTRADOR ──────────────────────────────
// Ejecuta este script UNA SOLA VEZ desde la carpeta backend:
//   node crear_admin.js

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool, connectDB } = require('./db/mysql');

const ADMIN = {
  name:     'Administrador',
  email:    'admin@tienda.com',
  password: 'Admin1234!',
  role:     'admin',
};

const crear = async () => {
  await connectDB();

  try {
    // Verificar si ya existe
    const [existing] = await pool.execute(
      'SELECT id, email, role FROM users WHERE email = ?',
      [ADMIN.email]
    );

    if (existing.length > 0) {
      console.log('\n⚠️  El administrador ya existe:');
      console.log(`   Email: ${existing[0].email}`);
      console.log(`   Rol:   ${existing[0].role}`);
      console.log('\n💡 Si olvidaste la contraseña, edita este script y cambia ADMIN.email por otro correo.\n');
      process.exit(0);
    }

    const id           = uuidv4();
    const passwordHash = await bcrypt.hash(ADMIN.password, 10);

    await pool.execute(
      'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [id, ADMIN.name, ADMIN.email, passwordHash, ADMIN.role]
    );

    console.log('\n✅ Administrador creado exitosamente');
    console.log('─────────────────────────────────────');
    console.log(`   Nombre:     ${ADMIN.name}`);
    console.log(`   Email:      ${ADMIN.email}`);
    console.log(`   Contraseña: ${ADMIN.password}`);
    console.log('─────────────────────────────────────');
    console.log('💡 Guarda estos datos. Úsalos para iniciar sesión en la app.\n');

  } catch (error) {
    console.error('❌ Error creando administrador:', error.message);
  } finally {
    process.exit(0);
  }
};

crear();