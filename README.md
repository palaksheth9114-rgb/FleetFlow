# FleetFlow - Enterprise Fleet Management

A full-stack enterprise management system for vehicles, drivers, maintenance, and production-level administration.

## Tech Stack
- **Frontend**: React + Next.js (Vanilla CSS + Recharts)
- **Backend**: Node.js + Express.js + Socket.io
- **Database**: MySQL
- **Authentication & Security**: JWT (Role-Based Access Control) + Bcrypt Password Hashing

## Getting Started




### 2. Run the Backend
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Start the backend server (this automatically initializes the database, safely migrates table schemas, and creates the initial Admin if no Admin account exists):
   ```bash
   node index.js
   ```

### 3. Run the Frontend
1. In a new terminal, navigate to the client folder:
   ```bash
   cd client
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3002` in your browser.

## Key Features & Security Architecture
- **Admin Management Panel**: Real-time user administration, user creation, role assignment (`Admin`, `Manager`, `Operator`, `Viewer`), account activation/deactivation, password reset, and Admin lockout protection.
- **Profile & Password Security**: Self-service profile updating and secure password change validation.
- **Role-Based Security**: Complete frontend and backend authorization enforcing permission boundaries.
- **Dashboard**: Real-time stats with Socket.io and interactive Recharts graphs.
- **Fleet Management**: Vehicle CRUD, driver assignments, maintenance tracking, route optimization, and alerts.
- **Premium Design System**: Glassmorphism aesthetic with responsive dark enterprise styling.
