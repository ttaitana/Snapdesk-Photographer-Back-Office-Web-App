// apps/web needs its own eslint.config.mjs — flat config loads only the
// nearest config file to cwd, so this app can't passively inherit the root
// config the way the old .eslintrc cascading worked. Instead, explicitly
// import the shared root rules and layer Next's core-web-vitals rules
// (React hooks, next/image, next/link, etc.) on top, scoped to this app.
import nextVitals from "eslint-config-next/core-web-vitals";
import rootConfig from "../../eslint.config.mjs";

export default [
  ...rootConfig,
  ...nextVitals,
  {
    // eslint-plugin-react's React-version auto-detection (used by rules like
    // react/display-name) still calls the deprecated context.getFilename(),
    // which ESLint 10 removed outright — that crashes the whole lint run
    // ("contextOrFilename.getFilename is not a function"). Detection only
    // runs when no version is configured, so setting it explicitly (matches
    // apps/web/package.json's react dependency) skips that code path
    // entirely rather than waiting on an upstream eslint-plugin-react fix.
    settings: { react: { version: "19.0.0" } },
  },
];
