import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ShieldCheck, Copy, ArrowLeft, Users } from 'lucide-react';
import VideoGrid from './VideoGrid';
import ControlsBar from './ControlsBar';
import '../App.css';

export default function MeetingRoom({ user }: any) {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ id: string; stream: MediaStream; name: string }[]>([]);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const myId = useRef(Math.random().toString(36).substring(2, 15));
  const peersRef = useRef<{ [key: string]: RTCPeerConnection }>({});
  const channelRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setLocalStream(stream);
        localStreamRef.current = stream;
        joinMeeting();
      })
      .catch(err => {
        console.error("Error accessing media devices", err);
        // Fallback: try to join without video/audio if user denied
        joinMeeting();
      });

    return () => {
      leaveMeeting();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createPeerConnection = (targetUserId: string, targetName: string) => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ],
    });

    peersRef.current[targetUserId] = peer;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peer.addTrack(track, localStreamRef.current!);
      });
    }

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { target: targetUserId, sender: myId.current, candidate: event.candidate }
        });
      }
    };

    peer.ontrack = (event) => {
      setRemoteStreams(prev => {
        const existing = prev.find(p => p.id === targetUserId);
        if (existing) return prev;
        return [...prev, { id: targetUserId, stream: event.streams[0], name: targetName }];
      });
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed' || peer.connectionState === 'closed') {
        removePeer(targetUserId);
      }
    };

    return peer;
  };

  const removePeer = (targetUserId: string) => {
    if (peersRef.current[targetUserId]) {
      peersRef.current[targetUserId].close();
      delete peersRef.current[targetUserId];
    }
    setRemoteStreams(prev => prev.filter(p => p.id !== targetUserId));
  };

  const joinMeeting = () => {
    if (!roomId) return;
    const channel = supabase.channel(`meeting-${roomId}`);
    channelRef.current = channel;

    channel.on('broadcast', { event: 'user-joined' }, async (payload) => {
      const { sender, name } = payload.payload;
      if (sender === myId.current) return;
      
      const peer = createPeerConnection(sender, name);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      
      channel.send({
        type: 'broadcast',
        event: 'offer',
        payload: { target: sender, sender: myId.current, name: user.name, offer }
      });
    });

    channel.on('broadcast', { event: 'offer' }, async (payload) => {
      const { target, sender, name, offer } = payload.payload;
      if (target !== myId.current) return;

      const peer = createPeerConnection(sender, name);
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      channel.send({
        type: 'broadcast',
        event: 'answer',
        payload: { target: sender, sender: myId.current, answer }
      });
    });

    channel.on('broadcast', { event: 'answer' }, async (payload) => {
      const { target, sender, answer } = payload.payload;
      if (target !== myId.current) return;

      const peer = peersRef.current[sender];
      if (peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    channel.on('broadcast', { event: 'ice-candidate' }, async (payload) => {
      const { target, sender, candidate } = payload.payload;
      if (target !== myId.current) return;

      const peer = peersRef.current[sender];
      if (peer && peer.remoteDescription) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding ice candidate", e);
        }
      } else {
        // Queue if remote desc is not set
        setTimeout(async () => {
           if (peersRef.current[sender]?.remoteDescription) {
             try { await peersRef.current[sender].addIceCandidate(new RTCIceCandidate(candidate)); } catch(e){}
           }
        }, 1500);
      }
    });

    channel.on('broadcast', { event: 'user-left' }, (payload) => {
      removePeer(payload.payload.sender);
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'user-joined',
          payload: { sender: myId.current, name: user.name }
        });
      }
    });
  };

  const leaveMeeting = () => {
    if (channelRef.current) {
      channelRef.current.send({
         type: 'broadcast',
         event: 'user-left',
         payload: { sender: myId.current }
      });
      supabase.removeChannel(channelRef.current);
    }
    Object.keys(peersRef.current).forEach(key => peersRef.current[key].close());
    peersRef.current = {};
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    
    navigate('/join');
  };

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = isAudioMuted;
        setIsAudioMuted(!isAudioMuted);
      }
    }
  }, [isAudioMuted]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getVideoTracks()[0];
      if (track) {
        track.enabled = isVideoMuted;
        setIsVideoMuted(!isVideoMuted);
      }
    }
  }, [isVideoMuted]);

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      const vTrack = localStreamRef.current?.getVideoTracks()[0];
      Object.keys(peersRef.current).forEach(key => {
        const peer = peersRef.current[key];
        const sender = peer.getSenders().find(s => s.track?.kind === 'video');
        if (sender && vTrack) sender.replaceTrack(vTrack);
      });
      setIsScreenSharing(false);
      setLocalStream(localStreamRef.current);
    } else {
      try {
        const screen = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
        screenStreamRef.current = screen;
        const vTrack = screen.getVideoTracks()[0];
        
        Object.keys(peersRef.current).forEach(key => {
          const peer = peersRef.current[key];
          const sender = peer.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(vTrack);
        });
        
        setIsScreenSharing(true);
        setLocalStream(screen);

        vTrack.onended = () => {
          toggleScreenShare(); // Stop sharing when user clicks "Stop sharing" in browser UI
        };
      } catch (e) {
        console.error("Screen share cancelled", e);
      }
    }
  };

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const participants = [
    { id: myId.current, stream: localStream, name: `${user.name} (You)`, isLocal: true },
    ...remoteStreams
  ];

  return (
    <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top Navbar */}
      <nav className="navbar" style={{ position: 'relative', zIndex: 10 }}>
        <div className="nav-brand" onClick={() => navigate('/join')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={18} style={{ color: 'var(--primary)', marginRight: 8 }} />
          Hush Meeting
        </div>
        
        <div className="nav-meta" style={{ display: 'flex', gap: '15px' }}>
           <div className="e2ee-badge" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', fontSize: '0.8rem', fontWeight: 600 }}>
             <ShieldCheck size={14} style={{ marginRight: 4 }} /> E2EE Secure
           </div>
           
           <div className="id-box" style={{ padding: '4px 10px', background: 'var(--surface-2)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <span style={{ fontSize: '0.9rem', color: 'var(--text-1)', letterSpacing: '1px', textTransform: 'uppercase' }}>{roomId}</span>
             <button className="copy-btn" onClick={copyRoomId} title="Copy Room ID" style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
               <Copy size={14} style={{ color: copied ? 'var(--primary)' : 'var(--text-2)' }} />
             </button>
           </div>
        </div>

        <div className="nav-right">
           <div className="user-pill" style={{ background: 'var(--surface-2)' }}>
             <Users size={16} style={{ color: 'var(--primary)', marginRight: 6 }} />
             <span style={{ fontWeight: 600 }}>{participants.length}</span>
           </div>
        </div>
      </nav>

      {/* Main Video Area */}
      <div className="meeting-body" style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', background: '#000' }}>
         <div style={{ flex: 1, padding: '10px', overflow: 'hidden', display: 'flex' }}>
           <VideoGrid participants={participants} />
         </div>
         
         <ControlsBar 
           isAudioMuted={isAudioMuted}
           isVideoMuted={isVideoMuted}
           isScreenSharing={isScreenSharing}
           toggleAudio={toggleAudio}
           toggleVideo={toggleVideo}
           toggleScreenShare={toggleScreenShare}
           leaveMeeting={leaveMeeting}
         />
      </div>
    </div>
  );
}
