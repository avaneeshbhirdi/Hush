import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff,
  Send, Copy, ShieldCheck, LogOut, Users, MessageCircle,
  Lock, Eye, EyeOff, Wifi, WifiOff, Heart,
  Monitor, MonitorOff, Settings, X, Smile, AlertCircle
} from 'lucide-react';
import { supabase } from './supabaseClient';
import './App.css';

// ────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────
type AuthMode = 'login' | 'signup';
type SidebarTab = 'chat' | 'participants';
type Message = { text: string; sender: 'me' | 'peer' | 'system'; timestamp: number };
type User = { name: string; email: string };
type AppMode = 'standard' | 'couple' | 'gamer' | 'hacker';

const MODES: Record<AppMode, { label: string; icon: string; accent: string; bg: string; reactions: string[]; particles: string[] }> = {
  standard: {
    label: 'Standard', icon: '🔒',
    accent: '#3B82F6', bg: '',
    reactions: ['👍', '😂', '❤️', '😮', '😢', '🔥', '😍', '🎉'],
    particles: ['✨', '🌟', '💫', '⭐', '🌙', '🔮'],
  },
  couple: {
    label: 'Couple', icon: '💑',
    accent: '#F472B6', bg: 'linear-gradient(160deg,#120608 0%,#1A0A10 55%,#200C14 100%)',
    reactions: ['💕', '❤️', '😘', '💋', '🌹', '💑', '🥰', '💏'],
    particles: ['♥', '💕', '💖', '💗', '🌸', '✨'],
  },
  gamer: {
    label: 'Gamer', icon: '🎮',
    accent: '#A855F7', bg: 'linear-gradient(160deg,#07020F 0%,#0D0520 55%,#110828 100%)',
    reactions: ['🎮', '👾', '💀', '🏆', '⚡', '🎯', '🔥', '💥'],
    particles: ['🎮', '⚡', '💥', '🔥', '⭐', '🏆', '👾', '💀'],
  },
  hacker: {
    label: 'Hacker', icon: '💻',
    accent: '#22C55E', bg: 'linear-gradient(160deg,#000A00 0%,#001200 55%,#001A00 100%)',
    reactions: ['🔐', '💻', '🛡️', '🔑', '⚙️', '🕵️', '👁️', '🔒'],
    particles: ['⚙️', '🔐', '💻', '🛡️', '01', '10'],
  },
};

const STORAGE_KEY = 'hush_users';
const SESSION_KEY = 'hush_session';

