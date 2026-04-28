"use client";

import { VoiceChat } from "@/components/ui/chat-bubble";

// Mock user data for the demo
// Replaced with Unsplash image URLs as requested
const mockUsers = [
  {
    id: "user-1",
    name: "Oguz",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    isSpeaking: true,
  },
  {
    id: "user-2",
    name: "Ashish",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80",
  },
  {
    id: "user-3",
    name: "Mariana",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
  },
  {
    id: "user-4",
    name: "MDS",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
  },
  {
    id: "user-5",
    name: "Ana",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80",
  },
  {
    id: "user-6",
    name: "Natko",
    avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80",
    isSpeaking: true,
  },
  {
    id: "user-7",
    name: "Afshin",
    avatarUrl: "https://images.unsplash.com/photo-1488161628813-04466f872507?auto=format&fit=crop&w=150&q=80",
  },
  {
    id: "user-8",
    name: "Jane",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80",
  },
];

/**
 * A demo component to showcase the VoiceChat functionality.
 */
const VoiceChatDemo = () => {
  // Handler for the join action
  const handleJoinChat = () => {
    // In a real app, this would contain logic to join the voice channel
    console.log("Attempting to join the voice chat...");
    alert("Joining voice chat!");
  };

  return (
    <div className="flex h-[200px] items-start justify-center rounded-lg bg-background p-8">
      <VoiceChat users={mockUsers} onJoin={handleJoinChat} />
    </div>
  );
};

export default VoiceChatDemo;
