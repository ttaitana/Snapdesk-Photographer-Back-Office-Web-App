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
    // react/display-name) calls the deprecated context.getFilename(), which
    // ESLint 10 removes outright (crashes with "contextOrFilename.getFilename
    // is not a function"). We're pinned back to ESLint 9.x for now (see the
    // comment in ../../eslint.config.mjs re: typescript-eslint's missing
    // addGlobals), so this specific crash isn't live today — but detection
    // only runs when no version is configured, so setting it explicitly
    // (matches apps/web/package.json's react dependency) skips that code
    // path entirely and keeps this ready for whenever we move back to v10.
    settings: { react: { version: "19.0.0" } },
  },
];
