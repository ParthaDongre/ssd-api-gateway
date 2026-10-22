const { createProxyMiddleware } = require("http-proxy-middleware");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createRouteProxy(route) {
  const prefixPattern = new RegExp(
    `^${escapeRegExp(route.prefix)}(?=/|\\?|$)`
  );

  return createProxyMiddleware({
    target: route.target,
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: 10000,
    timeout: 15000,

    pathRewrite: (requestPath) => {
      if (!route.stripPrefix) {
        return requestPath;
      }

      const rewrittenPath = requestPath.replace(prefixPattern, "");

      if (!rewrittenPath || rewrittenPath.startsWith("?")) {
        return `/${rewrittenPath}`;
      }

      return rewrittenPath;
    },

    on: {
      proxyReq: (proxyReq, req) => {
        if (req.user && req.user.sub) {
          proxyReq.setHeader("X-Authenticated-User", String(req.user.sub));
        }
      },

      proxyRes: (proxyRes, req) => {
        console.log(
          `[Proxy] ${req.method} ${req.originalUrl} -> ` +
          `${route.target} [${proxyRes.statusCode}]`
        );
      },

      error: (error, req, res) => {
        console.error(
          `[Proxy] Downstream error for ${req.method} ${req.originalUrl}:`,
          error.code || error.message
        );

        if (res.destroyed || res.writableEnded) {
          return;
        }

        if (res.headersSent) {
          res.destroy();
          return;
        }

        res.statusCode = 503;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");

        res.end(
          JSON.stringify({
            error: "Downstream Service Unavailable",
            status: 503
          })
        );
      }
    }
  });
}

function forwardRequest(req, res, route) {
  const proxy = createRouteProxy(route);

  proxy(req, res, (error) => {
    if (error) {
      console.error("[Proxy] Middleware error:", error.message);

      if (!res.headersSent && !res.writableEnded) {
        res.status(503).json({
          error: "Downstream Service Unavailable",
          status: 503
        });
      }

      return;
    }

    if (!res.headersSent && !res.writableEnded) {
      res.status(404).json({
        error: "Downstream route not handled",
        status: 404
      });
    }
  });
}

module.exports = {
  forwardRequest
};