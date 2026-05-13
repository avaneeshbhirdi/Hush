import React from 'react';
import VideoCard from './VideoCard';

interface VideoGridProps {
  participants: {
    id: string;
    stream: MediaStream | null;
    name: string;
    isLocal?: boolean;
  }[];
}

export default function VideoGrid({ participants }: VideoGridProps) {
  // Determine grid layout based on number of participants
  const count = participants.length;
  let gridClass = 'grid-1';
  if (count === 2) gridClass = 'grid-2';
  else if (count === 3 || count === 4) gridClass = 'grid-4';
  else if (count > 4) gridClass = 'grid-6';

  return (
    <div className={`video-grid ${gridClass}`}>
      {participants.map(p => (
        <VideoCard key={p.id} stream={p.stream} name={p.name} isLocal={p.isLocal} />
      ))}
    </div>
  );
}
