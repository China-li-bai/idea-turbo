import { useEffect, useRef, useReducer, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import SignalingClient from "../utils/signalingClient";
import type { SignalEnvelope, ChatMessage } from "../types";

type PeerMeta = {
  id: string;
  displayName?: string;
  status: "connecting" | "connected" | "disconnected";
  lastSeen: number;
};

type ConnectionEntry = {
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
  isInitiator: boolean;
};

type State = {
  roomId: string;
  localId: string;
  peers: Record<string, PeerMeta>;
  connections: Record<string, ConnectionEntry | null>;
  chatLog: ChatMessage[];
  signalingUrl: string | null;
  offerStrategy: "A" | "B"; // A: existing -> new offer; B: new -> existing offer
};

type Action =
  | { type: "INIT"; payload: { roomId: string; localId: string; signalingUrl: string | null; offerStrategy?: "A" | "B" } }
  | { type: "SET_ROOM_ID"; roomId: string }
  | { type: "PEER_JOINED"; peerId: string }
  | { type: "PEER_LEFT"; peerId: string }
  | { type: "CONN_START"; peerId: string; conn: ConnectionEntry }
  | { type: "CONN_ESTABLISHED"; peerId: string }
  | { type: "CONN_CLOSED"; peerId: string }
  | { type: "RECEIVE_CHAT"; message: ChatMessage }
  | { type: "SEND_CHAT"; message: ChatMessage };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "INIT":
      return {
        ...s,
        roomId: a.payload.roomId,
        localId: a.payload.localId,
        signalingUrl: a.payload.signalingUrl,
        offerStrategy: a.payload.offerStrategy || "A",
      };
    case "SET_ROOM_ID":
      return {
        ...s,
        roomId: a.roomId,
      };
    case "PEER_JOINED":
      return {
        ...s,
        peers: { ...s.peers, [a.peerId]: { id: a.peerId, status: "connecting", lastSeen: Date.now() } },
      };
    case "PEER_LEFT": {
      const p = { ...s.peers };
      delete p[a.peerId];
      const conn = { ...s.connections };
      conn[a.peerId] = null;
      return { ...s, peers: p, connections: conn };
    }
    case "CONN_START": {
      return {
        ...s,
        connections: { ...s.connections, [a.peerId]: a.conn },
      };
    }
    case "CONN_ESTABLISHED": {
      const peers = { ...s.peers };
      peers[a.peerId] = { ...(peers[a.peerId] || { id: a.peerId }), status: "connected", lastSeen: Date.now() };
      return { ...s, peers, connections: { ...s.connections, [a.peerId]: s.connections[a.peerId] } };
    }
    case "CONN_CLOSED": {
      const peers = { ...s.peers };
      if (peers[a.peerId]) peers[a.peerId].status = "disconnected";
      return { ...s, peers, connections: { ...s.connections, [a.peerId]: null } };
    }
    case "RECEIVE_CHAT":
      return { ...s, chatLog: [...s.chatLog, a.message] };
    case "SEND_CHAT":
      return { ...s, chatLog: [...s.chatLog, a.message] };
    default:
      return s;
  }
}

// default ICE servers
const DEFAULT_ICE = [{ urls: "stun:stun.l.google.com:19302" }];

