import { DocPage, DocPager, Callout } from "@/components/DocPage";
import { CodeBlock } from "@/components/CodeBlock";

const CODE = `<script setup>
import { createClient, anthropic, defineAgent } from "samai-sdk";
import { useAgent } from "samai-sdk/vue";

const client = createClient({ provider: anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY }) });
const supportAgent = defineAgent({ name: "support_agent", instructions: "...", model: "claude-sonnet-4-6" });

const { run, isRunning, text, events, result, error } = useAgent(client, supportAgent);
</script>

<template>
  <button @click="run('How do I add a handoff?')" :disabled="isRunning">Ask</button>
  <p>{{ text }}</p>
  <p v-if="error">Error: {{ error.message }}</p>
  <p v-if="result">Done — final agent: {{ result.finalAgent }}</p>
</template>`;

export default function VuePage() {
  return (
    <>
      <DocPage
        eyebrow="Reference"
        title="Vue"
        description="The samai-sdk/vue subpath exports the same useAgent(client, agent) shape for the Vue 3 Composition API — Vue refs instead of React state, identical underlying behavior."
      >
        <CodeBlock code={CODE} lang="html" label="SupportChat.vue" />

        <Callout tone="signal" title="Reactivity notes">
          <code>isRunning</code>/<code>text</code>/<code>events</code> are
          plain <code>Ref</code>s (reactive, template-bindable directly);{" "}
          <code>result</code>/<code>error</code> are <code>ShallowRef</code>
          s. <code>vue</code> is an optional peer dependency. See{" "}
          <code>examples/vue-usage-mock-test.ts</code>, which exercises this
          against real Vue <code>watch()</code> reactivity.
        </Callout>
      </DocPage>
      <DocPager current="/docs/vue" />
    </>
  );
}
