module.exports = [
"[turbopack-node]/transforms/postcss.ts?config=[project]/docs/postcss.config.mjs { CONFIG => \"[project]/docs/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "chunks/05lm_1kurx5b._.js",
  "chunks/[root-of-the-server]__1wqvo07._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[turbopack-node]/transforms/postcss.ts?config=[project]/docs/postcss.config.mjs { CONFIG => \"[project]/docs/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript)");
    });
});
}),
];