export default function useP2PRoom(opts: { roomId?: string; signalingUrl?: string | null; offerStrategy?: "A" | "B"; maxPeers?: number }) {
  const localIdRef = useRef<string>(uuidv4());
  const signalingRef = useRef<SignalingClient | null>(null);
  const connectionsRef = useRef<Record<string, ConnectionEntry | null>>({});
  const reducerRef = useRef<{ state: State; dispatch: (a: Action) => void } | null>(null);

  const [state, dispatchInner] = useReducer(reducer, {
    roomId: opts.roomId || '',  // 初始为空，等待用户输入
    localId: localIdRef.current,
    peers: {},
    connections: {},
    chatLog: [],
    signalingUrl: opts.signalingUrl ?? null,
    offerStrategy: opts.offerStrategy ?? "A",
  });

  // keep ref to dispatch
  useEffect(() => {
    reducerRef.current = { state, dispatch: dispatchInner };
  }, [state]);

  // helper to send signaling message
  const sendSignal = useCallback((msg: SignalEnvelope) => {
    if (!signalingRef.current) {
      console.warn("No signaling client available. If you want auto-discovery, set signalingUrl.");
      return;
    }
    console.log('📤 Sending signaling message:', msg);
    signalingRef.current.send(msg);
  }, []);

  // broadcast local join immediately (if ws available - SignalingClient handles auto join on open)
  useEffect(() => {
    // Clean up previous connection
    if (signalingRef.current) {
      signalingRef.current.close();
      signalingRef.current = null;
    }
    
    // Initialize signaling client
    if (opts.signalingUrl && state.roomId) {
      console.log(`🔗 Connecting to signaling server for room: ${state.roomId}`);
      signalingRef.current = new SignalingClient(opts.signalingUrl, state.roomId, state.localId, {
        onMessage: async (msg) => {
          console.log('📨 Received signaling message:', msg);
          // handle incoming signaling messages
          if (msg.type === "join") {
            // someone joined -> register peer and depending on strategy either offer or wait
            const peerId = msg.from;
            const currentState = reducerRef.current?.state;
            if (!currentState || peerId === currentState.localId) {
              console.log('🚫 Ignoring join message from self or no state');
              return;
            }
            console.log(`👋 New peer joined: ${peerId}, using strategy: ${currentState.offerStrategy}`);
            dispatchInner({ type: "PEER_JOINED", peerId });
            // Strategy A: existing peers create offer to newcomer
            if (currentState.offerStrategy === "A") {
              // stagger to avoid offer storm
              const delay = Math.random() * 400 + 50;
              console.log(`📤 Will send offer to ${peerId} in ${delay}ms`);
              setTimeout(() => {
                createAndSendOffer(peerId);
              }, delay);
            } else {
              // Strategy B: do nothing now; we'll rely on peer-list or newcomer to offer
              console.log('⏸️ Strategy B - waiting for peer-list or newcomer to offer');
            }
          } else if (msg.type === "offer" && msg.to === (reducerRef.current?.state?.localId)) {
            // incoming offer
            const from = msg.from;
            console.log(`📥 Received offer from: ${from}`);
            await handleRemoteOffer(from, msg.payload.sdp);
          } else if (msg.type === "answer" && msg.to === (reducerRef.current?.state?.localId)) {
            // incoming answer
            const from = msg.from;
            console.log(`📥 Received answer from: ${from}`);
            await handleRemoteAnswer(from, msg.payload.sdp);
          } else if (msg.type === "ice" && msg.to === (reducerRef.current?.state?.localId)) {
            const from = msg.from;
            const candidate = msg.payload?.candidate;
            if (candidate && connectionsRef.current[from]?.pc) {
              try {
                await connectionsRef.current[from]!.pc.addIceCandidate(candidate);
              } catch (e) {
                console.warn("addIceCandidate err", e);
              }
            }
          } else if (msg.type === "leave") {
            const pid = msg.from;
            dispatchInner({ type: "PEER_LEFT", peerId: pid });
            // cleanup
            const entry = connectionsRef.current[pid];
            if (entry) {
              try { entry.dc?.close(); } catch {}
              try { entry.pc.close(); } catch {}
              connectionsRef.current[pid] = null;
            }
          }
        },
        onOpen: () => {
          // Signaling socket opened; SignalingClient already sent join.
        },
      });
    } else {
      // no signaling url: fully manual mode supported by hook consumer (copy/paste)
    }

    // cleanup on unmount
    return () => {
      signalingRef.current?.close();
      // close each pc
      for (const k of Object.keys(connectionsRef.current)) {
        const e = connectionsRef.current[k];
        if (e) {
          try { e.dc?.close(); } catch {}
          try { e.pc.close(); } catch {}
        }
      }
    };
  }, [opts.signalingUrl, state.roomId, state.localId, state.offerStrategy]);

  // create RTCPeerConnection + (if initiator) createDataChannel + offer -> send via signaling
  async function createAndSendOffer(peerId: string) {
    if (Object.keys(connectionsRef.current).length >= (opts.maxPeers ?? 10)) {
      console.warn("max peers reached");
      return;
    }
    if (connectionsRef.current[peerId]) return; // already connecting
    const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE });
    let dc: RTCDataChannel | null = null;

    const entry: ConnectionEntry = { pc, dc: null, isInitiator: true };
    connectionsRef.current[peerId] = entry;
    dispatchInner({ type: "CONN_START", peerId, conn: entry });

    // create datachannel as initiator
    dc = pc.createDataChannel("p2p-chat", { ordered: true });
    setupDataChannel(peerId, dc);
    entry.dc = dc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const currentState = reducerRef.current?.state;
        if (currentState) {
          sendSignal({ type: "ice", roomId: currentState.roomId, from: currentState.localId, to: peerId, payload: { candidate: e.candidate } });
        }
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") dispatchInner({ type: "CONN_ESTABLISHED", peerId });
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        dispatchInner({ type: "CONN_CLOSED", peerId });
      }
    };
    // create offer
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const currentState = reducerRef.current?.state;
      if (currentState) {
        sendSignal({ type: "offer", roomId: currentState.roomId, from: currentState.localId, to: peerId, payload: { sdp: offer } });
      }
    } catch (e) {
      console.error("create offer err", e);
    }
  }

  // handle remote offer (we are answerer)
  async function handleRemoteOffer(peerId: string, sdp: any) {
    if (connectionsRef.current[peerId]) {
      console.warn("Already have connection entry (offer)", peerId);
    }
    const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE });
    const entry: ConnectionEntry = { pc, dc: null, isInitiator: false };
    connectionsRef.current[peerId] = entry;
    dispatchInner({ type: "CONN_START", peerId, conn: entry });

    pc.ondatachannel = (ev) => {
      const dc = ev.channel;
      setupDataChannel(peerId, dc);
      entry.dc = dc;
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const currentState = reducerRef.current?.state;
        if (currentState) {
          sendSignal({ type: "ice", roomId: currentState.roomId, from: currentState.localId, to: peerId, payload: { candidate: e.candidate } });
        }
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") dispatchInner({ type: "CONN_ESTABLISHED", peerId });
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        dispatchInner({ type: "CONN_CLOSED", peerId });
      }
    };

    try {
      await pc.setRemoteDescription(sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const currentState = reducerRef.current?.state;
      if (currentState) {
        sendSignal({ type: "answer", roomId: currentState.roomId, from: currentState.localId, to: peerId, payload: { sdp: answer } });
      }
    } catch (e) {
      console.error("handleRemoteOffer err", e);
    }
  }

  async function handleRemoteAnswer(peerId: string, sdp: any) {
    const entry = connectionsRef.current[peerId];
    if (!entry?.pc) {
      console.warn("received answer but pc missing", peerId);
      return;
    }
    try {
      await entry.pc.setRemoteDescription(sdp);
    } catch (e) {
      console.warn("setRemoteDescription(answer) err", e);
    }
  }

  function setupDataChannel(peerId: string, dc: RTCDataChannel) {
    dc.onopen = () => {
      dispatchInner({ type: "CONN_ESTABLISHED", peerId });
    };
    dc.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as ChatMessage;
        dispatchInner({ type: "RECEIVE_CHAT", message: msg });
      } catch (e) {
        console.warn("bad datachannel msg", e);
      }
    };
    dc.onclose = () => {
      dispatchInner({ type: "CONN_CLOSED", peerId });
    };
  }

  // public: send chat to all open datachannels
  const sendChat = useCallback((text: string) => {
    const currentState = reducerRef.current?.state;
    if (!currentState) return;
    
    const msg: ChatMessage = { type: "chat", id: uuidv4(), from: currentState.localId, text, ts: Date.now() };
    // local echo
    dispatchInner({ type: "SEND_CHAT", message: msg });
    // send to all peers
    for (const pid of Object.keys(connectionsRef.current)) {
      const entry = connectionsRef.current[pid];
      if (entry?.dc && entry.dc.readyState === "open") {
        try {
          entry.dc.send(JSON.stringify(msg));
        } catch (e) {
          console.warn("send failed", e);
        }
      }
    }
  }, []);

  // manual signaling helpers (for fully serverless mode)
  const createLocalOfferForManual = useCallback(async (targetPeerId: string) => {
    const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE });
    const dc = pc.createDataChannel("p2p-chat");
    const entry: ConnectionEntry = { pc, dc, isInitiator: true };
    connectionsRef.current[targetPeerId] = entry;
    setupDataChannel(targetPeerId, dc);
    pc.onicecandidate = (e) => {
      // caller must extract pc.localDescription (sdp) and ICE candidates (in practice browsers include candidates in localDescription or we include them separately)
    };
    await pc.setLocalDescription(await pc.createOffer());
    // return serialized localDescription to copy/paste
    return pc.localDescription;
  }, []);

  const acceptManualOfferAndCreateAnswer = useCallback(async (peerId: string, remoteDesc: RTCSessionDescriptionInit) => {
    const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE });
    connectionsRef.current[peerId] = { pc, dc: null, isInitiator: false };
    pc.ondatachannel = (ev) => {
      const dc = ev.channel;
      setupDataChannel(peerId, dc);
      connectionsRef.current[peerId]!.dc = dc;
    };
    await pc.setRemoteDescription(remoteDesc);
    await pc.setLocalDescription(await pc.createAnswer());
    // answer to be copied back
    return pc.localDescription;
  }, []);

  // leave room (notify peers)
  const updateRoomId = useCallback((roomId: string) => {
    dispatchInner({ type: "SET_ROOM_ID", roomId });
    console.log(`🏠 Setting room ID to: ${roomId}`);
  }, []);

  const leaveRoom = useCallback(() => {
    const currentState = reducerRef.current?.state;
    if (opts.signalingUrl && currentState) {
      sendSignal({ type: "leave", roomId: currentState.roomId, from: currentState.localId, to: null });
    }
    // close pcs
    for (const k of Object.keys(connectionsRef.current)) {
      const e = connectionsRef.current[k];
      if (e) {
        try { e.dc?.close(); } catch {}
        try { e.pc.close(); } catch {}
      }
    }
    connectionsRef.current = {};
  }, [opts.signalingUrl, sendSignal]);

  // return minimal API
  return {
    state,
    sendChat,
    updateRoomId,
    createLocalOfferForManual,
    acceptManualOfferAndCreateAnswer,
    leaveRoom,
    // convenience
    localId: state.localId,
    roomId: state.roomId,
  };
}
