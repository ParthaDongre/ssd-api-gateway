# Dynamic Layer 7 API Gateway & Reverse Proxy (with AWS DynamoDB & Cloud Console)

A modular, production-ready educational system design project implementing a **Layer 7 API Gateway and Reverse Proxy** in Node.js and Express, integrated with **Amazon DynamoDB (AWS Cloud SDK v3)**, **JWT Authentication (HMAC-SHA256)**, **Dynamic Hot-Reloadable Routing**, **1-Click Live Downstream Server Controls & Fault Injection**, **Strict Per-Tenant Data Isolation**, and a **high-density, full-screen developer dashboard ready for seamless Vercel deployment**.

---

## 1. System Architecture

```
                                      +---------------------------------------------+
                                      |                 Browser UI                  |
                                      |    React + Vite Full-Width Console (:5173)   |
                                      +---------------------------------------------+
                                                             |
                                                             | (HTTP /api/*)
                                                             v
+-------------------------------------------------------------------------------------------------------------------------+
|                                        Layer 7 API Gateway & Reverse Proxy (Port 8000)                                 |
|                                                                                                                         |
|   1. CORS & Request Pipeline                                                                                            |
|   2. Longest-Prefix Matching (`config/routes.json` via `src/config/configLoader.js`)                                     |
|   3. JWT Authentication & Edge Token Verification (`src/middleware/authMiddleware.js`)                                   |
|   4. Internal Header Sanitization (Strips client-supplied `X-Authenticated-User` to prevent spoofing)                   |
|   5. Verified Identity Injection (`X-Authenticated-User: <dynamo_user_id>`)                                             |
|   6. 1-Click Downstream Server Manager & Fault Injector (`/api/v1/gateway/services/:key/stop|start`)                   |
|   7. Reverse Proxy Streaming & Prefix Stripping (`src/proxy/proxyEngine.js` using `http-proxy-middleware`)             |
|   8. Gateway Introspection Endpoint (`GET /api/v1/gateway/routes`) & Error Handling (HTTP 401, 403, 404, 503)            |
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
                       | - Live Start/Stop    |  | - Live Start/Stop    |  | - Live Start/Stop    |
                       +----------------------+  +----------------------+  +----------------------+
                                          \                         |                         /
                                           \                        |                        /
                                            v                       v                       v
                                      +---------------------------------------------+
                                      |            Amazon DynamoDB (AWS)            |
                                      |        AWS Cloud Free-Tier / Academy        |
                                      |                                             |
                                      | - `ssd_users` (UUID PK, GSIs for login)     |
                                      | - `ssd_orders` (user-index GSI, Pay-Per-Req)|
                                      +---------------------------------------------+
```

---

## 2. Key Capabilities & New Features

### ☁️ AWS Cloud DynamoDB Integration
- Replaced MongoDB with **Amazon DynamoDB** using the modern AWS SDK v3 (`@aws-sdk/client-dynamodb` & `@aws-sdk/lib-dynamodb`).
- **AWS Academy / Learner Lab Student Friendly**: Full support for temporary session tokens (`AWS_SESSION_TOKEN`).
- **Pay-Per-Request (On-Demand)**: Tables are initialized automatically in the cloud with zero idle charges, guaranteeing $0 expense and safe student credit consumption.
- **Resilient Fallback Mode**: If AWS keys are not yet configured in `.env`, the system runs in an offline in-memory DynamoDB-compatible fallback so you can develop and test immediately.

### 🛑 1-Click Server Stopping & Live Fault Testing
- In the UI (under **"Server Controls"** or on the **Overview** dashboard), you can stop any downstream microservice (Auth :5001, User :5002, Order :5003) with a single click.
- **The server actually closes its listening port**: This generates real TCP connection refusal (`ECONNREFUSED`).
- Click **"Test & Inspect Error"** right next to the server to send an HTTP request through the Gateway:
  - If the server is stopped, the Gateway intercepts the error and returns a clean, structured **HTTP 503 Service Unavailable (ECONNREFUSED)** response detailing the offline target.
  - Click **"Start Server"** to reopen the port and watch it immediately recover with **HTTP 200 OK**!

