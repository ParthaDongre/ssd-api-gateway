# Dynamic Layer 7 API Gateway & Reverse Proxy (with MongoDB & Professional Light Console)

A modular, production-ready educational system design project implementing a **Layer 7 API Gateway and Reverse Proxy** in Node.js and Express, integrated with **MongoDB (via Mongoose)**, **JWT Authentication**, **Dynamic Hot-Reloadable Routing**, **Strict User-Specific Data Isolation**, and an **understated, professional light-themed developer dashboard**.

---

## 1. System Architecture

```
                                      +---------------------------------------------+
                                      |                 Browser UI                  |
                                      |      React + Vite Dashboard (Port 5173)     |
                                      +---------------------------------------------+
                                                             |
                                                             | (Proxy / Direct HTTP)
                                                             v
+-------------------------------------------------------------------------------------------------------------------------+
|                                        Layer 7 API Gateway & Reverse Proxy (Port 8000)                                 |
|                                                                                                                         |
|   1. CORS & Request Pipeline                                                                                            |
|   2. Longest-Prefix Matching (`config/routes.json` via `src/config/configLoader.js`)                                     |
|   3. JWT Authentication & Edge Token Verification (`src/middleware/authMiddleware.js`)                                   |
|   4. Internal Header Sanitization (Strips incoming `X-Authenticated-User` to prevent client spoofing)                   |
|   5. Verified Identity Injection (`X-Authenticated-User: <mongo_user_id>`)                                             |
|   6. Reverse Proxy Streaming & Prefix Stripping (`src/proxy/proxyEngine.js` using `http-proxy-middleware`)             |
|   7. Gateway Introspection Endpoint (`GET /api/v1/gateway/routes`) & Error Handling (HTTP 401, 403, 404, 503)            |
+-------------------------------------------------------------------------------------------------------------------------+
                                          |                         |                         |
                                          | (HTTP :5001)            | (HTTP :5002)            | (HTTP :5003)
                                          v                         v                         v
                       +----------------------+  +----------------------+  +----------------------+
                       |     Auth Service     |  |     User Service     |  |    Order Service     |
                       |      (Port 5001)     |  |      (Port 5002)     |  |     (Port 5003)      |
                       |                      |  |                      |  |                      |
                       | - User Registration  |  | - Verified Profile   |  | - User-Isolated      |
                       | - Password Hashing   |  |   Lookup (`/profile`)|  |   Orders (`/history`)|
                       | - JWT Issuance       |  | - Self Profile by ID |  | - Order Creation     |
                       | - Health Checks      |  | - Health Checks      |  | - Health Checks      |
                       +----------------------+  +----------------------+  +----------------------+
                                          \                         |                         /
                                           \                        |                        /
                                            v                       v                       v
                                      +---------------------------------------------+
                                      |              MongoDB Database               |
                                      |          Local (27017) / MongoDB Atlas      |
                                      |                                             |
                                      | - `users` (Hashed passwords, unique keys)   |
                                      | - `orders` (Ownership references & status)  |
                                      +---------------------------------------------+
```

---

## 2. Updated Project Structure

```
ssd-api-gateway/
├── .env                       # Local environment variables (excluded from Git)
├── .env.example               # Template environment configuration
├── .gitignore                 # Excludes .env, node_modules, build outputs, and logs
├── README.md                  # Comprehensive architectural and usage documentation
├── package.json               # Backend dependencies and runnable npm scripts
├── config/
│   └── routes.json            # Dynamic routing table configuration (hot-reloaded)
├── src/
│   ├── db/
│   │   └── connection.js      # Centralized Mongoose connection utility
│   ├── models/
│   │   ├── User.js            # Mongoose User model (Bcrypt hashing, safe serialization)
│   │   └── Order.js           # Mongoose Order model (User ObjectId ownership reference)
│   ├── config/
│   │   └── configLoader.js    # JSON validation, route resolver, and fs.watch reload engine
│   ├── middleware/
│   │   └── authMiddleware.js  # Edge JWT verification and identity header sanitization
│   ├── proxy/
│   │   └── proxyEngine.js     # http-proxy-middleware engine with identity header injection
│   └── server.js              # Gateway entry point (Port 8000) with route introspection
├── mock-services/
│   ├── authService.js         # Microservice 1: MongoDB auth and token issuance (Port 5001)
│   ├── userService.js         # Microservice 2: MongoDB user profile service (Port 5002)
│   └── orderService.js        # Microservice 3: MongoDB tenant-isolated order service (Port 5003)
├── scripts/
│   └── seed.js                # Idempotent database seeder with pre-configured demo users
├── tests/
│   └── integration.test.js    # 12-point automated test suite with isolated test DB
└── frontend/
    ├── package.json           # Frontend dependencies (React 18, Vite 6, Lucide icons)
    ├── vite.config.js         # Vite configuration with local proxy to Port 8000
    ├── index.html             # HTML entry template
    └── src/
        ├── main.jsx           # React DOM root entry
        ├── App.jsx            # Redesigned light-themed developer console & views
        └── styles.css         # Understated, professional light theme styling
```

