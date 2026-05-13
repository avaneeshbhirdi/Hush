import React, { useEffect, useRef } from 'react';

interface VideoCardProps {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
}

export default function VideoCard({ stream, name, isLocal = false }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="video-card">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="video-element"
        />
      ) : (
        <div className="video-placeholder">
          <div className="avatar-large">{name.charAt(0).toUpperCase()}</div>
        </div>
      )}
      <div className="video-label">{name}</div>
    </div>
  );
}
