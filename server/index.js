require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { authenticateToken, requireRole } = require('./middleware/auth');
const { validatePassword } = require('./utils/passwordPolicy');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Broadcast helper
const broadcastUpdate = (event, data) => {
  io.emit(event, data);
};

// Helper: Check if user is the last active admin
async function isLastActiveAdmin(userId) {
  const [targetRows] = await db.query('SELECT role, is_active FROM users WHERE id = ?', [userId]);
  if (targetRows.length === 0) return false;
  const targetUser = targetRows[0];
  if (targetUser.role !== 'Admin' || targetUser.is_active === 0) return false;
  
  const [adminCountRows] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = ? AND is_active = 1', ['Admin']);
  return adminCountRows[0].count <= 1;
}

// --- HEALTH CHECK ROUTE ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- AUTHENTICATION & PROFILE ROUTES ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = rows[0];

    if (user.is_active === 0 || user.is_active === false) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact an administrator.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      await db.query('UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = ?', [user.id]);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Reset failed attempts and update last login timestamp
    await db.query('UPDATE users SET failed_attempts = 0, last_login = NOW() WHERE id = ?', [user.id]);

    const secret = process.env.JWT_SECRET || 'fleetflow_default_jwt_secret_key';
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      secret,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        is_active: user.is_active,
        last_login: new Date()
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET Current User Profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, username, role, is_active, created_at, updated_at, last_login FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Change Password Endpoint
app.put('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Current password, new password, and confirmation are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirmation password do not match.' });
    }

    const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: passwordValidation.message });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [newHashedPassword, req.user.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update Profile Endpoint
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ message: 'Valid username is required.' });
    }

    const trimmedUsername = username.trim();

    // Check username uniqueness
    const [existing] = await db.query('SELECT id FROM users WHERE username = ? AND id != ?', [trimmedUsername, req.user.id]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Username is already taken.' });
    }

    await db.query('UPDATE users SET username = ? WHERE id = ?', [trimmedUsername, req.user.id]);
    const [updated] = await db.query('SELECT id, username, role, is_active, created_at, updated_at, last_login FROM users WHERE id = ?', [req.user.id]);

    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// --- ADMIN MANAGEMENT ROUTES (Protected by Admin Role) ---