---

## 3. Microservices & Gateway Responsibilities

| Service | Port | Base Path | Responsibilities |
|---|---|---|---|
| **API Gateway** | `8000` | `/` | Entry point for all client requests; handles CORS, route prefix resolution, edge JWT validation, public bypass rules, identity header sanitization, streaming reverse proxying, down-service failure handling (503), and safe route introspection (`/api/v1/gateway/routes`). |
| **Auth Service** | `5001` | `/api/v1/auth` | User registration (`/register`) with field validation, duplicate detection (409), password hashing via `bcryptjs`, user login (`/login`), and issuance of signed HMAC-SHA256 JWT tokens containing the MongoDB `_id` as the token subject (`sub`). |
| **User Service** | `5002` | `/api/v1/users` | Stores and retrieves user profiles (`/profile`) from MongoDB based on the verified `X-Authenticated-User` header. Ensures users cannot inspect or tamper with another user's private record. |
| **Order Service** | `5003` | `/api/v1/orders` | Manages persistent orders in MongoDB (`/history`, `POST /`). Enforces strict data isolation by binding each order to the verified user ID. Rejects unauthorized access with HTTP 404/403 to prevent record existence leakage. |

---

## 4. Environment Variables Configuration

Copy `.env.example` to `.env`:

```powershell
Copy-Item .env.example .env
```

Ensure `.env` contains:

```dotenv
# Gateway Port
PORT=8000

# Microservice Ports
AUTH_SERVICE_PORT=5001
USER_SERVICE_PORT=5002
ORDER_SERVICE_PORT=5003

# MongoDB Connection String (Local MongoDB or MongoDB Atlas)
MONGODB_URI=mongodb://127.0.0.1:27017/ssd_api_gateway

# JWT Configuration
JWT_SECRET=supersecretkey123
JWT_EXPIRES_IN=1h
```

> **Security Note:** In production, replace `JWT_SECRET` with a 256-bit cryptographic key and use MongoDB Atlas connection strings over TLS (`mongodb+srv://...`).

---

## 5. Database Initialization & Seeding

The application includes an idempotent seed script that populates demo users and sample orders safely.

Run the seed script in PowerShell:

```powershell
npm run seed
```

To wipe the database and re-seed from scratch:

```powershell
node scripts/seed.js --reset
```

### Seeded Demo Accounts

| Username | Password | Email | Sample Orders |
|---|---|---|---|
| `student` | `password123` | `student@example.com` | 3 orders (MacBook Pro, Logitech MX Master, Keychron K2) |
| `demo_user` | `password123` | `demo@example.com` | 2 orders (Dell UltraSharp 4K Monitor, CalDigit TS4 Dock) |

---

## 6. Running the Complete Application

Open 5 PowerShell terminals in the project root:

### Terminal 1: Auth Service (Port 5001)
```powershell
npm run auth
```

### Terminal 2: User Service (Port 5002)
```powershell
npm run users
```

### Terminal 3: Order Service (Port 5003)
```powershell
npm run orders
```

### Terminal 4: API Gateway (Port 8000)
```powershell
npm run dev
```

### Terminal 5: Frontend Dashboard (Port 5173)
```powershell
cd frontend
npm run dev
```

Open your browser to: **`http://localhost:5173`**

---

## 7. API Endpoints Specification

