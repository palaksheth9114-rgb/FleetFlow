const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { validatePassword } = require('./utils/passwordPolicy');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fleetflow',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function addMissingColumns(pool) {
  try {
    const [columns] = await pool.query('SHOW COLUMNS FROM users');
    const existingColumnNames = columns.map(c => c.Field.toLowerCase());

    if (!existingColumnNames.includes('is_active')) {
      await pool.query('ALTER TABLE users ADD COLUMN is_active TINYINT(1) DEFAULT 1');
      console.log('Added is_active column to users table');
    }
    if (!existingColumnNames.includes('created_at')) {
      await pool.query('ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
      console.log('Added created_at column to users table');
    }
    if (!existingColumnNames.includes('updated_at')) {
      await pool.query('ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
      console.log('Added updated_at column to users table');
    }
    if (!existingColumnNames.includes('last_login')) {
      await pool.query('ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL DEFAULT NULL');
      console.log('Added last_login column to users table');
    }
    if (!existingColumnNames.includes('failed_attempts')) {
      await pool.query('ALTER TABLE users ADD COLUMN failed_attempts INT DEFAULT 0');
      console.log('Added failed_attempts column to users table');
    }
  } catch (err) {
    console.error('Error checking/adding missing columns to users table:', err.message);
  }
}

async function initDB() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });
    
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'fleetflow'}\``);
    await connection.end();

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('Admin', 'Manager', 'Operator', 'Viewer') DEFAULT 'Viewer',
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL DEFAULT NULL,
        failed_attempts INT DEFAULT 0
      )
    `;

    const createVehiclesTable = `
      CREATE TABLE IF NOT EXISTS vehicles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        registration_number VARCHAR(50) NOT NULL UNIQUE,
        vehicle_type VARCHAR(100) NOT NULL,
        owner VARCHAR(255) NOT NULL,
        contract_type VARCHAR(100),
        current_km INT DEFAULT 0,
        status ENUM('Active', 'Under Maintenance', 'Inactive') DEFAULT 'Active'
      )
    `;

    const createDriversTable = `
      CREATE TABLE IF NOT EXISTS drivers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        license_number VARCHAR(100) NOT NULL UNIQUE,
        assigned_vehicle_id INT,
        status ENUM('Active', 'On Leave', 'Inactive') DEFAULT 'Active',
        FOREIGN KEY (assigned_vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
      )
    `;

    const createMaintenanceTable = `
      CREATE TABLE IF NOT EXISTS maintenance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id INT,
        service_date DATE NOT NULL,
        details TEXT,
        cost DECIMAL(10, 2) DEFAULT 0,
        status ENUM('Scheduled', 'In Progress', 'Completed') DEFAULT 'Scheduled',
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
      )
    `;

    const createTripsTable = `
      CREATE TABLE IF NOT EXISTS trips (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id INT,
        driver_id INT,
        origin VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        status ENUM('Scheduled', 'Active', 'Completed') DEFAULT 'Scheduled',
        distance DECIMAL(10, 2) DEFAULT 0,
        eta VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
        FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
      )
    `;

    const createAlertsTable = `
      CREATE TABLE IF NOT EXISTS alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id INT,
        type VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('Unread', 'Read') DEFAULT 'Unread',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
      )
    `;

    await pool.query(createUsersTable);
    await pool.query(createVehiclesTable);
    await pool.query(createDriversTable);
    await pool.query(createMaintenanceTable);
    await pool.query(createTripsTable);
    await pool.query(createAlertsTable);

    // Safely add missing columns to users table for existing databases
    await addMissingColumns(pool);

    console.log('Database tables initialized');

    // Secure First-Time Admin Setup
    await initAdmin();
  } catch (error) {
    console.error('Error initializing tables:', error);
  }
}

async function initAdmin() {
  try {
    const [adminRows] = await pool.query('SELECT COUNT(*) as adminCount FROM users WHERE role = ?', ['Admin']);
    if (adminRows[0].adminCount > 0) {
      console.log('[AUTH SETUP] Administrator account already exists. Skipping initial setup.');
      return;
    }

    const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

    if (!adminPassword) {
      console.warn('[AUTH SETUP WARNING] No Admin exists and INITIAL_ADMIN_PASSWORD is not set in server/.env. Initial Admin was not created.');
      return;
    }

    const validation = validatePassword(adminPassword);
    if (!validation.valid) {
      console.error(`[AUTH SETUP ERROR] Cannot create initial Admin account: ${validation.message}`);
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    await pool.query(
      'INSERT INTO users (username, password, role, is_active) VALUES (?, ?, ?, 1)',
      [adminUsername, hashedPassword, 'Admin']
    );
    console.log(`[AUTH SETUP SUCCESS] Initial administrator account '${adminUsername}' created successfully.`);
  } catch (error) {
    console.error('[AUTH SETUP ERROR] Error during initial Admin setup:', error);
  }
}

initDB();

module.exports = pool;

