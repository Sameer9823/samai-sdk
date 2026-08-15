import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const CODE = `import {
  createClient, anthropic, defineAgent, runAgent, resumeAgent, FileCheckpointStore,
} from "samai-sdk";

const client = createClient({ provider: anthropic({ apiKey: "..." }) });
const agent = defineAgent({ name: "worker", instructions: "...", model: "claude-sonnet-4-6", tools: [] });

const checkpointStore = new FileCheckpointStore("./checkpoints"); // survives a real process restart
const runId = "run-" + Date.now();

try {
  await runAgent(client, agent, "Do a multi-step task", { checkpoint: { store: checkpointStore, runId } });
} catch (err) {
  // Resume with the SAME root agent — its handoffs tree is walked by name to find
  // whichever agent was active when the checkpoint was saved.
  const result = await resumeAgent(client, agent, { checkpoint: { store: checkpointStore, runId } });
  console.log(result.output);
}`;

export default function ResumableRunsPage() {
  return (
    <>
      <DocPage
        eyebrow="Ops & reliability"
        title="Resumable runs"
        description="resumeAgentStream()/resumeAgent() pick a run back up after a crash, an uncaught error, or a process restart — instead of starting over from the original input."
      >
        <p>
          A <code>RunCheckpoint</code> is saved after every completed turn
          (model call + any tool execution or handoff).
        </p>
        <CodeBlock code={CODE} lang="ts" label="resume.ts" />

        <Callout tone="ok" title="Nothing gets re-run">
          Already-executed tool calls are never re-run on resume — the
          checkpoint carries the full message history, so the resumed
          run&apos;s first action is a fresh model call continuing the
          conversation, not a repeat of completed work. The checkpoint is
          deleted automatically on successful completion; it&apos;s left in
          place on failure so you can inspect or resume past it.
        </Callout>

        <h2 id="stores">Checkpoint stores</h2>
        <table>
          <thead>
            <tr>
              <th>Store</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>InMemoryCheckpointStore</code>
              </td>
              <td>
                Only survives within the same process — good for resuming
                after a caught error mid-request.
              </td>
            </tr>
            <tr>
              <td>
                <code>FileCheckpointStore(dir)</code>
              </td>
              <td>
                One JSON file per run — survives a real process
                restart/crash.
              </td>
            </tr>
          </tbody>
        </table>

        <p>
          Agent <em>definitions</em> (instructions, tools, code) aren&apos;t
          part of a checkpoint — only the run&apos;s accumulated state is.
          Resuming a <code>runId</code> with no saved checkpoint throws{" "}
          <code>CheckpointNotFoundError</code> rather than silently starting
          fresh.
        </p>
      </DocPage>
      <DocPager current="/docs/resumable-runs" />
    </>
  );
}
