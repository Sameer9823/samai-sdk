/// <reference lib="dom" />
type Handler = (data?: any) => void;

export class WebRTCVoiceTransport {
  private pc: RTCPeerConnection | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private mockTracks: any[] = [];
  private isMock: boolean;
  private iceServers: RTCIceServer[];

  constructor(config: { iceServers?: RTCIceServer[] } = {}) {
    this.iceServers = config.iceServers ?? [];
    this.isMock = typeof (globalThis as any).RTCPeerConnection === "undefined";
  }

  private emit(event: string, data?: any) {
    this.handlers.get(event)?.forEach((h) => { try { h(data); } catch {} });
  }

  on(event: string, handler: Handler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  async connect(): Promise<void> {
    if (this.isMock) return;
    if (this.pc) return;
    this.pc = new RTCPeerConnection({ iceServers: this.iceServers });
    this.pc.onicecandidate = (e: RTCPeerConnectionIceEvent) => { if (e.candidate) this.emit("icecandidate", e.candidate); };
    (this.pc as any).ontrack = (e: any) => this.emit("track", e);
    this.pc.onconnectionstatechange = () => this.emit("connectionstatechange", (this.pc as any)?.connectionState);
  }

  addAudioTrack(track: MediaStreamTrack | any): void {
    if (this.isMock) { this.mockTracks.push(track); this.emit("track", { track }); return; }
    if (!this.pc) throw new Error("WebRTCVoiceTransport not connected — call connect() first.");
    const stream = new MediaStream([track as MediaStreamTrack]);
    if ((this.pc as any).addTrack) (this.pc as any).addTrack(track, stream);
    else (this.pc as any).addStream?.(stream);
  }

  close(): void {
    if (this.isMock) { this.mockTracks = []; this.handlers.clear(); return; }
    try { this.pc?.close(); } catch {}
    this.pc = null;
    this.handlers.clear();
  }

  // test helpers
  simulateRemoteAudio(chunk: ArrayBuffer) { this.emit("audio", chunk); }
  getMockTracks(): any[] { return [...this.mockTracks]; }
  getPeerConnection(): RTCPeerConnection | null { return this.pc; }
  get isMockMode(): boolean { return this.isMock; }
}