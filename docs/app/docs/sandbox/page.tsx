import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const SANDBOX_CODE = `import { createClient, anthropic, defineAgent, runAgent, createSandbox, createSandboxTools } from "samai-sdk";

const sandbox = createSandbox();
const client = createClient({ provider: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) });

const agent = defineAgent({
  name: "coder",
  instructions: "Write and test code using write_file and execute_code. JavaScript runs as an ES module.",
  model: "claude-sonnet-4-6",
  tools: createSandboxTools(sandbox),
});

const result = await runAgent(client, agent, "Write fibonacci.py, run it, and tell me the output.");
await sandbox.close(); // deletes the temp directory`;

const ONE_SHOT_CODE = `tools: [createCodeExecutionTool({ languages: ["javascript", "python"] })]`;

export default function SandboxPage() {
  return (
    <>
      <DocPage
        eyebrow="Core concepts"
        title="Sandboxed code execution"
        description="createSandbox() gives an agent an isolated temp directory to run real JavaScript/Python/bash in and read/write files against — the primitive behind long-horizon coding-agent behavior."
      >
        <p>
          <code>createCodeExecutionTool()</code> wraps it as a single{" "}
          <code>execute_code</code> tool; <code>createSandboxTools()</code>{" "}
          bundles that with <code>write_file</code>/<code>read_file</code>/
          <code>list_files</code> against the same sandbox, so a model can
          write a file with one tool and run it with another across turns.
        </p>
        <CodeBlock code={SANDBOX_CODE} lang="ts" label="sandbox.ts" />

        <p>
          For a single one-shot execution tool without file persistence, use{" "}
          <code>createCodeExecutionTool()</code> directly:
        </p>
        <CodeBlock code={ONE_SHOT_CODE} lang="ts" label="one-shot.ts" />

        <h2 id="isolation">What &ldquo;sandboxed&rdquo; means here</h2>
        <p>Read this before using it against untrusted input.</p>
        <ul>
          <li>
            Every execution gets its own cwd — file I/O is confined to it,
            and path traversal via <code>../</code> is rejected.
          </li>
          <li>
            A minimal environment (only <code>PATH</code>/<code>HOME</code>/
            <code>TMPDIR</code>) — your process&apos;s other env vars,
            including API keys, are <strong>not</strong> inherited by
            executed code.
          </li>
          <li>
            A wall-clock timeout that actually kills the process (
            <code>SIGKILL</code>, verified against a real <code>sleep</code>{" "}
            in the test suite), and a byte-accurate output-truncation cap.
          </li>
        </ul>

        <Callout tone="guard" title="Process isolation, not container isolation">
          This is process-level isolation, not OS-level: there&apos;s no
          container, VM, or network namespace. Fine for your own
          experimentation or a trusted model with shell access; for
          untrusted code or multiple tenants, run this SDK itself inside an
          actual container/VM and point <code>dir</code> at a path inside
          that boundary.
        </Callout>

        <p>
          Supported languages: <code>&quot;javascript&quot;</code> (ES
          module via <code>node</code> — <code>import</code>, not{" "}
          <code>require</code>), <code>&quot;python&quot;</code> (via{" "}
          <code>python3</code>, must be on <code>PATH</code>),{" "}
          <code>&quot;bash&quot;</code> (via <code>/bin/bash -c</code>).
        </p>
      </DocPage>
      <DocPager current="/docs/sandbox" />
    </>
  );
}
