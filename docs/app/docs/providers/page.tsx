import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const PROVIDERS_CODE = `import { openai, anthropic, google, groq, mistral, ollama, azureOpenAI, bedrock } from "samai-sdk";

createClient({ provider: openai({ apiKey: "..." }) });
createClient({ provider: anthropic({ apiKey: "..." }) });
createClient({ provider: google({ apiKey: "..." }) });

// OpenAI-compatible endpoints — same shared implementation under the hood:
createClient({ provider: groq({ apiKey: "..." }) });       // fast inference (LPU hardware)
createClient({ provider: mistral({ apiKey: "..." }) });    // Mistral's "La Plateforme"
createClient({ provider: ollama() });                      // local models, no key, no cost —
                                                             // \`ollama pull llama3.1\`, use "llama3.1" as model

// Azure OpenAI — routes by deployment name, so \`model\` = your deployment name:
createClient({ provider: azureOpenAI({ endpoint: "https://my-resource.openai.azure.com" }) });

// AWS Bedrock — the unified Converse API, works the same across every model family:
createClient({ provider: bedrock({ region: "us-east-1" }) });
// model: "anthropic.claude-sonnet-4-6-20260101-v1:0", "meta.llama3-1-70b-instruct-v1:0", etc.`;

const TABLE = [
  { p: "anthropic()", dep: "@anthropic-ai/sdk", key: "ANTHROPIC_API_KEY (pass explicitly)" },
  { p: "openai()", dep: "openai", key: "pass explicitly" },
  { p: "google()", dep: "@google/generative-ai", key: "pass explicitly" },
  { p: "groq()", dep: "openai", key: "GROQ_API_KEY" },
  { p: "mistral()", dep: "openai", key: "MISTRAL_API_KEY" },
  { p: "ollama()", dep: "openai", key: "none — local, no auth" },
  { p: "azureOpenAI()", dep: "openai", key: "AZURE_OPENAI_API_KEY" },
  { p: "bedrock()", dep: "@aws-sdk/client-bedrock-runtime", key: "standard AWS credential chain" },
];

export default function ProvidersPage() {
  return (
    <>
      <DocPage
        eyebrow="Production"
        title="Providers"
        description="Every provider implements the same Provider interface, so nothing else in your code changes when you swap one in."
      >
        <CodeBlock code={PROVIDERS_CODE} lang="ts" label="providers.ts" />

        <h2 id="table">Peer dependencies & auth</h2>
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Peer dependency</th>
              <th>API key / auth</th>
            </tr>
          </thead>
          <tbody>
            {TABLE.map((row) => (
              <tr key={row.p}>
                <td>
                  <code>{row.p}</code>
                </td>
                <td>
                  <code>{row.dep}</code>
                </td>
                <td>{row.key}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <Callout tone="signal" title="Why 4 providers share one dependency">
          <code>groq()</code>, <code>mistral()</code>, <code>ollama()</code>,
          and <code>azureOpenAI()</code> all reuse the <code>openai</code>{" "}
          package pointed at a different <code>baseURL</code>. All the
          actual generate/stream/tool-call/finish-reason logic for every
          OpenAI-compatible provider lives in one shared implementation, so
          there&apos;s nothing provider-specific to go wrong per
          integration.
        </Callout>

        <h2 id="switching">Switching providers later</h2>
        <p>
          Because every provider satisfies the same interface, tools,
          guardrails, agent definitions, and handoffs are all
          provider-agnostic — changing providers is a one-line edit to{" "}
          <code>createClient()</code>, nothing else in your codebase moves.
        </p>
      </DocPage>
      <DocPager current="/docs/providers" />
    </>
  );
}
