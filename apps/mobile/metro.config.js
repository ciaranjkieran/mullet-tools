const { getDefaultConfig } = require("@expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(__dirname, "../../");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Fix monorepo issue: when expo is hoisted to the workspace root,
// expo/AppEntry.js imports "../../App" which resolves relative to
// the root node_modules instead of the project directory.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Redirect "../../App" from hoisted expo/AppEntry.js to our App
  if (
    moduleName === "../../App" &&
    context.originModulePath.replace(/\\/g, "/").includes("node_modules/expo")
  ) {
    return {
      filePath: path.resolve(projectRoot, "App.tsx"),
      type: "sourceFile",
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
