import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const CODE = `import { createClient, anthropic, defineAgent } from "samai-sdk";
import { useAgent } from "samai-sdk/react";

const client = createClient({ provider: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) });
const supportAgent = defineAgent({ name: "support_agent", instructions: "...", model: "claude-sonnet-4-6" });

function SupportChat() {
  const { run, isRunning, text, events, result, error } = useAgent(client, supportAgent);

  return (
    <div>
      <button onClick={() => run("How do I add a handoff?")} disabled={isRunning}>Ask</button>
      <p>{text}</p> {/* streams in live as text-delta events arrive */}
      {error && <p>Error: {error.message}</p>}
      {result && <p>Done — final agent: {result.finalAgent}</p>}
    </div>
  );
}`;

export default function ReactPage() {
  return (
    <>
      <DocPage
        eyebrow="Reference"
        title="React"
        description="The samai-sdk/react subpath exports useAgent(client, agent): a thin hook wrapping runAgentStream(). It owns no agent-loop logic of its own, so behavior matches calling runAgentStream() directly from Node — it just gives you React state to render."
      >
        <CodeBlock code={CODE} lang="tsx" label="SupportChat.tsx" />

        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Type</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>run(input, opts?)</code>
              </td>
              <td>
                <code>(string, RunAgentOptions?) =&gt; Promise&lt;RunResult&gt;</code>
              </td>
              <td>Starts a run; safe to call again once the previous one finishes</td>
            </tr>
            <tr>
              <td>
                <code>isRunning</code>
              </td>
              <td>
                <code>boolean</code>
              </td>
              <td>True while a run is in progress</td>
            </tr>
            <tr>
              <td>
                <code>text</code>
              </td>
              <td>
                <code>string</code>
              </td>
              <td>Accumulates live from text-delta events</td>
            </tr>
            <tr>
              <td>
                <code>events</code>
              </td>
              <td>
                <code>AgentEvent[]</code>
              </td>
              <td>Full ordered event log — tool calls, handoffs, retries/fallbacks/timeouts, guardrail trips</td>
            </tr>
            <tr>
              <td>
                <code>result</code> / <code>error</code>
              </td>
              <td>
                <code>RunResult | null</code> / <code>Error | null</code>
              </td>
              <td>Populated once the run finishes</td>
            </tr>
            <tr>
              <td>
                <code>reset()</code>
              </td>
              <td>
                <code>() =&gt; void</code>
              </td>
              <td>Resets state back to idle</td>
            </tr>
          </tbody>
        </table>

        <Callout tone="signal" title="Optional peer dependency">
          <code>react</code> is an optional peer dependency — nothing else
          in the SDK requires it. See <code>examples/react-usage.tsx</code>{" "}
          for the full version.
        </Callout>
      </DocPage>
      <DocPager current="/docs/react" />
    </>
  );
}
