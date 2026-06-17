// apps/web needs its own eslint.config.mjs — flat config loads only the
// nearest config file to cwd, so this app can't passively inherit the root
// config the way the old .eslintrc cascading worked. Instead, explicitly
// import the shared root rules and layer Next's core-web-vitals rules
// (React hooks, next/image, next/link, etc.) on top, scoped to this app.
import nextVitals from "eslint-config-next/core-web-vitals";
import rootConfig from "../../eslint.config.mjs";

export default [...rootConfig, ...nextVitals];
