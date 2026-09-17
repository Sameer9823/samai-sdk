import type { Metadata } from "next";

import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.samai-sdk.in"),
  title: {
    default: "samai-sdk — one API, every provider, a real agent runtime",
    template: "%s | samai-sdk",
  },
  description:
    "A unified TypeScript agent SDK covering OpenAI, Anthropic, Gemini, and 5 more providers — with tool calling, MCP, guardrails, multi-agent handoffs, RAG, voice, graph memory, and tracing built in, not bolted on.",
  keywords: [
    "AI agent SDK",
    "TypeScript agent runtime",
    "MCP client",
    "multi-agent handoffs",
    "LLM guardrails",
    "RAG toolkit",
    "voice AI agent",
    "graph memory Neo4j",
    "Anthropic Claude SDK",
    "OpenAI SDK",
    "Gemini SDK",
    "AWS Bedrock",
  ],
  authors: [{ name: "Sameer", url: "https://github.com/Sameer9823" }],
  openGraph: {
    type: "website",
    url: "https://www.samai-sdk.in/",
    title: "samai-sdk — one API, every provider, a real agent runtime",
    description:
      "One TypeScript API for 8 model providers, with the agent runtime — tools, MCP, guardrails, handoffs, RAG, voice, tracing — wired in from the start.",
    siteName: "samai-sdk",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "samai-sdk — one API, every provider, a real agent runtime",
    description:
      "Swap providers without touching your tools, guardrails, or tracing. 8 providers, one interface, the full agent runtime included.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased overflow-x-hidden">{children}</body>
    </html>
  );
}