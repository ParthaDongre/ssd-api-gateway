# Dynamic L7 API Gateway & Reverse Proxy

A Node.js and Express-based Layer 7 API Gateway featuring dynamic routing, JWT authentication, reverse proxying, path rewriting, hot configuration reloads, and downstream failure handling.

## Requirements

- Node.js 18 or newer
- npm
- cURL or Postman

## Architecture

| Component | Port | Purpose |
|---|---:|---|
| API Gateway | 8000 | Request routing, JWT validation, proxying |
| Auth Service | 5001 | Login, registration, JWT issuance |
| User Service | 5002 | User profile endpoints |
| Order Service | 5003 | Order history endpoints |

## Installation

Open a terminal in the `ssd-api-gateway` directory.

```bash
npm install
```

Confirm that `.env` contains:

```dotenv
PORT=8000
JWT_SECRET=supersecretkey123
JWT_EXPIRES_IN=1h
```

## Start the application

Open four terminals in the project directory.

**Terminal 1 — Authentication service**

```bash
npm run auth
```

**Terminal 2 — User service**

```bash
npm run users
```

**Terminal 3 — Order service**

```bash
npm run orders
```

**Terminal 4 — API Gateway**

```bash
npm run dev
```

Use `npm start` instead of `npm run dev` when you do not need nodemon.

## API endpoints

| Method | Gateway endpoint | Authentication |
|---|---|---|
| GET | `/health` | Public |
| POST | `/api/v1/auth/login` | Public |
| POST | `/api/v1/auth/register` | Public |
| GET | `/api/v1/auth/health` | Public |
| GET | `/api/v1/users/health` | Public |
| GET | `/api/v1/orders/health` | Public |
| GET | `/api/v1/users/profile` | JWT required |
| GET | `/api/v1/users/users/:id` | JWT required |
| GET | `/api/v1/orders/history` | JWT required |
| GET | `/api/v1/orders/:orderId` | JWT required |

The demo login credentials are:

- Username: `student`
- Password: `password123`

## Test 1: Gateway health

```bash
curl http://localhost:8000/health
```

Expected response: HTTP 200 with gateway status `healthy`.

## Test 2: Login and obtain a JWT

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"student\",\"password\":\"password123\"}"
```

Copy the `token` value from the JSON response.

For Bash, save the token to a shell variable:

```bash
TOKEN="paste_your_token_here"
```

For PowerShell:

```powershell
$TOKEN = "paste_your_token_here"
```

## Test 3: Access the protected user profile

Bash:

```bash
curl http://localhost:8000/api/v1/users/profile \
  -H "Authorization: Bearer $TOKEN"
```

PowerShell:

```powershell
curl.exe http://localhost:8000/api/v1/users/profile `
  -H "Authorization: Bearer $TOKEN"
```

Expected result: HTTP 200 with the mock user profile and authenticated username.

## Test 4: Access order history

Bash:

```bash
curl http://localhost:8000/api/v1/orders/history \
  -H "Authorization: Bearer $TOKEN"
```

PowerShell:

```powershell
curl.exe http://localhost:8000/api/v1/orders/history `
  -H "Authorization: Bearer $TOKEN"
```

Expected result: HTTP 200 with three mock orders.

## Test 5: Missing JWT

```bash
curl -i http://localhost:8000/api/v1/users/profile
```

Expected status: `401 Unauthorized`.

```json
{
  "error": "Authorization token is required",
  "status": 401
}
```

## Test 6: Invalid JWT

```bash
curl -i http://localhost:8000/api/v1/users/profile \
  -H "Authorization: Bearer invalid.token.value"
```

Expected status: `403 Forbidden`.

## Test 7: Public endpoint bypass

```bash
curl http://localhost:8000/api/v1/auth/health
```

Expected result: HTTP 200 without an Authorization header.

The public bypass is controlled by `publicPaths` in `config/routes.json`.

## Test 8: Dynamic routing hot reload

1. Keep all four terminal sessions running.
2. Open `config/routes.json`.
3. Change the user service target from:

   `"target": "http://localhost:5002"`

   to:

   `"target": "http://localhost:5999"`

4. Save the file.
5. Observe the gateway terminal for a successful configuration reload.
6. Make a protected request using a valid token:

```bash
curl -i http://localhost:8000/api/v1/users/profile \
  -H "Authorization: Bearer $TOKEN"
```

Expected result: HTTP 503 because nothing is listening on port 5999.

Restore the target to port `5002` and save again. The gateway should resume routing to the user service without restarting.

### Invalid JSON test

While the gateway is running, temporarily replace `config/routes.json` with:

```json
{
  "routes":
```

Save the file. The gateway should log a configuration reload warning and retain its last-known-good routing table. Restore the valid JSON configuration afterwards.

## Test 9: Downstream crash resilience

1. Restore the order service target to port `5003`.
2. Confirm that the order history endpoint works.
3. Stop the order service using `Ctrl+C` in Terminal 3.
4. Send another request:

```bash
curl -i http://localhost:8000/api/v1/orders/history \
  -H "Authorization: Bearer $TOKEN"
```

Expected status: `503 Service Unavailable`.

```json
{
  "error": "Downstream Service Unavailable",
  "status": 503
}
```

The gateway should continue running. Restart the order service with:

```bash
npm run orders
```

Subsequent requests should work again.

## Implementation notes

- Route resolution uses longest-prefix matching.
- Prefix stripping is controlled by each route's `stripPrefix` setting.
- Public paths are configured per route.
- Invalid configuration reloads do not replace the active routing table.
- Proxy errors are handled without exposing stack traces to clients.
- Request bodies are streamed to downstream services without gateway-side JSON parsing.
- JWT verification is performed at the gateway edge.
- The mock services use in-memory demonstration data.

## Limitations and production hardening

This project demonstrates gateway architecture for an academic SSD project. Before production deployment, add persistent user storage, password hashing, rate limiting, request-size limits, structured logging, metrics, TLS, a secrets manager, stricter authorization policies, and automated integration tests.

The mock authentication service stores credentials in memory and compares passwords directly. It is not suitable for real user accounts. The provided shared JWT secret must also be replaced with a strong secret before deployment.