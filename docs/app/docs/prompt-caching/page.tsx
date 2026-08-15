import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const CODE = `const result = await client.generate({
  model: "claude-sonnet-4-6",
  system: longStaticSystemPrompt,
  messages,
  tools,
  promptCaching: true,
});

console.log(result.usage.cacheReadTokens);  // tokens served from cache — billed at a fraction of input price
console.log(result.usage.cacheWriteTokens); // tokens written to the cache on this call`;

export default function PromptCachingPage() {
  return (
    <>
      <DocPage
        eyebrow="Reference"
        title="Prompt caching"
        description="Set promptCaching: true on a call to mark the system prompt and tool definitions as a reusable, cacheable prefix — useful in an agent loop where the same system prompt and tools get re-sent on every turn."
      >
        <CodeBlock code={CODE} lang="ts" label="prompt-caching.ts" />

        <Callout tone="signal" title="Provider support varies">
          Currently honored by <code>anthropic()</code> — it adds
          Anthropic&apos;s <code>cache_control</code> breakpoints to the
          system prompt and the last tool definition (which caches the
          entire tool list as one unit). It&apos;s a no-op on providers that
          don&apos;t need client-side cache configuration — OpenAI and Groq
          cache automatically server-side above a token threshold with
          nothing to set.
        </Callout>
      </DocPage>
      <DocPager current="/docs/prompt-caching" />
    </>
  );
}