app.get('/api/admin/users', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, username, role, is_active, created_at, updated_at, last_login FROM users ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/admin/users', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { username, password, role, is_active } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Username, password, and role are required.' });
    }

    const allowedRoles = ['Admin', 'Manager', 'Operator', 'Viewer'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified.' });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: passwordValidation.message });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Username already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const activeState = is_active === false || is_active === 0 ? 0 : 1;

    const [result] = await db.query(
      'INSERT INTO users (username, password, role, is_active) VALUES (?, ?, ?, ?)',
      [username.trim(), hashedPassword, role, activeState]
    );

    const [newUser] = await db.query('SELECT id, username, role, is_active, created_at, updated_at, last_login FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json(newUser[0]);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/admin/users/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const { username, role, is_active } = req.body;

    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [targetId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const allowedRoles = ['Admin', 'Manager', 'Operator', 'Viewer'];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified.' });
    }

    const newActiveState = is_active === false || is_active === 0 ? 0 : 1;
    const newRole = role || rows[0].role;

    // ADMIN LOCKOUT PROTECTION CHECK
    if (newActiveState === 0 || newRole !== 'Admin') {
      const isLastAdmin = await isLastActiveAdmin(targetId);
      if (isLastAdmin) {
        return res.status(400).json({
          message: 'Operation prohibited: Cannot deactivate or demote the last active Administrator account.'
        });
      }
    }

    const newUsername = username ? username.trim() : rows[0].username;

    if (newUsername !== rows[0].username) {
      const [existing] = await db.query('SELECT id FROM users WHERE username = ? AND id != ?', [newUsername, targetId]);
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Username is already taken.' });
      }
    }

    await db.query(
      'UPDATE users SET username = ?, role = ?, is_active = ? WHERE id = ?',
      [newUsername, newRole, newActiveState, targetId]
    );

    const [updated] = await db.query('SELECT id, username, role, is_active, created_at, updated_at, last_login FROM users WHERE id = ?', [targetId]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/admin/users/:id/reset-password', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required.' });
    }

    const [rows] = await db.query('SELECT id FROM users WHERE id = ?', [targetId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: passwordValidation.message });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, targetId]);

    res.json({ message: 'User password reset successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);

    const [rows] = await db.query('SELECT id FROM users WHERE id = ?', [targetId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // ADMIN LOCKOUT PROTECTION CHECK
    const isLastAdmin = await isLastActiveAdmin(targetId);
    if (isLastAdmin) {
      return res.status(400).json({
        message: 'Operation prohibited: Cannot delete the last active Administrator account.'
      });
    }

    await db.query('DELETE FROM users WHERE id = ?', [targetId]);
    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// --- DASHBOARD ROUTE ---
app.get('/api/dashboard', authenticateToken, async (req, res) => {

  try {
    const [vehicles] = await db.query('SELECT * FROM vehicles');
    const [maintenance] = await db.query('SELECT SUM(cost) as totalCost FROM maintenance WHERE MONTH(service_date) = MONTH(CURRENT_DATE()) AND YEAR(service_date) = YEAR(CURRENT_DATE())');
    
    let totalKm = 0;
    let active = 0;
    let underMaintenance = 0;
    let inactive = 0;

    vehicles.forEach(v => {
      totalKm += v.current_km;
      if (v.status === 'Active') active++;
      else if (v.status === 'Under Maintenance') underMaintenance++;
      else inactive++;
    });

    const stats = {
      totalVehicles: vehicles.length,
      activeVehicles: active,
      underMaintenance: underMaintenance,
      inactive: inactive,
      totalKm: totalKm,
      monthlyMaintenanceCost: maintenance[0].totalCost || 0
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- VEHICLES ROUTES ---
app.get('/api/vehicles', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM vehicles');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vehicles', authenticateToken, requireRole(['Admin', 'Manager']), async (req, res) => {
  try {
    const { registration_number, vehicle_type, owner, contract_type, current_km, status } = req.body;
    const [result] = await db.query(
      'INSERT INTO vehicles (registration_number, vehicle_type, owner, contract_type, current_km, status) VALUES (?, ?, ?, ?, ?, ?)',
      [registration_number, vehicle_type, owner, contract_type, current_km || 0, status || 'Active']
    );
    const [newVehicle] = await db.query('SELECT * FROM vehicles WHERE id = ?', [result.insertId]);
    broadcastUpdate('vehicle_updated', newVehicle[0]);
    broadcastUpdate('dashboard_updated', {});
    res.status(201).json(newVehicle[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/vehicles/:id', authenticateToken, requireRole(['Admin', 'Manager']), async (req, res) => {
  try {
    const { registration_number, vehicle_type, owner, contract_type, current_km, status } = req.body;
    await db.query(
      'UPDATE vehicles SET registration_number = ?, vehicle_type = ?, owner = ?, contract_type = ?, current_km = ?, status = ? WHERE id = ?',
      [registration_number, vehicle_type, owner, contract_type, current_km, status, req.params.id]
    );
    const [updatedVehicle] = await db.query('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
    broadcastUpdate('vehicle_updated', updatedVehicle[0]);
    broadcastUpdate('dashboard_updated', {});
    res.json(updatedVehicle[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/vehicles/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    await db.query('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
    broadcastUpdate('vehicle_deleted', req.params.id);
    broadcastUpdate('dashboard_updated', {});
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DRIVERS ROUTES ---
app.get('/api/drivers', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT drivers.*, vehicles.registration_number as vehicle_reg FROM drivers LEFT JOIN vehicles ON drivers.assigned_vehicle_id = vehicles.id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drivers', authenticateToken, requireRole(['Admin', 'Manager']), async (req, res) => {
  try {
    const { name, license_number, assigned_vehicle_id, status } = req.body;
    const [result] = await db.query(
      'INSERT INTO drivers (name, license_number, assigned_vehicle_id, status) VALUES (?, ?, ?, ?)',
      [name, license_number, assigned_vehicle_id || null, status || 'Active']
    );
    const [newDriver] = await db.query('SELECT drivers.*, vehicles.registration_number as vehicle_reg FROM drivers LEFT JOIN vehicles ON drivers.assigned_vehicle_id = vehicles.id WHERE drivers.id = ?', [result.insertId]);
    res.status(201).json(newDriver[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/drivers/:id', authenticateToken, requireRole(['Admin', 'Manager']), async (req, res) => {
  try {
    const { name, license_number, assigned_vehicle_id, status } = req.body;
    await db.query(
      'UPDATE drivers SET name = ?, license_number = ?, assigned_vehicle_id = ?, status = ? WHERE id = ?',
      [name, license_number, assigned_vehicle_id || null, status, req.params.id]
    );
    const [updatedDriver] = await db.query('SELECT drivers.*, vehicles.registration_number as vehicle_reg FROM drivers LEFT JOIN vehicles ON drivers.assigned_vehicle_id = vehicles.id WHERE drivers.id = ?', [req.params.id]);
    res.json(updatedDriver[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/drivers/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    await db.query('DELETE FROM drivers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- MAINTENANCE ROUTES ---
app.get('/api/maintenance', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT maintenance.*, vehicles.registration_number FROM maintenance JOIN vehicles ON maintenance.vehicle_id = vehicles.id ORDER BY service_date DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/maintenance', authenticateToken, requireRole(['Admin', 'Manager', 'Operator']), async (req, res) => {
  try {
    const { vehicle_id, service_date, details, cost, status } = req.body;
    const [result] = await db.query(
      'INSERT INTO maintenance (vehicle_id, service_date, details, cost, status) VALUES (?, ?, ?, ?, ?)',
      [vehicle_id, service_date, details, cost || 0, status || 'Scheduled']
    );
    const [newMaint] = await db.query('SELECT maintenance.*, vehicles.registration_number FROM maintenance JOIN vehicles ON maintenance.vehicle_id = vehicles.id WHERE maintenance.id = ?', [result.insertId]);
    broadcastUpdate('dashboard_updated', {});
    res.status(201).json(newMaint[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/maintenance/:id', authenticateToken, requireRole(['Admin', 'Manager', 'Operator']), async (req, res) => {
  try {
    const { vehicle_id, service_date, details, cost, status } = req.body;
    await db.query(
      'UPDATE maintenance SET vehicle_id = ?, service_date = ?, details = ?, cost = ?, status = ? WHERE id = ?',
      [vehicle_id, service_date, details, cost, status, req.params.id]
    );
    const [updatedMaint] = await db.query('SELECT maintenance.*, vehicles.registration_number FROM maintenance JOIN vehicles ON maintenance.vehicle_id = vehicles.id WHERE maintenance.id = ?', [req.params.id]);
    broadcastUpdate('dashboard_updated', {});
    res.json(updatedMaint[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/maintenance/:id', authenticateToken, requireRole(['Admin', 'Manager']), async (req, res) => {
  try {
    await db.query('DELETE FROM maintenance WHERE id = ?', [req.params.id]);
    broadcastUpdate('dashboard_updated', {});
    res.json({ message: 'Maintenance record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TRIPS ROUTES ---
app.get('/api/trips', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT trips.*, vehicles.registration_number, drivers.name as driver_name FROM trips LEFT JOIN vehicles ON trips.vehicle_id = vehicles.id LEFT JOIN drivers ON trips.driver_id = drivers.id ORDER BY trips.created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/trips', authenticateToken, requireRole(['Admin', 'Manager']), async (req, res) => {
  try {
    const { vehicle_id, driver_id, origin, destination, status, distance, eta } = req.body;
    const [result] = await db.query(
      'INSERT INTO trips (vehicle_id, driver_id, origin, destination, status, distance, eta) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [vehicle_id, driver_id, origin, destination, status || 'Scheduled', distance || 0, eta]
    );
    const [newTrip] = await db.query('SELECT trips.*, vehicles.registration_number, drivers.name as driver_name FROM trips LEFT JOIN vehicles ON trips.vehicle_id = vehicles.id LEFT JOIN drivers ON trips.driver_id = drivers.id WHERE trips.id = ?', [result.insertId]);
    broadcastUpdate('dashboard_updated', {});
    res.status(201).json(newTrip[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/trips/:id', authenticateToken, requireRole(['Admin', 'Manager']), async (req, res) => {
  try {
    const { vehicle_id, driver_id, origin, destination, status, distance, eta } = req.body;
    await db.query(
      'UPDATE trips SET vehicle_id = ?, driver_id = ?, origin = ?, destination = ?, status = ?, distance = ?, eta = ? WHERE id = ?',
      [vehicle_id, driver_id, origin, destination, status, distance, eta, req.params.id]
    );
    const [updatedTrip] = await db.query('SELECT trips.*, vehicles.registration_number, drivers.name as driver_name FROM trips LEFT JOIN vehicles ON trips.vehicle_id = vehicles.id LEFT JOIN drivers ON trips.driver_id = drivers.id WHERE trips.id = ?', [req.params.id]);
    broadcastUpdate('dashboard_updated', {});
    res.json(updatedTrip[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/trips/:id', authenticateToken, requireRole(['Admin', 'Manager']), async (req, res) => {
  try {
    await db.query('DELETE FROM trips WHERE id = ?', [req.params.id]);
    broadcastUpdate('dashboard_updated', {});
    res.json({ message: 'Trip deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ALERTS ROUTES ---
app.get('/api/alerts', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT alerts.*, vehicles.registration_number FROM alerts LEFT JOIN vehicles ON alerts.vehicle_id = vehicles.id ORDER BY alerts.timestamp DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/alerts', authenticateToken, async (req, res) => {
  try {
    const { vehicle_id, type, message, status } = req.body;
    const [result] = await db.query(
      'INSERT INTO alerts (vehicle_id, type, message, status) VALUES (?, ?, ?, ?)',
      [vehicle_id, type, message, status || 'Unread']
    );
    const [newAlert] = await db.query('SELECT alerts.*, vehicles.registration_number FROM alerts LEFT JOIN vehicles ON alerts.vehicle_id = vehicles.id WHERE alerts.id = ?', [result.insertId]);
    broadcastUpdate('alert_new', newAlert[0]);
    res.status(201).json(newAlert[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/alerts/:id/read', authenticateToken, async (req, res) => {
  try {
    await db.query('UPDATE alerts SET status = ? WHERE id = ?', ['Read', req.params.id]);
    res.json({ message: 'Alert marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/alerts/:id', authenticateToken, async (req, res) => {
  try {
    await db.query('DELETE FROM alerts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Alert deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- REPORTS ROUTE ---
app.get('/api/reports/summary', authenticateToken, async (req, res) => {
  try {
    const [trips] = await db.query('SELECT SUM(distance) as total_distance FROM trips WHERE status = "Completed"');
    const [maintenance] = await db.query('SELECT SUM(cost) as total_cost FROM maintenance');
    const [drivers] = await db.query('SELECT COUNT(*) as active_drivers FROM drivers WHERE status = "Active"');
    
    // Simple fuel estimate: 1 liter per 8 km, cost $1.5 per liter
    const distance = trips[0].total_distance || 0;
    const fuel_usage = distance / 8;
    const fuel_cost = fuel_usage * 1.5;

    res.json({
      total_mileage: distance,
      maintenance_expenses: maintenance[0].total_cost || 0,
      active_drivers: drivers[0].active_drivers,
      estimated_fuel_usage_liters: fuel_usage,
      estimated_fuel_cost: fuel_cost
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
