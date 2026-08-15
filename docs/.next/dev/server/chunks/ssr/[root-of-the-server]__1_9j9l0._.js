module.exports = [
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/docs/app/docs/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "default",
    ()=>IntroductionPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/docs/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$components$2f$DocPage$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/docs/components/DocPage.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$components$2f$CodeBlock$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/docs/components/CodeBlock.tsx [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$components$2f$CodeBlock$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$components$2f$CodeBlock$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
const SNIPPET = `import { createClient, anthropic, defineTool } from "samai-sdk";
import { z } from "zod";

const getWeather = defineTool({
  name: "get_weather",
  description: "Get current weather for a city",
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => ({ city, tempC: 28, condition: "sunny" }),
});

const client = createClient({
  provider: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
});

const result = await client.generate({
  model: "claude-sonnet-4-6",
  system: "You are a concise assistant.",
  messages: [{ role: "user", content: "What's the weather in Chennai?" }],
  tools: [getWeather],
  maxToolRoundtrips: 2,
});

console.log(result.text);`;
function IntroductionPage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$components$2f$DocPage$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["DocPage"], {
                eyebrow: "Getting started",
                title: "Introduction",
                description: "samai-sdk is a TypeScript agent SDK that unifies 8 model providers behind one interface, then layers the agent runtime — tool calling, handoffs, guardrails, sessions, tracing — on top.",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        children: "Most SDKs for working with language models stop at the API call: send messages, get a completion, maybe call a tool. Everything past that — validating tool arguments, deciding when to hand a conversation off to a specialist, blocking a jailbreak attempt, remembering what a user said last week, figuring out why a run failed at 2am — gets rebuilt by hand, differently, in every project that needs it."
                    }, void 0, false, {
                        fileName: "[project]/docs/app/docs/page.tsx",
                        lineNumber: 36,
                        columnNumber: 7
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        children: [
                            "samai-sdk starts from the assumption that you'll eventually need that layer, so it ships with the runtime already wired in, on top of a single ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                children: "Provider"
                            }, void 0, false, {
                                fileName: "[project]/docs/app/docs/page.tsx",
                                lineNumber: 47,
                                columnNumber: 18
                            }, this),
                            " interface implemented identically by Anthropic, OpenAI, Google Gemini, AWS Bedrock, Groq, Mistral, Azure OpenAI, and Ollama."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/docs/app/docs/page.tsx",
                        lineNumber: 44,
                        columnNumber: 7
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        id: "one-call",
                        children: "A single call, fully wired"
                    }, void 0, false, {
                        fileName: "[project]/docs/app/docs/page.tsx",
                        lineNumber: 52,
                        columnNumber: 7
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        children: [
                            "A tool, a provider, and a generate call — this is the whole surface area for a basic agent. Swapping ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                children: "anthropic()"
                            }, void 0, false, {
                                fileName: "[project]/docs/app/docs/page.tsx",
                                lineNumber: 55,
                                columnNumber: 42
                            }, this),
                            " for",
                            " ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                children: "openai()"
                            }, void 0, false, {
                                fileName: "[project]/docs/app/docs/page.tsx",
                                lineNumber: 56,
                                columnNumber: 9
                            }, this),
                            " later changes nothing else."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/docs/app/docs/page.tsx",
                        lineNumber: 53,
                        columnNumber: 7
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$components$2f$CodeBlock$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CodeBlock"], {
                        code: SNIPPET,
                        lang: "ts",
                        label: "quick-look.ts"
                    }, void 0, false, {
                        fileName: "[project]/docs/app/docs/page.tsx",
                        lineNumber: 58,
                        columnNumber: 7
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        id: "what-you-get",
                        children: "What's actually in the box"
                    }, void 0, false, {
                        fileName: "[project]/docs/app/docs/page.tsx",
                        lineNumber: 60,
                        columnNumber: 7
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                        children: "One interface, 8 providers"
                                    }, void 0, false, {
                                        fileName: "[project]/docs/app/docs/page.tsx",
                                        lineNumber: 63,
                                        columnNumber: 11
                                    }, this),
                                    " — Anthropic, OpenAI, Google, AWS Bedrock, Groq, Mistral, Azure OpenAI, and Ollama, all implementing the same ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                        children: "Provider"
                                    }, void 0, false, {
                                        fileName: "[project]/docs/app/docs/page.tsx",
                                        lineNumber: 65,
                                        columnNumber: 33
                                    }, this),
                                    " contract."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/docs/app/docs/page.tsx",
                                lineNumber: 62,
                                columnNumber: 9
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                        children: "A real agent runtime"
                                    }, void 0, false, {
                                        fileName: "[project]/docs/app/docs/page.tsx",
                                        lineNumber: 68,
                                        columnNumber: 11
                                    }, this),
                                    " —",
                                    " ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                        children: "defineAgent()"
                                    }, void 0, false, {
                                        fileName: "[project]/docs/app/docs/page.tsx",
                                        lineNumber: 69,
                                        columnNumber: 11
                                    }, this),
                                    ", multi-agent handoffs with loop prevention, and a run loop that owns tool execution itself so behavior doesn't vary by provider."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/docs/app/docs/page.tsx",
                                lineNumber: 67,
                                columnNumber: 9
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                        children: "Guardrails and approval"
                                    }, void 0, false, {
                                        fileName: "[project]/docs/app/docs/page.tsx",
                                        lineNumber: 74,
                                        columnNumber: 11
                                    }, this),
                                    " — PII redaction, prompt-injection blocking, budget caps, schema validation on output, and a fail-closed approval gate for risky tools."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/docs/app/docs/page.tsx",
                                lineNumber: 73,
                                columnNumber: 9
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                        children: "Typed tools"
                                    }, void 0, false, {
                                        fileName: "[project]/docs/app/docs/page.tsx",
                                        lineNumber: 79,
                                        columnNumber: 11
                                    }, this),
                                    " — ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                        children: "defineTool()"
                                    }, void 0, false, {
                                        fileName: "[project]/docs/app/docs/page.tsx",
                                        lineNumber: 79,
                                        columnNumber: 42
                                    }, this),
                                    " infers argument types from a zod or valibot schema, and validates incoming args before your code runs."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/docs/app/docs/page.tsx",
                                lineNumber: 78,
                                columnNumber: 9
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                        children: "Sessions, RAG, MCP, and graph memory"
                                    }, void 0, false, {
                                        fileName: "[project]/docs/app/docs/page.tsx",
                                        lineNumber: 84,
                                        columnNumber: 11
                                    }, this),
                                    " — in-memory, file, Redis, or SQLite session persistence; a retrieval pipeline for grounding agents in your documents; a client for any MCP server; and a Neo4j-backed per-user knowledge graph for long-term memory that survives across sessions."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/docs/app/docs/page.tsx",
                                lineNumber: 83,
                                columnNumber: 9
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                        children: "Production concerns, not afterthoughts"
                                    }, void 0, false, {
                                        fileName: "[project]/docs/app/docs/page.tsx",
                                        lineNumber: 91,
                                        columnNumber: 11
                                    }, this),
                                    " — retries, fallback chains, timeouts, concurrency/rate limiting, checkpoint resume, and full run tracing with an OpenTelemetry export and a local HTML trace viewer."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/docs/app/docs/page.tsx",
                                lineNumber: 90,
                                columnNumber: 9
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/docs/app/docs/page.tsx",
                        lineNumber: 61,
                        columnNumber: 7
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$components$2f$DocPage$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Callout"], {
                        tone: "signal",
                        title: "Where to go next",
                        children: [
                            "If you just want the code running,",
                            " ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: "/docs/quick-start",
                                children: "Quick start"
                            }, void 0, false, {
                                fileName: "[project]/docs/app/docs/page.tsx",
                                lineNumber: 100,
                                columnNumber: 9
                            }, this),
                            " gets you there fastest. For a tour of what a production agent actually needs, start with",
                            " ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: "/docs/agents",
                                children: "Agents, handoffs & sessions"
                            }, void 0, false, {
                                fileName: "[project]/docs/app/docs/page.tsx",
                                lineNumber: 102,
                                columnNumber: 9
                            }, this),
                            "."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/docs/app/docs/page.tsx",
                        lineNumber: 98,
                        columnNumber: 7
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/docs/app/docs/page.tsx",
                lineNumber: 31,
                columnNumber: 5
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$components$2f$DocPage$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["DocPager"], {
                current: "/docs"
            }, void 0, false, {
                fileName: "[project]/docs/app/docs/page.tsx",
                lineNumber: 105,
                columnNumber: 5
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/docs/app/docs/page.tsx",
        lineNumber: 30,
        columnNumber: 5
    }, this);
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/docs/app/docs/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", (function(__turbopack_context__){

