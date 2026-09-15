// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
/** The repository root, where the shared src/core and src/data live. */
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// The game logic and word data are shared with the web app rather than copied, so
// Metro has to watch the repository root and be allowed to resolve into it.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// NOTE: do not set resolver.disableHierarchicalLookup here. It is the usual monorepo
// guard against resolving two copies of React, but this app has its own full
// node_modules tree and the repository root has no React at all, so the guard buys
// nothing — and it breaks packages nested inside node_modules/expo/node_modules.

// `@core/score` and `@data/words.5.json` instead of ../../src/core/score.
config.resolver.extraNodeModules = {
  '@core': path.resolve(workspaceRoot, 'src/core'),
  '@store': path.resolve(workspaceRoot, 'src/store'),
  '@data': path.resolve(workspaceRoot, 'src/data'),
};

const defaultResolve = config.resolver.resolveRequest;

/**
 * src/core is written as Node-style ESM: its internal imports carry explicit `.js`
 * extensions that actually point at `.ts` sources ('./types.js' -> types.ts). Vite,
 * vitest and tsx all remap that; Metro does not, and fails the bundle. Strip the
 * extension and let Metro's own sourceExts find the TypeScript file.
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = defaultResolve ?? context.resolveRequest;
  if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    try {
      return resolve(context, moduleName.replace(/\.js$/, ''), platform);
    } catch {
      // Fall through: a real .js file that genuinely exists still resolves below.
    }
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
