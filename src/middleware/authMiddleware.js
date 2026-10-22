const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const route = req.gatewayRoute;

  if (!route) {
    return res.status(404).json({
      error: "Route Not Found",
      status: 404
    });
  }

  const downstreamPath = route.downstreamPath || "/";

  if (route.publicPaths.includes(downstreamPath)) {
    return next();
  }

  const authorization = req.get("Authorization");

  if (!authorization) {
    return res.status(401).json({
      error: "Authorization token is required",
      status: 401
    });
  }

  const match = authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return res.status(401).json({
      error: "Authorization header must use Bearer token format",
      status: 401
    });
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error("[Auth] JWT_SECRET is not configured.");

    return res.status(500).json({
      error: "Authentication service configuration error",
      status: 500
    });
  }

  try {
    const decoded = jwt.verify(match[1], secret, {
      algorithms: ["HS256"]
    });

    req.user = decoded;

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token has expired",
        status: 401
      });
    }

    return res.status(403).json({
      error: "Invalid authentication token",
      status: 403
    });
  }
}

module.exports = authMiddleware;