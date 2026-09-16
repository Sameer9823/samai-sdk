import type { ToolDefinition, Usage } from "../types.js";
import type { Session } from "../session.js";

export interface VoiceAgentConfig {
  name: string;
  instructions: string;
  model: string;
  tools?: ToolDefinition[];
  handoffs?: VoiceAgentConfig[];
  voice?: {
    voiceId?: string;
    interruption?: "always-allow" | "confidence-gated" | "disabled";
    backchannel?: boolean;
    maxSilenceMs?: number;
  };
}

export interface VoiceConnectOptions {
  agent: VoiceAgentConfig;
  session?: Session;
  onApprovalRequest?: (req: { toolName: string; args: unknown }) => Promise<boolean>;
}

export interface VoiceProvider {
  name?: string;
  connect(options: VoiceConnectOptions): Promise<VoiceSession>;
}

export interface VoiceSession {
  sendAudio(chunk: ArrayBuffer): void;
  interrupt(): void;
  close(): Promise<void>;
  on<E extends VoiceAgentEvent["type"]>(
    type: E,
    handler: (event: Extract<VoiceAgentEvent, { type: E }>) => void
  ): () => void;
}

export type VoiceAgentEvent =
  | { type: "user-speech-started" }
  | { type: "user-speech-ended"; transcript: string; confidence: number }
  | { type: "agent-thinking" }
  | { type: "agent-speech-started" }
  | { type: "agent-audio-chunk"; chunk: ArrayBuffer }
  | { type: "agent-speech-ended" }
  | { type: "interruption"; reason: "user-barge-in" | "explicit" | "low-confidence-transcript" }
  | { type: "tool-started"; toolName: string; args: unknown }
  | { type: "tool-completed"; toolName: string; result: unknown }
  | { type: "clarification-requested"; question: string }
  | { type: "goal-updated"; goal: string; status: "in-progress" | "completed" | "abandoned" }
  | { type: "run-completed"; usage: Usage }
  | { type: "run-failed"; error: Error };
