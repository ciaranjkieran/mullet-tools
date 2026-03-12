// Reads static config from app.json and injects EAS environment variables.
// In EAS builds, process.env.API_URL is set per build profile in eas.json.

const appJson = require("./app.json");

module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      apiUrl:
        process.env.API_URL ??
        appJson.expo.extra.apiUrl,
    },
  };
};
