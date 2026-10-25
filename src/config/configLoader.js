const fs = require("node:fs");
const path = require("node:path");

const CONFIG_PATH = path.resolve(
  __dirname,
  "../../config/routes.json"
);

let activeRoutes = Object.freeze({});
let watcher = null;
let debounceTimer = null;
let reloadInProgress = false;
let reloadRequested = false;

function normalizePath(value) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    throw new Error(`Invalid route path: ${String(value)}`);
  }

  if (value.includes("?") || value.includes("#")) {
    throw new Error(`Route paths cannot contain query strings or fragments: ${value}`);
  }

  if (value !== "/" && value.endsWith("/")) {
    return value.replace(/\/+$/, "");
  }

  return value;
}

function validateTarget(target, routePrefix) {
  let parsed;

  try {
    parsed = new URL(target);
  } catch {
    throw new Error(`Invalid target URL for route ${routePrefix}`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Unsupported target protocol for route ${routePrefix}`);
  }

  if (parsed.username || parsed.password) {
    throw new Error(`Credentials must not be embedded in the target URL: ${routePrefix}`);
  }

  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error(
      `Target must contain only scheme and origin, without a path, query, or fragment: ${routePrefix}`
    );
  }

  return parsed.origin;
}

function validateConfig(parsed) {
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    !parsed.routes ||
    typeof parsed.routes !== "object" ||
    Array.isArray(parsed.routes)
  ) {
    throw new Error('Configuration must contain a "routes" object.');
  }

  const nextRoutes = {};

  for (const [rawPrefix, rawConfig] of Object.entries(parsed.routes)) {
    const prefix = normalizePath(rawPrefix);

    if (
      !rawConfig ||
      typeof rawConfig !== "object" ||
      Array.isArray(rawConfig)
    ) {
      throw new Error(`Route configuration must be an object: ${prefix}`);
    }

    if (typeof rawConfig.target !== "string") {
      throw new Error(`Missing target URL for route: ${prefix}`);
    }

    const target = validateTarget(rawConfig.target, prefix);

    if (
      rawConfig.stripPrefix !== undefined &&
      typeof rawConfig.stripPrefix !== "boolean"
    ) {
      throw new Error(`stripPrefix must be a boolean: ${prefix}`);
    }

    const publicPaths = rawConfig.publicPaths ?? [];

    if (
      !Array.isArray(publicPaths) ||
      publicPaths.some((item) => typeof item !== "string")
    ) {
      throw new Error(`publicPaths must be an array of strings: ${prefix}`);
    }

    const normalizedPublicPaths = publicPaths.map(normalizePath);

    nextRoutes[prefix] = Object.freeze({
      prefix,
      target,
      stripPrefix: rawConfig.stripPrefix !== false,
      publicPaths: Object.freeze(normalizedPublicPaths)
    });
  }

  if (Object.keys(nextRoutes).length === 0) {
    throw new Error("At least one route must be configured.");
  }

  return Object.freeze(nextRoutes);
}

function loadRoutes() {
  const fileContent = fs.readFileSync(CONFIG_PATH, "utf8");
  const parsed = JSON.parse(fileContent);

  return validateConfig(parsed);
}

function reloadRoutes() {
  if (reloadInProgress) {
    reloadRequested = true;
    return;
  }

  reloadInProgress = true;

  try {
    do {
      reloadRequested = false;

      try {
        const nextRoutes = loadRoutes();

        // Replace the active table only after the entire file validates.
        activeRoutes = nextRoutes;

        console.log(
          `[Config] Successfully loaded ${Object.keys(activeRoutes).length} routes.`
        );
      } catch (error) {
        console.warn(
          `[Config] Reload rejected; keeping last-known-good routes: ${error.message}`
        );
      }
    } while (reloadRequested);
  } finally {
    reloadInProgress = false;
  }
}

function startWatching() {
  if (watcher) {
    return;
  }

  watcher = fs.watch(CONFIG_PATH, (eventType) => {
    if (eventType !== "change" && eventType !== "rename") {
      return;
    }

    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      // Editors sometimes replace the file rather than modifying it.
      // A rename can invalidate the old watch handle, so reattach it.
      if (eventType === "rename") {
        try {
          watcher.close();
        } catch {
          // The watcher may already be closed.
        }

        watcher = null;

        if (!fs.existsSync(CONFIG_PATH)) {
          console.warn(
            "[Config] Route file temporarily unavailable; retaining active routes."
          );

          return;
        }

        startWatching();
      }

      reloadRoutes();
    }, 200);
  });

  watcher.on("error", (error) => {
    console.warn(`[Config] File watcher error: ${error.message}`);
  });

  console.log(`[Config] Watching ${CONFIG_PATH}`);
}

function initializeConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Route configuration not found: ${CONFIG_PATH}`);
  }

  // Initial configuration errors are fatal. Later reload errors are not.
  activeRoutes = loadRoutes();
  startWatching();

  console.log(
    `[Config] Initialized with ${Object.keys(activeRoutes).length} routes.`
  );
}

function resolveRoute(requestPath) {
  const normalizedPath =
    requestPath.length > 1
      ? requestPath.replace(/\/+$/, "")
      : requestPath;

  const prefixes = Object.keys(activeRoutes).sort(
    (a, b) => b.length - a.length
  );

  for (const prefix of prefixes) {
    if (
      normalizedPath === prefix ||
      normalizedPath.startsWith(`${prefix}/`)
    ) {
      const route = activeRoutes[prefix];

      const downstreamPath = route.stripPrefix
        ? normalizedPath.slice(prefix.length) || "/"
        : normalizedPath;

      return {
        ...route,
        downstreamPath
      };
    }
  }

  return null;
}

function stopWatching() {
  clearTimeout(debounceTimer);

  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

function getActiveRoutes() {
  return JSON.parse(JSON.stringify(activeRoutes));
}

module.exports = {
  initializeConfig,
  resolveRoute,
  stopWatching,
  getActiveRoutes
};