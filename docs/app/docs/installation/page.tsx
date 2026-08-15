import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const CLI_INSTALL = `npx samai-sdk create my-agent --provider anthropic
cd my-agent && npm install && cp .env.example .env   # add your API key
npm start`;

const MANUAL_INSTALL = `npm install samai-sdk

# plus whichever provider SDK(s) you actually use:
npm install openai                    # openai(), groq(), mistral(), ollama(), azureOpenAI()
npm install @anthropic-ai/sdk         # anthropic()
npm install @google/generative-ai     # google()
npm install @aws-sdk/client-bedrock-runtime  # bedrock()`;

const OPTIONAL_INSTALL = `npm install ioredis                    # RedisSessionStore
npm install better-sqlite3             # SqliteSessionStore
npm install react                      # the samai-sdk/react useAgent() hook
npm install @modelcontextprotocol/sdk  # createMCPClient()
npm install ws                         # createRealtimeSession() on Node < 22
npm install valibot @valibot/to-json-schema  # Standard Schema tools/output`;

export default function InstallationPage() {
  return (
    <>
      <DocPage
        eyebrow="Getting started"
        title="Installation"
        description="The fastest path is the CLI, which scaffolds a runnable project with no manual wiring. Adding samai-sdk to an existing project is just as direct."
      >
        <h2 id="cli">Scaffold a new project</h2>
        <p>
          <code>npx samai-sdk create</code> generates a working{" "}
          <code>package.json</code>, <code>tsconfig.json</code>,{" "}
          <code>.env.example</code>, and a <code>src/index.ts</code> with one
          agent and one tool already wired to the provider you pick.
        </p>
        <CodeBlock code={CLI_INSTALL} lang="bash" label="terminal" />
        <p>
          <code>--provider</code> accepts <code>anthropic</code> (default),{" "}
          <code>openai</code>, <code>groq</code>, or <code>ollama</code> — the
          last one needs no API key at all, see{" "}
          <a href="/docs/providers">Providers</a>.
        </p>

        <h2 id="existing">Add to an existing project</h2>
        <CodeBlock code={MANUAL_INSTALL} lang="bash" label="terminal" />
        <p>
          Provider SDKs are peer dependencies — install only the ones you
          actually use. They&apos;re loaded lazily, so nothing you don&apos;t
          use ends up in your bundle.
        </p>

        <h2 id="optional">Optional dependencies</h2>
        <p>
          Also loaded lazily, and only needed for the specific feature they
          back:
        </p>
        <CodeBlock code={OPTIONAL_INSTALL} lang="bash" label="terminal" />

        <Callout tone="guard" title="Note">
          <code>groq()</code>, <code>mistral()</code>, <code>ollama()</code>,
          and <code>azureOpenAI()</code> all reuse the <code>openai</code>{" "}
          package pointed at a different <code>baseURL</code> — that&apos;s
          why they share it as a peer dependency instead of needing their
          own.
        </Callout>
      </DocPage>
      <DocPager current="/docs/installation" />
    </>
  );
}
