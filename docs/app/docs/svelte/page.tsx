import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const CODE = `<script>
  import { createClient, anthropic, defineAgent } from "samai-sdk";
  import { useAgent } from "samai-sdk/svelte";

  const client = createClient({ provider: anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY }) });
  const supportAgent = defineAgent({ name: "support_agent", instructions: "...", model: "claude-sonnet-4-6" });

  const agent = useAgent(client, supportAgent);
</script>

<button on:click={() => agent.run("How do I add a handoff?")} disabled={$agent.isRunning}>Ask</button>
<p>{$agent.text}</p>
{#if $agent.error}<p>Error: {$agent.error.message}</p>{/if}
{#if $agent.result}<p>Done — final agent: {$agent.result.finalAgent}</p>{/if}`;

export default function SveltePage() {
  return (
    <>
      <DocPage
        eyebrow="Reference"
        title="Svelte"
        description="The samai-sdk/svelte subpath exports useAgent(client, agent) as a Svelte store — subscribe with $agent in a .svelte file."
      >
        <CodeBlock code={CODE} lang="html" label="SupportChat.svelte" />

        <Callout tone="signal" title="Store shape">
          <code>agent.run()</code>/<code>agent.reset()</code> are called
          directly on the store object; every other field comes through the{" "}
          <code>$agent</code> subscription. <code>svelte</code> is an
          optional peer dependency. See{" "}
          <code>examples/svelte-usage-mock-test.ts</code>, which exercises
          this against a real store subscription.
        </Callout>

        <p className="text-sm text-[var(--text-faint)]">
          All three framework hooks (React/Vue/Svelte) are thin wrappers
          around <code>runAgentStream()</code> — none of them own any
          agent-loop logic themselves.
        </p>
      </DocPage>
      <DocPager current="/docs/svelte" />
    </>
  );
}