### 🖥️ Full-Width, High-Density UI Dashboard
- Eliminated all artificial container constraints and empty white margins.
- Packed with valuable operational data:
  - 4-card KPI Header (Gateway Port 8000, DynamoDB Status, Microservices State, JWT Security).
  - Real-Time Gateway Request Stream log ticker.
  - Multi-column User Profile with JWT Claims Decoder and DynamoDB Key Inspector.
  - Orders Command Center with portfolio spending metrics and quick-order presets.
  - API Playground with side-by-side request builder and JSON response inspector.

### 🚀 Zero-Mistake Vercel Deployment
- Includes `vercel.json` and `api/index.js` pre-configured to deploy both the React frontend and the Express API Gateway as serverless functions.

---

## 3. Project Structure

```
ssd-api-gateway/
├── .env                       # Local environment variables (AWS credentials, JWT)
├── .env.example               # Template environment configuration
├── .gitignore                 # Standard exclusions
├── vercel.json                # Vercel deployment routing & build config
├── README.md                  # Complete architectural & operational guide
├── package.json               # Backend dependencies, AWS SDK v3, and build scripts
├── api/
│   └── index.js               # Vercel Serverless Function entrypoint
├── config/
│   └── routes.json            # Dynamic routing table configuration (hot-reloaded)
├── src/
│   ├── db/
│   │   ├── dynamoClient.js    # AWS DynamoDB client, auto-table creation & student session config
│   │   └── connection.js      # Centralized database lifecycle & status inspector
│   ├── models/
│   │   ├── User.js            # DynamoDB User model (Bcrypt hashing, GSI queries)
│   │   └── Order.js           # DynamoDB Order model (user-index GSI query, sortable)
│   ├── services/
│   │   └── serviceManager.js  # 1-click start/stop controller for downstream microservices
│   ├── config/
│   │   └── configLoader.js    # JSON validation, route resolver, and fs.watch reload engine
│   ├── middleware/
│   │   └── authMiddleware.js  # Edge JWT verification and identity header sanitization
│   ├── proxy/
│   │   └── proxyEngine.js     # http-proxy-middleware with identity injection & 503 error handler
│   └── server.js              # Gateway entry point (Port 8000) with server controls & db status
├── mock-services/
│   ├── authService.js         # Microservice 1: DynamoDB auth, login, register (:5001)
│   ├── userService.js         # Microservice 2: DynamoDB user profile (:5002)
│   └── orderService.js        # Microservice 3: DynamoDB tenant-isolated orders (:5003)
├── scripts/
│   └── seed.js                # Idempotent database seeder with pre-configured demo users
├── tests/
│   └── integration.test.js    # 13-point automated test suite covering all gateway behaviors
└── frontend/
    ├── package.json           # React 18, Vite 6, Lucide icons
    ├── vite.config.js         # Vite configuration with local proxy to Port 8000
    ├── index.html             # HTML entry template
    └── src/
        ├── main.jsx           # React DOM root entry
        ├── App.jsx            # Upgraded full-width developer console with server controls
        └── styles.css         # Modern, high-density styling
```

---

## 4. Quick Start (Local Development)

### Step 1: Install Dependencies
```bash
npm install
cd frontend && npm install && cd ..
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

If you have an **AWS Academy / Learner Lab** student account, open your Lab Console -> **AWS Details**, and paste your keys into `.env`:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=ASIA...
AWS_SECRET_ACCESS_KEY=...
AWS_SESSION_TOKEN=IQoJb3JpZ2lu...
```
*(If you leave the AWS fields blank, the system automatically uses the built-in resilient local DynamoDB memory fallback!)*

### Step 3: Seed Demo Users and Orders
```bash
npm run seed
```
Demo accounts created:
- **student** / `password123` (3 sample orders)
- **demo_user** / `password123` (2 sample orders)

### Step 4: Start All Services & Gateway
In the root directory, simply run:
```bash
npm start
```
The Gateway will start on `http://localhost:8000` and automatically boot all downstream microservices (ports 5001, 5002, 5003)!

