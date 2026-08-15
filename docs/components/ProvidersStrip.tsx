const PROVIDERS = [
  "Anthropic",
  "OpenAI",
  "Google Gemini",
  "AWS Bedrock",
  "Groq",
  "Mistral",
  "Azure OpenAI",
  "Ollama",
];

export function ProvidersStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
      {PROVIDERS.map((p) => (
        <span
          key={p}
          className="font-(family-name:--font-label) text-[13px] tracking-wide text-[var(--text-faint)] transition-colors hover:text-[var(--text-secondary)]"
        >
          {p}
        </span>
      ))}
    </div>
  );
}
