// SUPERSEDED — do not use.
//
// This legacy .eslintrc.cjs has been replaced by eslint.config.mjs (ESLint 10
// flat config). It could not be physically deleted from the automation
// session that performed this migration (the sandbox's file mount rejected
// the delete with "Operation not permitted" despite normal permissions), so
// its contents were stubbed out here instead.
//
// ESLint 10 with flat config does not read .eslintrc.* files at all once an
// eslint.config.* file is present, so this file is inert and safe to leave —
// but please delete it manually next time you have a terminal open:
//
//   rm .eslintrc.cjs apps/web/.eslintrc.json
//
// See eslint.config.mjs and apps/web/eslint.config.mjs for the real config.
module.exports = {};