__turbopack_context__.n(__turbopack_context__.i("[project]/docs/app/docs/page.tsx [app-rsc] (ecmascript)"));
}),
"[project]/docs/app/favicon.ico (static in ecmascript, tag client)", ((__turbopack_context__) => {

__turbopack_context__.v("/_next/static/media/favicon.2vob68tjqpejf.ico" + (globalThis["NEXT_CLIENT_ASSET_SUFFIX"] || ''));}),
"[project]/docs/app/favicon.ico.mjs { IMAGE => \"[project]/docs/app/favicon.ico (static in ecmascript, tag client)\" } [app-rsc] (structured image object, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$app$2f$favicon$2e$ico__$28$static__in__ecmascript$2c$__tag__client$29$__ = __turbopack_context__.i("[project]/docs/app/favicon.ico (static in ecmascript, tag client)");
;
const __TURBOPACK__default__export__ = {
    src: __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$app$2f$favicon$2e$ico__$28$static__in__ecmascript$2c$__tag__client$29$__["default"],
    width: 256,
    height: 256
};
}),
"[project]/docs/components/CodeBlock.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "CodeBlock",
    ()=>CodeBlock
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/docs/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$shiki__$5b$external$5d$__$28$shiki$2c$__esm_import$2c$__$5b$project$5d2f$docs$2f$node_modules$2f$shiki$29$__ = __turbopack_context__.i("[externals]/shiki [external] (shiki, esm_import, [project]/docs/node_modules/shiki)");
var __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$components$2f$CopyButton$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/docs/components/CopyButton.tsx [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$shiki__$5b$external$5d$__$28$shiki$2c$__esm_import$2c$__$5b$project$5d2f$docs$2f$node_modules$2f$shiki$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$shiki__$5b$external$5d$__$28$shiki$2c$__esm_import$2c$__$5b$project$5d2f$docs$2f$node_modules$2f$shiki$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
async function CodeBlock({ code, lang = "ts", label, className = "" }) {
    const trimmed = code.trim();
    const html = await (0, __TURBOPACK__imported__module__$5b$externals$5d2f$shiki__$5b$external$5d$__$28$shiki$2c$__esm_import$2c$__$5b$project$5d2f$docs$2f$node_modules$2f$shiki$29$__["codeToHtml"])(trimmed, {
        lang,
        theme: "vitesse-dark"
    });
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `w-full max-w-full overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--bg-panel)] ${className}`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--bg-panel-raised)] px-3 py-2 sm:px-4 sm:py-2.5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex min-w-0 items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex shrink-0 gap-1.5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "h-2.5 w-2.5 rounded-full bg-[var(--line-strong)]"
                                    }, void 0, false, {
                                        fileName: "[project]/docs/components/CodeBlock.tsx",
                                        lineNumber: 28,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "h-2.5 w-2.5 rounded-full bg-[var(--line-strong)]"
                                    }, void 0, false, {
                                        fileName: "[project]/docs/components/CodeBlock.tsx",
                                        lineNumber: 29,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "h-2.5 w-2.5 rounded-full bg-[var(--line-strong)]"
                                    }, void 0, false, {
                                        fileName: "[project]/docs/components/CodeBlock.tsx",
                                        lineNumber: 30,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/docs/components/CodeBlock.tsx",
                                lineNumber: 27,
                                columnNumber: 11
                            }, this),
                            label && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "label-eyebrow min-w-0 truncate text-[var(--text-muted)]",
                                children: label
                            }, void 0, false, {
                                fileName: "[project]/docs/components/CodeBlock.tsx",
                                lineNumber: 33,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/docs/components/CodeBlock.tsx",
                        lineNumber: 26,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$components$2f$CopyButton$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CopyButton"], {
                        code: trimmed
                    }, void 0, false, {
                        fileName: "[project]/docs/components/CodeBlock.tsx",
                        lineNumber: 38,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/docs/components/CodeBlock.tsx",
                lineNumber: 25,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-full overflow-x-auto p-3 text-[12.5px] leading-[1.7] [&_pre]:!bg-transparent sm:p-4 sm:text-[13px] font-(family-name:--font-code)",
                style: {
                    fontFamily: "var(--font-code)"
                },
                dangerouslySetInnerHTML: {
                    __html: html
                }
            }, void 0, false, {
                fileName: "[project]/docs/components/CodeBlock.tsx",
                lineNumber: 40,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/docs/components/CodeBlock.tsx",
        lineNumber: 22,
        columnNumber: 5
    }, this);
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/docs/components/CopyButton.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CopyButton",
    ()=>CopyButton
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/docs/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const CopyButton = (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call CopyButton() from the server but CopyButton is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/docs/components/CopyButton.tsx", "CopyButton");
}),
"[project]/docs/components/CopyButton.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CopyButton",
    ()=>CopyButton
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/docs/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const CopyButton = (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call CopyButton() from the server but CopyButton is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/docs/components/CopyButton.tsx <module evaluation>", "CopyButton");
}),
"[project]/docs/components/CopyButton.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$components$2f$CopyButton$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/docs/components/CopyButton.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$components$2f$CopyButton$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/docs/components/CopyButton.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$components$2f$CopyButton$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/docs/components/DocPage.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Callout",
    ()=>Callout,
    "DocPage",
    ()=>DocPage,
    "DocPager",
    ()=>DocPager
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/docs/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/docs/node_modules/next/dist/client/app-dir/link.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__ = __turbopack_context__.i("[project]/docs/node_modules/lucide-react/dist/esm/icons/arrow-left.mjs [app-rsc] (ecmascript) <export default as ArrowLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__ = __turbopack_context__.i("[project]/docs/node_modules/lucide-react/dist/esm/icons/arrow-right.mjs [app-rsc] (ecmascript) <export default as ArrowRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$lib$2f$docs$2d$nav$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/docs/lib/docs-nav.ts [app-rsc] (ecmascript)");
;
;
;
;
function DocPage({ eyebrow, title, description, children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "label-eyebrow text-[var(--signal-400)]",
                children: eyebrow
            }, void 0, false, {
                fileName: "[project]/docs/components/DocPage.tsx",
                lineNumber: 18,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                className: "mt-3 text-3xl font-semibold tracking-tight sm:text-4xl",
                style: {
                    fontFamily: "var(--font-display)"
                },
                children: title
            }, void 0, false, {
                fileName: "[project]/docs/components/DocPage.tsx",
                lineNumber: 19,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-4 max-w-2xl text-[15.5px] leading-relaxed text-[var(--text-muted)]",
                children: description
            }, void 0, false, {
                fileName: "[project]/docs/components/DocPage.tsx",
                lineNumber: 25,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "my-10 h-px w-full bg-[var(--line)]"
            }, void 0, false, {
                fileName: "[project]/docs/components/DocPage.tsx",
                lineNumber: 28,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "docs-prose max-w-none",
                children: children
            }, void 0, false, {
                fileName: "[project]/docs/components/DocPage.tsx",
                lineNumber: 29,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/docs/components/DocPage.tsx",
        lineNumber: 17,
        columnNumber: 5
    }, this);
}
function DocPager({ current }) {
    const idx = __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$lib$2f$docs$2d$nav$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["DOCS_FLAT"].findIndex((d)=>d.href === current);
    const prev = idx > 0 ? __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$lib$2f$docs$2d$nav$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["DOCS_FLAT"][idx - 1] : null;
    const next = idx >= 0 && idx < __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$lib$2f$docs$2d$nav$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["DOCS_FLAT"].length - 1 ? __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$lib$2f$docs$2d$nav$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["DOCS_FLAT"][idx + 1] : null;
    if (!prev && !next) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mt-16 flex items-stretch justify-between gap-4 border-t border-[var(--line)] pt-8",
        children: [
            prev ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                href: prev.href,
                className: "group flex flex-1 flex-col gap-1 rounded-lg border border-[var(--line)] p-4 transition-colors hover:border-[var(--signal-500)]/40",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "flex items-center gap-1.5 text-xs text-[var(--text-faint)]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__["ArrowLeft"], {
                                size: 12
                            }, void 0, false, {
                                fileName: "[project]/docs/components/DocPage.tsx",
                                lineNumber: 49,
                                columnNumber: 13
                            }, this),
                            " previous"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/docs/components/DocPage.tsx",
                        lineNumber: 48,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]",
                        children: prev.label
                    }, void 0, false, {
                        fileName: "[project]/docs/components/DocPage.tsx",
                        lineNumber: 51,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/docs/components/DocPage.tsx",
                lineNumber: 44,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1"
            }, void 0, false, {
                fileName: "[project]/docs/components/DocPage.tsx",
                lineNumber: 56,
                columnNumber: 9
            }, this),
            next ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                href: next.href,
                className: "group flex flex-1 flex-col items-end gap-1 rounded-lg border border-[var(--line)] p-4 text-right transition-colors hover:border-[var(--signal-500)]/40",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "flex items-center gap-1.5 text-xs text-[var(--text-faint)]",
                        children: [
                            "next ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                size: 12
                            }, void 0, false, {
                                fileName: "[project]/docs/components/DocPage.tsx",
                                lineNumber: 64,
                                columnNumber: 18
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/docs/components/DocPage.tsx",
                        lineNumber: 63,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]",
                        children: next.label
                    }, void 0, false, {
                        fileName: "[project]/docs/components/DocPage.tsx",
                        lineNumber: 66,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/docs/components/DocPage.tsx",
                lineNumber: 59,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1"
            }, void 0, false, {
                fileName: "[project]/docs/components/DocPage.tsx",
                lineNumber: 71,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/docs/components/DocPage.tsx",
        lineNumber: 42,
        columnNumber: 5
    }, this);
}
function Callout({ tone = "signal", title, children }) {
    const colors = {
        signal: {
            border: "border-l-[var(--signal-500)]",
            text: "text-[var(--signal-400)]"
        },
        guard: {
            border: "border-l-[var(--guard-500)]",
            text: "text-[var(--guard-400)]"
        },
        ok: {
            border: "border-l-[var(--ok-500)]",
            text: "text-[var(--ok-500)]"
        }
    }[tone];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `my-6 rounded-r-lg border-l-2 ${colors.border} bg-[var(--bg-panel)] py-3 pr-4 pl-4`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: `mb-1 text-xs font-semibold tracking-wide uppercase ${colors.text}`,
                children: title
            }, void 0, false, {
                fileName: "[project]/docs/components/DocPage.tsx",
                lineNumber: 96,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$docs$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-[14px] leading-relaxed text-[var(--text-secondary)]",
                children: children
            }, void 0, false, {
                fileName: "[project]/docs/components/DocPage.tsx",
                lineNumber: 99,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/docs/components/DocPage.tsx",
        lineNumber: 93,
        columnNumber: 5
    }, this);
}
}),
"[project]/docs/lib/docs-nav.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DOCS_FLAT",
    ()=>DOCS_FLAT,
    "DOCS_NAV",
    ()=>DOCS_NAV
]);
const DOCS_NAV = [
    {
        title: "Getting started",
        items: [
            {
                href: "/docs",
                label: "Introduction"
            },
            {
                href: "/docs/installation",
                label: "Installation"
            },
            {
                href: "/docs/quick-start",
                label: "Quick start"
            },
            {
                href: "/docs/cli",
                label: "CLI"
            }
        ]
    },
    {
        title: "Core concepts",
        items: [
            {
                href: "/docs/agents",
                label: "Agents, handoffs & sessions"
            },
            {
                href: "/docs/tools",
                label: "Tools & schemas"
            },
            {
                href: "/docs/mcp",
                label: "MCP (Model Context Protocol)"
            },
            {
                href: "/docs/sandbox",
                label: "Sandboxed code execution"
            },
            {
                href: "/docs/voice",
                label: "Voice / realtime agents"
            },
            {
                href: "/docs/guardrails",
                label: "Guardrails & approval"
            },
            {
                href: "/docs/rag",
                label: "RAG / vector search"
            },
            {
                href: "/docs/graph-memory",
                label: "Graph memory (Neo4j)"
            },
            {
                href: "/docs/structured-output",
                label: "Structured output"
            },
            {
                href: "/docs/batch-output",
                label: "Batch output & Standard Schema"
            }
        ]
    },
    {
        title: "Ops & reliability",
        items: [
            {
                href: "/docs/reliability",
                label: "Reliability & tracing"
            },
            {
                href: "/docs/concurrency",
                label: "Concurrency & rate limiting"
            },
            {
                href: "/docs/resumable-runs",
                label: "Resumable runs"
            },
            {
                href: "/docs/observability",
                label: "OpenTelemetry & trace viewer"
            },
            {
                href: "/docs/usage-tracking",
                label: "Usage tracking"
            },
            {
                href: "/docs/testing",
                label: "Testing your agents"
            },
            {
                href: "/docs/deployment",
                label: "Deployment"
            }
        ]
    },
    {
        title: "Reference",
        items: [
            {
                href: "/docs/providers",
                label: "Model providers"
            },
            {
                href: "/docs/prompt-caching",
                label: "Prompt caching"
            },
            {
                href: "/docs/api-reference",
                label: "API reference"
            },
            {
                href: "/docs/react",
                label: "React"
            },
            {
                href: "/docs/vue",
                label: "Vue"
            },
            {
                href: "/docs/svelte",
                label: "Svelte"
            },
            {
                href: "/docs/examples",
                label: "Examples"
            }
        ]
    }
];
const DOCS_FLAT = DOCS_NAV.flatMap((g)=>g.items);
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__1_9j9l0._.js.map