| Method | Gateway Endpoint | Target Service Path | Auth Required | Description |
|---|---|---|---|---|
| `GET` | `/health` | Direct Gateway | No | Gateway health check |
| `GET` | `/api/v1/gateway/routes` | Direct Gateway | No | Read-only configured routes inspection |
| `POST` | `/api/v1/auth/register` | `http://localhost:5001/register` | No | Register new user in MongoDB |
| `POST` | `/api/v1/auth/login` | `http://localhost:5001/login` | No | Login and obtain signed JWT |
| `GET` | `/api/v1/auth/health` | `http://localhost:5001/health` | No | Auth Service health check |
| `GET` | `/api/v1/users/health` | `http://localhost:5002/health` | No | User Service health check |
| `GET` | `/api/v1/users/profile` | `http://localhost:5002/profile` | **Yes** | Fetch current authenticated user profile |
| `GET` | `/api/v1/users/:id` | `http://localhost:5002/:id` | **Yes** | Self profile check (blocks access to other IDs) |
| `GET` | `/api/v1/orders/health` | `http://localhost:5003/health` | No | Order Service health check |
| `GET` | `/api/v1/orders/history` | `http://localhost:5003/history` | **Yes** | Fetch orders owned by current user |
| `POST` | `/api/v1/orders` | `http://localhost:5003/` | **Yes** | Create new order for current user |
| `GET` | `/api/v1/orders/:orderId` | `http://localhost:5003/:orderId` | **Yes** | Retrieve single order (only if user owns it) |

---

## 8. User Identity Propagation & Data Isolation

### How Identity Propagation Works
1. When a client authenticates via `/api/v1/auth/login`, the Auth Service creates a JWT:
   ```json
   {
     "sub": "6addd7fae526bf57c13490db",
     "username": "student",
     "role": "user"
   }
   ```
2. The client attaches this token in subsequent requests as `Authorization: Bearer <token>`.
3. The API Gateway verifies the token signature and expiration at the network edge (`src/middleware/authMiddleware.js`).
4. **Header Sanitization**: Before proxying, the gateway strips any incoming `X-Authenticated-User` and `X-Authenticated-Username` headers sent by the client to prevent header injection.
5. The gateway injects the verified claims into downstream request headers:
   - `X-Authenticated-User: <req.user.sub>`
   - `X-Authenticated-Username: <req.user.username>`
6. Downstream services read `req.get("X-Authenticated-User")`.
7. In the database, MongoDB queries filter strictly by this identifier:
   - Profile: `User.findById(authenticatedUserId)`
   - Orders: `Order.find({ user: authenticatedUserId })`

### Proving Data Isolation
- Log in as **`student`** (`password123`): You will see Student's profile and 3 orders.
- Log out and log in as **`demo_user`** (`password123`): You will see Alice Engineer's profile and 2 completely different orders.
- Direct API attempts to access another user's order ID (e.g., student attempting to fetch `ORD-2001`) return `HTTP 404 Not Found` without disclosing the private item details or document existence.

---

## 9. Automated Integration Testing

The project includes an automated test suite verifying all 12 core acceptance criteria against an isolated MongoDB test database (`ssd_api_gateway_test`).

Run tests in PowerShell:

```powershell
npm test
```

### Verified Test Cases:
1. **Successful registration**: Validates 201 response, safe fields, and password hash omission.
2. **Duplicate registration rejection**: Validates 409 Conflict when username or email already exists.
3. **Successful login**: Validates 200 OK, signed JWT format, and `sub` claim matching MongoDB `_id`.
4. **Incorrect password rejection**: Validates 401 Unauthorized for mismatched credentials.
5. **Missing JWT rejection on protected endpoints**: Validates 401 Unauthorized when Authorization header is absent.
6. **Expired JWT rejection**: Validates 401 Unauthorized with `"Token has expired"` message.
7. **User A receives User A's profile**: Confirms User A sees only their profile data.
8. **User B receives User B's profile**: Confirms User B sees distinct profile data.
9. **User A cannot access User B's private order**: Confirms 404 Not Found prevents order discovery.
10. **Order persists after service restart**: Confirms order remains intact in MongoDB after Order Service cycle.
11. **Stopped downstream service returns controlled 503**: Confirms gateway resilience when a target is offline.
12. **Route matching & path rewriting**: Confirms public bypass and prefix stripping work accurately.

---

## 10. Security Considerations & Academic Limitations

- **Header Injection Defense**: The gateway explicitly strips client-supplied `X-Authenticated-User` headers before forwarding. In an enterprise production deployment, mutual TLS (mTLS) or internal service-to-service HMAC signatures should be used to ensure downstream microservices cannot be called directly over the local network by unauthorized processes.
- **Token Storage**: In this educational demo, JWTs are stored in `localStorage` for rapid developer inspection. In production, `HttpOnly`, `Secure`, `SameSite=Strict` cookies are recommended to prevent client-side XSS access to tokens.
- **Downstream Network Boundary**: The microservices currently listen on `0.0.0.0` for local demo flexibility. In a production cluster, microservices should be placed in a private VPC subnet accessible only by the gateway's IP.