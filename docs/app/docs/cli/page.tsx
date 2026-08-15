import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const CLI_USAGE = `npx samai-sdk create <directory> [--provider anthropic|openai|groq|ollama]
npx samai-sdk trace <trace-file.json> [--port 4949]`;

export default function CliPage() {
  return (
    <>
      <DocPage
        eyebrow="Production"
        title="CLI"
        description="Two commands: scaffold a runnable starter project, or serve a trace file as an interactive HTML timeline."
      >
        <CodeBlock code={CLI_USAGE} lang="bash" label="terminal" />

        <h2 id="create">samai-sdk create</h2>
        <p>
          Scaffolds a runnable starter project: <code>package.json</code>,{" "}
          <code>tsconfig.json</code>, <code>.env.example</code>, and a{" "}
          <code>src/index.ts</code> with one agent and one tool, wired to
          whichever provider you picked. Refuses to overwrite an existing
          directory.
        </p>

        <h2 id="trace">samai-sdk trace</h2>
        <p>
          Serves <code>renderTraceHTML()</code>&apos;s output for a saved{" "}
          <code>RunTrace</code> (or a <code>RunResult</code>, which has{" "}
          <code>.trace</code> on it) over a local HTTP server — see{" "}
          <a href="/docs/reliability#tracing">Reliability & tracing</a>.
        </p>

        <Callout tone="signal" title="Tested against the real build">
          The CLI&apos;s test runs the actual built <code>dist/cli.js</code>{" "}
          binary and typechecks the generated <code>src/index.ts</code>{" "}
          against the repo&apos;s real, built types — not just a check that
          files exist.
        </Callout>
      </DocPage>
      <DocPager current="/docs/cli" />
    </>
  );
}
