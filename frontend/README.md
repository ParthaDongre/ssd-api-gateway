# GateFlow — API Gateway UI

React + Vite UI for the existing Dynamic L7 API Gateway project.

## Run
1. Start the gateway and mock services as usual (gateway on port 8000).
2. Open a terminal in this `frontend` folder.
3. Run `npm install`
4. Run `npm run dev`
5. Open `http://localhost:5173`.

Demo login: `student` / `password123`.

The Vite development proxy sends `/api/*` requests to `http://localhost:8000`. The UI expects login fields `username` and `password` and a response containing `token`, `accessToken`, or `access_token`. Adjust `src/App.jsx` if your backend response uses different names.

Includes login and sign-up (using the existing /api/v1/auth/register endpoint), service health checks, API playground, response viewer and a routing table summary. Routing table is informational; edit the backend `config/routes.json` to change actual routing. This UI does not add a database.
