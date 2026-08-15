import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const RAG_CODE = `import {
  createClient, anthropic, defineAgent, runAgent,
  openaiEmbeddings, InMemoryVectorStore, createRetrievalTool, embedChunks,
} from "samai-sdk";

const embeddings = openaiEmbeddings({ apiKey: process.env.OPENAI_API_KEY }); // needs \`openai\` installed
const store = new InMemoryVectorStore(); // or \`new PineconeVectorStore({ indexHost: "..." })\` for production

// Ingest: embed your chunks once, upsert into the store.
const records = await embedChunks(embeddings, [
  { id: "doc-1", text: "Refunds are processed within 3-5 business days." },
  { id: "doc-2", text: "Reset your password from Settings > Security." },
]);
await store.upsert(records);

// Give the agent a tool that can search what you just ingested.
const supportAgent = defineAgent({
  name: "support_agent",
  instructions: "Use retrieve_knowledge to ground answers in the docs before replying.",
  model: "claude-sonnet-4-6",
  tools: [createRetrievalTool({ embeddings, store, options: { topK: 3 } })],
});

const client = createClient({ provider: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) });
const result = await runAgent(client, supportAgent, "How long do refunds take?");`;

export default function RagPage() {
  return (
    <>
      <DocPage
        eyebrow="Core concepts"
        title="RAG / vector search"
        description="Three independently swappable pieces: an EmbeddingProvider (text → vectors), a VectorStore (stores/searches vectors), and createRetrievalTool() (wires them into something the model can call)."
      >
        <CodeBlock code={RAG_CODE} lang="ts" label="rag.ts" />

        <h2 id="pieces">The pieces</h2>
        <table>
          <thead>
            <tr>
              <th>Piece</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>InMemoryVectorStore</code>
              </td>
              <td>
                Brute-force cosine similarity, zero setup — fine for
                prototyping and a few thousand vectors.
              </td>
            </tr>
            <tr>
              <td>
                <code>PineconeVectorStore({"{"} indexHost, apiKey {"}"})</code>
              </td>
              <td>
                Talks to Pinecone&apos;s REST API directly over{" "}
                <code>fetch</code>, no extra SDK dependency.
              </td>
            </tr>
            <tr>
              <td>Custom &ldquo;VectorStore&rdquo;</td>
              <td>
                Three methods (<code>upsert</code>/<code>query</code>/
                <code>delete</code>) — same shape as <code>SessionStore</code>{" "}
                — for pgvector, Qdrant, Weaviate, etc.
              </td>
            </tr>
            <tr>
              <td>
                <code>openaiEmbeddings()</code>
              </td>
              <td>
                Default <code>EmbeddingProvider</code>, via the OpenAI
                embeddings endpoint.
              </td>
            </tr>
          </tbody>
        </table>

        <Callout tone="signal" title="Scoping retrieval">
          <code>createRetrievalTool()</code> accepts <code>topK</code> and a
          metadata <code>filter</code> (e.g.{" "}
          <code>{"{"} tenantId: &quot;acme&quot; {"}"}</code>) to scope
          retrieval — both apply on every call the model makes to the tool.
        </Callout>
      </DocPage>
      <DocPager current="/docs/rag" />
    </>
  );
}
