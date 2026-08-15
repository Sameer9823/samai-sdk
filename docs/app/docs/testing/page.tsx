import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const CODE = `import { createClient, defineAgent, runAgent, createMockProvider } from "samai-sdk";

const mock = createMockProvider({
  responses: [
    { toolCalls: [{ toolName: "get_weather", args: { city: "Tokyo" } }] },
    { text: "It's 18°C and cloudy in Tokyo." },
  ],
});

const client = createClient({ provider: mock });
const result = await runAgent(client, myAgent, "What's the weather in Tokyo?");

// every GenerateOptions this provider was called with, in order:
console.log(mock.calls.length); // 2
console.log(result.output);     // "It's 18°C and cloudy in Tokyo."

mock.reset(); // clears the call log so the same mock instance can be reused across test cases`;

export default function TestingPage() {
  return (
    <>
      <DocPage
        eyebrow="Ops & reliability"
        title="Testing your agents"
        description="createMockProvider() ships in the SDK so you don't have to hand-roll a fake Provider for your own tests."
      >
        <CodeBlock code={CODE} lang="ts" label="mock-provider.ts" />

        <Callout tone="signal" title="Scripted responses">
          Each entry in <code>responses</code> can set <code>text</code>,{" "}
          <code>toolCalls</code>, <code>finishReason</code>,{" "}
          <code>usage</code>, <code>delayMs</code> (simulate latency), or{" "}
          <code>error</code> (simulate a provider failure). Pass a function
          instead of an array if a turn&apos;s response needs to depend on
          what the agent loop actually sent.
        </Callout>
      </DocPage>
      <DocPager current="/docs/testing" />
    </>
  );
}