### Step 5: Start the Frontend UI
In a separate terminal:
```bash
cd frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser!

---

## 5. How to Deploy to Vercel (Step-by-Step)

This repository is already configured with `vercel.json` and `api/index.js` for instant deployment.

### Option A: Deploy via Vercel CLI
1. Log in to Vercel CLI:
   ```bash
   npx vercel login
   ```
2. Deploy the project:
   ```bash
   npx vercel
   ```
3. When prompted:
   - **Set up and deploy?** -> `Y`
   - **Which scope?** -> select your Vercel account
   - **Link to existing project?** -> `N`
   - **Project name?** -> press Enter
   - **Directory located?** -> `./` (root)
   - **Want to modify settings?** -> `N`
4. Deploy to production:
   ```bash
   npx vercel --prod
   ```

### Option B: Deploy via GitHub (Vercel Web Dashboard)
1. Push this project to your GitHub repository.
2. Go to [vercel.com](https://vercel.com/) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Set **Environment Variables** in the Vercel dashboard:
   - `JWT_SECRET`: `supersecretkey123`
   - `AWS_REGION`: `us-east-1`
   - `AWS_ACCESS_KEY_ID`: Your AWS access key
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
   - `AWS_SESSION_TOKEN`: Your AWS session token (if using AWS Academy)
   - `DYNAMODB_USERS_TABLE`: `ssd_users`
   - `DYNAMODB_ORDERS_TABLE`: `ssd_orders`
5. Click **"Deploy"**!

Vercel will automatically build the React Vite frontend to `frontend/dist` and run the API Gateway through `api/index.js` serverless function.

---

## 6. Testing 1-Click Server Stops & Errors

1. Open the UI at `http://localhost:5173`.
2. Go to the **"Server Controls"** tab (or check the overview cards).
3. Find **User Service (Port 5002)** and click **"Stop Server"**.
4. The service socket genuinely closes, and its status changes to **STOPPED (Port Closed)**.
5. Click **"Test & Inspect Error"**:
   - The Gateway immediately returns `503 Service Unavailable`.
   - The UI displays the red error card showing:
     - Status: `HTTP 503 (ECONNREFUSED)`
     - Message: *"Target http://localhost:5002 refused connection. The microservice server is stopped or offline."*
6. Click **"Start Server"**:
   - Port 5002 reopens.
   - Click **"Test & Inspect Error"** again -> Instant **HTTP 200 OK**!

---

## 7. Automated Test Suite

Run the 13-point integration test suite verifying DynamoDB persistence, token authentication, header sanitization, data isolation, and 1-click server stop/restart:

```bash
npm test
```
### Verified Test Cases:
1. **Successful registration**: Validates 201 response, safe fields, and password hash omission.
2. **Duplicate registration rejection**: Validates 409 Conflict when username or email already exists.
3. **Successful login**: Validates 200 OK, signed JWT format, and `sub` claim matching database `id`.
4. **Incorrect password rejection**: Validates 401 Unauthorized for mismatched credentials.
5. **Missing JWT rejection on protected endpoints**: Validates 401 Unauthorized when Authorization header is absent.
6. **Expired JWT rejection**: Validates 401 Unauthorized with `"Token has expired"` message.
7. **User A receives User A's profile**: Confirms User A sees only their profile data.
8. **User B receives User B's profile**: Confirms User B sees distinct profile data.
9. **User A cannot access User B's private order**: Confirms 404 Not Found prevents order discovery.
10. **Order persists after service restart**: Confirms order remains intact in database after Order Service cycle.
11. **Stopped downstream service returns controlled 503**: Confirms gateway resilience when a target is offline.
12. **Route matching & path rewriting**: Confirms public bypass and prefix stripping work accurately.
13. **1-Click Server Stop and Start from UI Control API**: Confirms live microservice process stopping and resumption.

Result: **13 passing tests**, 0 failing.

---

## 8. Security Considerations & Academic Limitations

- **Header Injection Defense**: The gateway explicitly strips client-supplied `X-Authenticated-User` headers before forwarding. In an enterprise production deployment, mutual TLS (mTLS) or internal service-to-service HMAC signatures should be used to ensure downstream microservices cannot be called directly over the local network by unauthorized processes.
- **Token Storage**: In this educational demo, JWTs are stored in `localStorage` for rapid developer inspection. In production, `HttpOnly`, `Secure`, `SameSite=Strict` cookies are recommended to prevent client-side XSS access to tokens.
- **Downstream Network Boundary**: The microservices currently listen on `0.0.0.0` for local demo flexibility. In a production cluster, microservices should be placed in a private VPC subnet accessible only by the gateway's IP.
