import type { VoiceProvider, VoiceConnectOptions, VoiceSession, VoiceAgentEvent } from "../types.js";
import type { RealtimeEvent } from "../../voice.js";

export function openaiRealtime(config: { apiKey?: string; model?: string; voice?: string } = {}): VoiceProvider {
  return {
    name: "openai-realtime",
    async connect(options: VoiceConnectOptions): Promise<VoiceSession> {
      const isMock = !config.apiKey || config.apiKey === "mock";
      if (isMock) {
        const handlers = new Map<string, Set<(e: any) => void>>();
        function emit(event: VoiceAgentEvent) {
          const set = handlers.get(event.type);
          if (!set) return;
          for (const h of [...set]) { try { (h as any)(event); } catch {} }
        }
        const trace: any = { runId: "mock-rt", events: [{ type: "run-started" }], totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } };
        const session: any = {
          sendAudio(_chunk: ArrayBuffer) {},
          interrupt() { emit({ type: "interruption", reason: "explicit" } as VoiceAgentEvent); },
          async close() { handlers.clear(); },
          on(type: string, handler: (e: any) => void) {
            let set = handlers.get(type);
            if (!set) { set = new Set(); handlers.set(type, set); }
            set.add(handler as any);
            return () => set!.delete(handler as any);
          },
          _trace: trace,
        };
        return session as VoiceSession;
      }
      const mod = await import("../../voice.js");
      const createRealtimeSession = (mod as any).createRealtimeSession as (opts: any) => any;
      if (!createRealtimeSession) throw new Error("openaiRealtime: createRealtimeSession not found in src/voice.ts");

      const rt = createRealtimeSession({
        apiKey: config.apiKey,
        model: config.model,
        voice: config.voice,
        instructions: options.agent.instructions,
        tools: options.agent.tools,
      });

      const handlers = new Map<string, Set<(e: any) => void>>();

      function emit<E extends VoiceAgentEvent["type"]>(event: Extract<VoiceAgentEvent, { type: E }>): void {
        const set = handlers.get(event.type);
        if (!set) return;
        for (const h of [...set]) {
          try { (h as any)(event); } catch {}
        }
      }

      let speaking = false;

      function toArrayBuffer(buf: Buffer): ArrayBuffer {
        // Buffer is Uint8Array view; slice to exact ArrayBuffer
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
      }

      rt.on((evt: RealtimeEvent) => {
        switch (evt.type) {
          case "audio.delta": {
            if (!speaking) {
              speaking = true;
              emit({ type: "agent-speech-started" } as VoiceAgentEvent);
            }
            emit({ type: "agent-audio-chunk", chunk: toArrayBuffer(evt.audio) } as VoiceAgentEvent);
            break;
          }
          case "audio.done": {
            if (speaking) {
              speaking = false;
              emit({ type: "agent-speech-ended" } as VoiceAgentEvent);
            }
            break;
          }
          case "speech_started": {
            emit({ type: "user-speech-started" } as VoiceAgentEvent);
            emit({ type: "interruption", reason: "user-barge-in" } as VoiceAgentEvent);
            break;
          }
          case "speech_stopped": {
            // VAD stopped — final transcript will arrive via transcript.done (user)
            break;
          }
          case "transcript.delta": {
            if (evt.role === "assistant") emit({ type: "agent-thinking" } as VoiceAgentEvent);
            break;
          }
          case "transcript.done": {
            if (evt.role === "user") {
              emit({ type: "user-speech-ended", transcript: evt.transcript, confidence: 1 } as VoiceAgentEvent);
            } else {
              // assistant transcript complete — ensure speech ended if no audio.done
              if (speaking) {
                speaking = false;
                emit({ type: "agent-speech-ended" } as VoiceAgentEvent);
              }
            }
            break;
          }
          case "text.delta": {
            emit({ type: "agent-thinking" } as VoiceAgentEvent);
            break;
          }
          case "text.done": {
            emit({ type: "agent-thinking" } as VoiceAgentEvent);
            break;
          }
          case "tool_call": {
            emit({ type: "tool-started", toolName: evt.name, args: evt.args } as VoiceAgentEvent);
            break;
          }
          case "response.done": {
            if (speaking) {
              speaking = false;
              emit({ type: "agent-speech-ended" } as VoiceAgentEvent);
            }
            // run-completed synthetic — no usage from realtime, emit zeroed
            emit({ type: "run-completed", usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } } as VoiceAgentEvent);
            break;
          }
          case "error": {
            const err = evt.error instanceof Error ? evt.error : new Error(String(evt.error ?? "Realtime error"));
            emit({ type: "run-failed", error: err } as VoiceAgentEvent);
            break;
          }
          case "session.ready":
          case "raw":
          default:
            break;
        }
      });

      await rt.connect();

      const session: VoiceSession = {
        sendAudio(chunk: ArrayBuffer) {
          rt.sendAudio(Buffer.from(chunk));
        },
        interrupt() {
          try { rt.interrupt(); } catch {}
          emit({ type: "interruption", reason: "explicit" } as VoiceAgentEvent);
        },
        async close() {
          await rt.close();
        },
        on<E extends VoiceAgentEvent["type"]>(type: E, handler: (event: Extract<VoiceAgentEvent, { type: E }>) => void): () => void {
          let set = handlers.get(type);
          if (!set) { set = new Set(); handlers.set(type, set); }
          set.add(handler as any);
          return () => set!.delete(handler as any);
        },
      };

      return session;
    },
  };
}
