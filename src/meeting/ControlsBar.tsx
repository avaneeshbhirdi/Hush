import React from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PhoneOff } from 'lucide-react';

interface ControlsBarProps {
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  leaveMeeting: () => void;
}

export default function ControlsBar({
  isAudioMuted,
  isVideoMuted,
  isScreenSharing,
  toggleAudio,
  toggleVideo,
  toggleScreenShare,
  leaveMeeting
}: ControlsBarProps) {
  return (
    <div className="controls-bar meeting-controls">
      <button className={`icon-btn ${isAudioMuted ? 'danger' : ''}`} onClick={toggleAudio} title={isAudioMuted ? 'Unmute' : 'Mute'}>
        {isAudioMuted ? <MicOff size={22} /> : <Mic size={22} />}
      </button>
      <button className={`icon-btn ${isVideoMuted ? 'danger' : ''}`} onClick={toggleVideo} title={isVideoMuted ? 'Show video' : 'Hide video'}>
        {isVideoMuted ? <VideoOff size={22} /> : <Video size={22} />}
      </button>

      <button className={`icon-btn ${isScreenSharing ? 'active' : ''}`} onClick={toggleScreenShare} title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
        {isScreenSharing ? <MonitorOff size={22} /> : <Monitor size={22} />}
      </button>

      <button className="icon-btn danger leave-btn" onClick={leaveMeeting} title="Leave Meeting">
        <PhoneOff size={24} />
      </button>
    </div>
  );
}