// ────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────
function getStoredUsers(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function saveUser(email: string, password: string, name: string) {
  const users = getStoredUsers();
  users[email] = JSON.stringify({ password, name });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}
function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ────────────────────────────────────────────────────
// Floating particles + Mode switcher
// ────────────────────────────────────────────────────
type HeartParticle = { id: number; x: number; y: number; emoji: string };

function FloatingHearts({ hearts }: { hearts: HeartParticle[] }) {
  return (
    <>
      {hearts.map(h => (
        <span key={h.id} className="heart-particle" style={{ left: h.x, top: h.y }}>{h.emoji}</span>
      ))}
    </>
  );
}

function ModeSwitcher({ appMode, setAppMode }: { appMode: AppMode; setAppMode: (m: AppMode) => void }) {
  const [open, setOpen] = useState(false);
  const cur = MODES[appMode];
  return (
    <div className="mode-switcher-wrap">
      <button className={`mode-pill mode-${appMode}`} onClick={() => setOpen(p => !p)}>
        <span>{cur.icon}</span>
        <span>{cur.label}</span>
        <span className="mode-caret">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="mode-menu" onClick={() => setOpen(false)}>
          {(Object.keys(MODES) as AppMode[]).map(m => (
            <button
              key={m}
              className={`mode-item mode-item-${m}${appMode === m ? ' mode-item-active' : ''}`}
              onClick={() => setAppMode(m)}
            >
              <span className="mi-icon">{MODES[m].icon}</span>
              <span className="mi-label">{MODES[m].label}</span>
              {appMode === m && <span className="mi-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────
// Auth Screen
// ────────────────────────────────────────────────────
function AuthScreen({ onAuth, appMode, setAppMode }: { onAuth: (user: User) => void; appMode: AppMode; setAppMode: (m: AppMode) => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [hearts, setHearts] = useState<HeartParticle[]>([]);

  // Burst particles on mode change
  const burstParticles = useCallback((particles: string[], btn: HTMLElement) => {
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const newHearts: HeartParticle[] = Array.from({ length: 7 }, (_, i) => ({
      id: Date.now() + i,
      x: cx + (Math.random() - 0.5) * 80,
      y: cy + (Math.random() - 0.5) * 30,
      emoji: particles[Math.floor(Math.random() * particles.length)],
    }));
    setHearts(prev => [...prev, ...newHearts]);
    setTimeout(() => setHearts(prev => prev.filter(h => !newHearts.find(n => n.id === h.id))), 3600);
  }, []);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const users = getStoredUsers();

    if (mode === 'signup') {
      if (!name.trim()) { setError('Please enter your name.'); return; }
      if (!email.includes('@')) { setError('Enter a valid email.'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
      if (users[email]) { setError('An account with this email already exists.'); return; }
      saveUser(email, password, name.trim());
      const session: User = { name: name.trim(), email };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      onAuth(session);
    } else {
      const raw = users[email];
      if (!raw) { setError('No account found. Please sign up first.'); return; }
      const { password: stored, name: storedName } = JSON.parse(raw);
      if (stored !== password) { setError('Incorrect password.'); return; }
      const session: User = { name: storedName, email };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      onAuth(session);
    }
  };

  return (
    <div className="auth-page">
      <FloatingHearts hearts={hearts} />
      {/* Mode switcher — top-right corner */}
      <div style={{ position: 'fixed', top: 14, right: 18, zIndex: 100 }}
        onClick={(e) => burstParticles(MODES[appMode].particles, e.currentTarget as HTMLElement)}>
        <ModeSwitcher appMode={appMode} setAppMode={setAppMode} />
      </div>

      {/* Hero */}
      <div className="auth-hero anim-fade-up">
        <div className="auth-logo">
          <div className="logo-icon">
            <Lock size={22} />
          </div>
          <span>Hush</span>
        </div>

        <h1 className="auth-tagline">
          Private calls.<br />
          <span className="highlight">Zero compromises.</span>
        </h1>
        <p className="auth-sub">
          Military-grade end-to-end encryption for every call and message.
          Not even we can see what you share.
        </p>

        <div className="auth-features">
          {[
            { icon: <ShieldCheck size={16} />, text: 'End-to-end encrypted by default' },
            { icon: <Wifi size={16} />, text: 'Peer-to-peer WebRTC — no server relay' },
            { icon: <Lock size={16} />, text: 'Zero message retention on our servers' },
          ].map((f, i) => (
            <div className="feature-item" key={i}>
              <div className="feat-icon">{f.icon}</div>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-wrap anim-slide-right">
          <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
          <p className="auth-form-sub">
            {mode === 'login'
              ? 'Sign in to access your secure workspace.'
              : 'Set up your private, encrypted account.'}
          </p>

          {/* Tabs */}
          <div className="auth-tabs">
            <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); }}>
              Sign In
            </button>
            <button className={`auth-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => { setMode('signup'); setError(''); }}>
              Sign Up
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="form-field">
                <label htmlFor="full-name">Full Name</label>
                <input
                  id="full-name"
                  type="text"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="form-field">
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="form-field">
              <label htmlFor="auth-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="auth-password"
                  type={showPw ? 'text' : 'password'}
                  placeholder={mode === 'signup' ? 'Min. 6 characters' : 'Your password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="btn-primary auth-submit-btn">
              {mode === 'login' ? 'Sign In Securely' : 'Create My Account'}
            </button>

            <div className="auth-divider">or continue with</div>

            <button
              type="button"
              className="btn-google"
              onClick={async () => {
                if (!import.meta.env.VITE_SUPABASE_URL) {
                  setError('Please add your VITE_SUPABASE_URL to the .env file first.');
                  return;
                }
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: window.location.origin
                  }
                });
                if (error) setError(error.message);
              }}
            >
              {/* Google G icon */}
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// Main App
// ────────────────────────────────────────────────────
function MainApp({ user, onLogout, appMode, setAppMode }: { user: User; onLogout: () => void; appMode: AppMode; setAppMode: (m: AppMode) => void }) {
  const [me, setMe] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callerSignal, setCallerSignal] = useState<any>();
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState('');
  const [callEnded, setCallEnded] = useState(false);
  const [callerName, setCallerName] = useState('');
  const [connected, setConnected] = useState(false);

  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [activeTab, setActiveTab] = useState<SidebarTab>('chat');
  const [copied, setCopied] = useState(false);
  const [hearts, setHearts] = useState<HeartParticle[]>([]);

  // Screen share
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Reactions
  type ReactionParticle = { id: number; emoji: string; x: number; y: number };
  const [reactions, setReactions] = useState<ReactionParticle[]>([]);
  const reactionEmojis = MODES[appMode].reactions;

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selCam, setSelCam] = useState('');
  const [selMic, setSelMic] = useState('');
  const [displayName, setDisplayName] = useState(user.name);

  // Reaction picker
  const [showReactions, setShowReactions] = useState(false);

  const burstParticles = useCallback((btn: HTMLElement) => {
    const particles = MODES[appMode].particles;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const newHearts: HeartParticle[] = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: cx + (Math.random() - 0.5) * 100,
      y: cy + (Math.random() - 0.5) * 40,
      emoji: particles[Math.floor(Math.random() * particles.length)],
    }));
    setHearts(prev => [...prev, ...newHearts]);
    setTimeout(() => setHearts(prev => prev.filter(h => !newHearts.find(n => n.id === h.id))), 3600);
  }, [appMode]);

  const connectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<any>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const iceCandidatesQueue = useRef<any[]>([]);

  const assignLocalVideo = useCallback((node: HTMLVideoElement | null) => {
    if (node) node.srcObject = (isScreenSharing && screenStreamRef.current) ? screenStreamRef.current : stream;
  }, [stream, isScreenSharing]);

  const assignRemoteVideo = useCallback((node: HTMLVideoElement | null) => {
    if (node) node.srcObject = remoteStream;
  }, [remoteStream]);

  // ── Init ────────────────────────────────────────────
  useEffect(() => {
    class SupabaseSignaling {
      channel: any;
      listeners: Record<string, (data?: any) => void> = {};
      myId: string;

      constructor() {
        this.myId = Math.random().toString(36).substring(2, 10).toUpperCase();
        this.channel = supabase.channel('hush-signaling');

        this.channel.on('broadcast', { event: '*' }, (payload: any) => {
          if (payload.payload.to && payload.payload.to !== this.myId && payload.payload.to !== 'all') return;
          if (this.listeners[payload.event]) {
            this.listeners[payload.event](payload.payload.data);
          }
        }).subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            if (this.listeners['connect']) this.listeners['connect']();
            if (this.listeners['me']) this.listeners['me'](this.myId);
          }
        });
      }

      on(event: string, callback: (data?: any) => void) { this.listeners[event] = callback; }

      emit(event: string, data: any) {
        let targetEvent = event;
        let targetPayload = data;
        let to = data.to || data.userToCall || 'all';

        if (event === 'callUser') {
          targetPayload = { signalData: data.signalData, from: data.from, name: data.name };
        } else if (event === 'answerCall') {
          targetEvent = 'callAccepted';
          targetPayload = data.signal;
        } else if (event === 'ice-candidate') {
          targetPayload = data.candidate;
        }

        this.channel.send({ type: 'broadcast', event: targetEvent, payload: { to, data: targetPayload } });
      }

      disconnect() {
        supabase.removeChannel(this.channel);
        if (this.listeners['disconnect']) this.listeners['disconnect']();
      }
    }

    socketRef.current = new SupabaseSignaling();
    socketRef.current.on('connect', () => setConnected(true));
    socketRef.current.on('disconnect', () => setConnected(false));
    socketRef.current.on('ice-candidate', async (c: any) => {
      if (connectionRef.current && connectionRef.current.remoteDescription) {
        try { await connectionRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch {}
      } else {
        iceCandidatesQueue.current.push(c);
      }
    });

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(s => {
        setStream(s);
      })
      .catch(() => addMsg('system', '⚠ Camera/mic access denied. Allow permissions to make calls.'));

    socketRef.current.on('me', id => setMe(id));

    socketRef.current.on('callUser', (data: any) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerName(data.name);
      setCallerSignal(data.signalData);
    });

    socketRef.current.on('callEnded', () => {
      setCallEnded(true);
      connectionRef.current?.close();
      addMsg('system', '🔴 Call ended.');
    });

    return () => { socketRef.current?.disconnect(); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMsg = (sender: 'me' | 'peer' | 'system', text: string) => {
    setMessages(prev => [...prev, { text, sender, timestamp: Date.now() }]);
  };

  // ── WebRTC helpers ───────────────────────────────────
  const createPeer = () => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
      ],
    });
    if (stream) stream.getTracks().forEach(t => peer.addTrack(t, stream));
    peer.ontrack = e => { setRemoteStream(e.streams[0]); };
    return peer;
  };

  const callUser = async (id: string) => {
    const peer = createPeer();
    connectionRef.current = peer;

    const ch = peer.createDataChannel('chat');
    setupDataChannel(ch);
    dataChannel.current = ch;

    peer.onicecandidate = e => {
      if (e.candidate) socketRef.current?.emit('ice-candidate', { to: id, candidate: e.candidate });
    };

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socketRef.current?.emit('callUser', { userToCall: id, signalData: offer, from: me, name: user.name });

    socketRef.current?.on('callAccepted', async signal => {
      setCallAccepted(true);
      await peer.setRemoteDescription(new RTCSessionDescription(signal));
      while (iceCandidatesQueue.current.length > 0) {
        const c = iceCandidatesQueue.current.shift();
        try { await peer.addIceCandidate(new RTCIceCandidate(c)); } catch {}
      }
      addMsg('system', '🔒 Connected — End-to-End Encrypted');
    });
  };

  const answerCall = async () => {
    setCallAccepted(true);
    setReceivingCall(false);
    const peer = createPeer();
    connectionRef.current = peer;

    peer.ondatachannel = e => { setupDataChannel(e.channel); dataChannel.current = e.channel; };
    peer.onicecandidate = e => {
      if (e.candidate) socketRef.current?.emit('ice-candidate', { to: caller, candidate: e.candidate });
    };

    await peer.setRemoteDescription(new RTCSessionDescription(callerSignal));
    while (iceCandidatesQueue.current.length > 0) {
      const c = iceCandidatesQueue.current.shift();
      try { await peer.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socketRef.current?.emit('answerCall', { signal: answer, to: caller });
    addMsg('system', '🔒 Connected — End-to-End Encrypted');
  };

  const setupDataChannel = (ch: RTCDataChannel) => {
    ch.onopen = () => console.log('Data channel open');
    ch.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.type === 'reaction') {
          spawnReaction(parsed.emoji, true);
          return;
        }
        if (parsed.type === 'message') { addMsg('peer', parsed.text); return; }
      } catch { }
      addMsg('peer', e.data);
    };
  };

  // ── Screen share ─────────────────────────────────────
  const startScreenShare = async () => {
    try {
      const screen = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
      screenStreamRef.current = screen;
      const vTrack = screen.getVideoTracks()[0];
      const sender = connectionRef.current?.getSenders().find(s => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(vTrack);
      setIsScreenSharing(true);
      vTrack.onended = () => stopScreenShare();
    } catch { addMsg('system', '⚠ Screen share cancelled or not supported.'); }
  };

  const stopScreenShare = () => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    const vTrack = stream?.getVideoTracks()[0];
    const sender = connectionRef.current?.getSenders().find(s => s.track?.kind === 'video');
    if (sender && vTrack) sender.replaceTrack(vTrack);
    setIsScreenSharing(false);
  };

  // ── Reactions ─────────────────────────────────────────
  const spawnReaction = (emoji: string, fromPeer = false) => {
    const id = Date.now() + Math.random();
    const x = fromPeer ? Math.random() * 200 + 20 : Math.random() * 200 + 280;
    const y = window.innerHeight * 0.7;
    const r: ReactionParticle = { id, emoji, x, y };
    setReactions(prev => [...prev, r]);
    setTimeout(() => setReactions(prev => prev.filter(p => p.id !== id)), 2500);
  };

  const sendReaction = (emoji: string) => {
    spawnReaction(emoji);
    if (dataChannel.current?.readyState === 'open') {
      dataChannel.current.send(JSON.stringify({ type: 'reaction', emoji }));
    }
    setShowReactions(false);
  };

  // ── Settings ─────────────────────────────────────────
  const openSettings = async () => {
    const devs = await navigator.mediaDevices.enumerateDevices();
    setDevices(devs);
    setShowSettings(true);
  };

  const applySettings = async () => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: selCam ? { deviceId: { exact: selCam } } : true,
        audio: selMic ? { deviceId: { exact: selMic } } : true,
      });
      const vSender = connectionRef.current?.getSenders().find(s => s.track?.kind === 'video');
      const aSender = connectionRef.current?.getSenders().find(s => s.track?.kind === 'audio');
      vSender?.replaceTrack(newStream.getVideoTracks()[0]);
      aSender?.replaceTrack(newStream.getAudioTracks()[0]);
      setStream(newStream);
    } catch { addMsg('system', '⚠ Could not apply device settings.'); }
    setShowSettings(false);
  };

  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current?.close();
    socketRef.current?.disconnect();
    window.location.reload();
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    if (dataChannel.current?.readyState === 'open') {
      dataChannel.current.send(JSON.stringify({ type: 'message', text: messageText }));
      addMsg('me', messageText);
    } else {
      addMsg('system', '⚠ Secure channel not ready yet.');
    }
    setMessageText('');
  };

  const toggleVideo = () => {
    if (!stream) return;
    const t = stream.getVideoTracks()[0];
    if (t) { t.enabled = isVideoMuted; setIsVideoMuted(!isVideoMuted); }
  };

  const toggleAudio = () => {
    if (!stream) return;
    const t = stream.getAudioTracks()[0];
    if (t) { t.enabled = isAudioMuted; setIsAudioMuted(!isAudioMuted); }
  };

  const copyId = () => {
    navigator.clipboard.writeText(me);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inCall = callAccepted && !callEnded;

  // ── Render ───────────────────────────────────────────
  return (
    <div className="app-shell">
      <FloatingHearts hearts={hearts} />
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-brand">
          <Lock size={18} style={{ color: 'var(--primary)' }} />
          Hush<span className="dot">.</span>
        </div>

        <div className="nav-meta">
          {connected
            ? <><Wifi size={13} style={{ color: 'var(--primary)' }} /> <span style={{ color: 'var(--primary)' }}>Signaling connected</span></>
            : <><WifiOff size={13} style={{ color: 'var(--warn)' }} /> <span style={{ color: 'var(--warn)' }}>Connecting…</span></>
          }
          <span className="nav-badge">E2EE Active</span>
        </div>

        <div className="nav-right">
          {/* Mode Switcher */}
          <div onClick={(e) => burstParticles(e.currentTarget as HTMLElement)}>
            <ModeSwitcher appMode={appMode} setAppMode={setAppMode} />
          </div>

          {/* Settings */}
          <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={openSettings} title="Settings">
            <Settings size={16} />
          </button>

          <div className="user-pill">
            <div className="avatar">{getInitials(user.name)}</div>
            <span>{user.name}</span>
          </div>
          <button className="btn-logout" onClick={onLogout} title="Sign out">
            <LogOut size={14} style={{ verticalAlign: 'middle' }} />
          </button>
        </div>
      </nav>

      {/* Body */}
      <div className="app-body">
        {/* Video area */}
        <div className="video-area">
          {/* Thumbnails */}
          <div className="thumbnails-row">
            <div className="thumb">
              {stream
                ? <video ref={assignLocalVideo} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div className="thumb-placeholder"><Video size={20} /></div>
              }
              <div className="thumb-label">You</div>
            </div>
            {inCall && (
              <div className="thumb">
                <video ref={assignRemoteVideo} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div className="thumb-label">{callerName || 'Peer'}</div>
              </div>
            )}
          </div>

          {/* Main stage */}
          <div className="video-stage">
            {inCall ? (
              <>
                <video ref={assignRemoteVideo} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {stream && (
                  <div className="pip-video">
                    <video ref={assignLocalVideo} autoPlay muted playsInline />
                    <div className="pip-label">You</div>
                  </div>
                )}
                <div className="stage-msg">
                  <ShieldCheck size={13} style={{ color: 'var(--primary)' }} />
                  End-to-End Encrypted
                </div>
              </>
            ) : (
              <div className="waiting-overlay">
                <div className="w-icon">
                  <Video size={28} style={{ color: 'var(--text-2)' }} />
                </div>
                <p>{me ? 'Enter a peer ID to start a secure call' : 'Connecting to signaling server…'}</p>
              </div>
            )}
          </div>

          {/* Reactions floating */}
          {reactions.map(r => (
            <span key={r.id} className="reaction-particle" style={{ left: r.x, top: r.y }}>{r.emoji}</span>
          ))}

          {/* Controls */}
          <div className="controls-bar">
            <button className={`icon-btn ${isAudioMuted ? 'danger' : ''}`} onClick={toggleAudio} title={isAudioMuted ? 'Unmute' : 'Mute'} disabled={!stream}>
              {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button className={`icon-btn ${isVideoMuted ? 'danger' : ''}`} onClick={toggleVideo} title={isVideoMuted ? 'Show video' : 'Hide video'} disabled={!stream}>
              {isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
            </button>

            {/* Screen share */}
            <button className={`icon-btn ${isScreenSharing ? 'active' : ''}`} onClick={isScreenSharing ? stopScreenShare : startScreenShare} title={isScreenSharing ? 'Stop sharing' : 'Share screen'} disabled={!inCall}>
              {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
            </button>

            {/* Reactions */}
            <div style={{ position: 'relative' }}>
              <button className="icon-btn" onClick={() => setShowReactions(p => !p)} title="Reactions">
                <Smile size={20} />
              </button>
              {showReactions && (
                <div className="reaction-picker">
                  {reactionEmojis.map(e => (
                    <button key={e} className="reaction-pick-btn" onClick={() => sendReaction(e)}>{e}</button>
                  ))}
                </div>
              )}
            </div>

            {inCall
              ? <button className="icon-btn danger" onClick={leaveCall} title="Leave call"><PhoneOff size={22} /></button>
              : <button className="icon-btn active" onClick={() => callUser(idToCall)} disabled={!idToCall || !me} title="Call"><Phone size={22} /></button>
            }
          </div>
        </div>

        {/* Right sidebar */}
        <div className="sidebar-panel">
          <div className="sidebar-top">
            {/* Connection card */}
            <div className="connection-card">
              <div className="e2ee-badge"><ShieldCheck size={12} /> Military-Grade E2EE</div>

              <div>
                <div className="field-label">Your Connection ID</div>
                <div className="id-box">
                  <span>{me || 'Generating…'}</span>
                  <button className="copy-btn" onClick={copyId} title="Copy ID">
                    <Copy size={15} style={{ color: copied ? 'var(--primary)' : 'var(--text-2)' }} />
                  </button>
                </div>
              </div>

              {!inCall && (
                <div className="connect-section" style={{ padding: 0 }}>
                  <div className="field-label">Peer Connection ID</div>
                  <input
                    type="text"
                    placeholder="Paste peer's ID here…"
                    value={idToCall}
                    onChange={e => setIdToCall(e.target.value)}
                    style={{ marginBottom: 10 }}
                  />
                  <button
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '0.9rem', padding: '11px' }}
                    onClick={() => callUser(idToCall)}
                    disabled={!idToCall || !me}
                  >
                    <Phone size={16} /> Initiate Secure Call
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar tabs */}
            <div className="sidebar-tabs">
              <button className={`s-tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
                <MessageCircle size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />Chat
              </button>
              <button className={`s-tab ${activeTab === 'participants' ? 'active' : ''}`} onClick={() => setActiveTab('participants')}>
                <Users size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />People
              </button>
            </div>
          </div>

          {/* Chat tab */}
          {activeTab === 'chat' && (
            <div className="chat-area">
              <div className="chat-messages">
                {messages.length === 0
                  ? (
                    <div className="chat-empty">
                      <div className="ce-icon"><Lock size={20} style={{ color: 'var(--primary)' }} /></div>
                      <p>Messages are end-to-end encrypted<br />and never stored anywhere.</p>
                    </div>
                  )
                  : messages.map((m, i) => (
                    <div key={i} className={`msg ${m.sender}`}>{m.text}</div>
                  ))
                }
                <div ref={messagesEndRef} />
              </div>
              <form className="chat-input-row" onSubmit={sendMessage}>
                <input
                  type="text"
                  placeholder="Type a message…"
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  disabled={!inCall}
                />
                <button type="submit" className="send-btn" disabled={!inCall || !messageText.trim()}>
                  <Send size={16} />
                </button>
              </form>
            </div>
          )}

          {/* Participants tab */}
          {activeTab === 'participants' && (
            <div className="participants-area">
              <div className="participant-row">
                <div className="p-avatar">{getInitials(user.name)}</div>
                <span className="p-name">{user.name}</span>
                <span className="p-you">You</span>
              </div>
              {inCall && (
                <div className="participant-row anim-fade-in">
                  <div className="p-avatar" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    {callerName ? getInitials(callerName) : 'P'}
                  </div>
                  <span className="p-name">{callerName || 'Peer'}</span>
                  <span className="p-you" style={{ color: 'var(--primary)', fontSize: '0.7rem' }}>● Connected</span>
                </div>
              )}
              {!inCall && (
                <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: 16 }}>
                  No one else in the room yet.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <h3>⚙️ Settings</h3>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setShowSettings(false)}><X size={16} /></button>
            </div>
            <div className="settings-body">
              <div className="form-field">
                <label>Display Name</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="form-field">
                <label>Camera</label>
                <select className="settings-select" value={selCam} onChange={e => setSelCam(e.target.value)}>
                  <option value="">Default</option>
                  {devices.filter(d => d.kind === 'videoinput').map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera'}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Microphone</label>
                <select className="settings-select" value={selMic} onChange={e => setSelMic(e.target.value)}>
                  <option value="">Default</option>
                  {devices.filter(d => d.kind === 'audioinput').map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || 'Mic'}</option>
                  ))}
                </select>
              </div>
              <div className="settings-info">
                <AlertCircle size={13} /> Google Sign-In requires a Google OAuth Client ID configured server-side.
              </div>
            </div>
            <div className="settings-footer">
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={applySettings}>Apply Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming call overlay */}
      {receivingCall && !callAccepted && (
        <div className="call-overlay">
          <div className="call-modal">
            <div className="call-avatar-ring">📞</div>
            <h3>Incoming Secure Call</h3>
            <p><strong>{callerName || 'Someone'}</strong> wants to connect securely.</p>
            <div className="call-modal-btns">
              <button className="btn-primary" onClick={answerCall}>
                <Phone size={16} /> Accept
              </button>
              <button className="btn-danger" onClick={() => setReceivingCall(false)}>
                <PhoneOff size={16} /> Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────
// Root
// ────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const s = localStorage.getItem(SESSION_KEY);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });

  const [appMode, setAppMode] = useState<AppMode>('standard');

  // Apply data-mode + body background whenever mode changes
  useEffect(() => {
    document.documentElement.setAttribute('data-mode', appMode);
    document.body.style.background = MODES[appMode].bg;
    return () => {
      document.documentElement.removeAttribute('data-mode');
      document.body.style.background = '';
    };
  }, [appMode]);

  const handleAuth = (u: User) => setUser(u);
  const handleLogout = async () => {
    localStorage.removeItem(SESSION_KEY);
    await supabase.auth.signOut();
    setUser(null);
  };

  // Listen for Supabase auth state changes (e.g. after returning from Google)
  useEffect(() => {
    if (!import.meta.env.VITE_SUPABASE_URL) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'User', email: session.user.email || '' });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'User', email: session.user.email || '' });
      } else {
        // Only clear user if they log out via Supabase
        // Keep it if they logged in via the local fallback
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!user) return <AuthScreen onAuth={handleAuth} appMode={appMode} setAppMode={setAppMode} />;
  return <MainApp user={user} onLogout={handleLogout} appMode={appMode} setAppMode={setAppMode} />;
}
