import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, ArrowLeft, Plus, Lock } from 'lucide-react';
import '../App.css';

export default function JoinMeeting({ user }: any) {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 10).toLowerCase();
  };

  const createRoom = () => {
    const id = generateRoomId();
    navigate(`/meeting/${id}`);
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      navigate(`/meeting/${roomId.trim().toLowerCase()}`);
    }
  };

  return (
    <div className="app-shell" style={{ position: 'relative' }}>
      <nav className="navbar">
        <div className="nav-brand" onClick={() => navigate('/')} style={{cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
          <ArrowLeft size={18} style={{ color: 'var(--primary)', marginRight: 8 }} />
          <Lock size={18} style={{ color: 'var(--primary)', marginRight: 4 }} />
          Hush<span className="dot">.</span>
        </div>
        <div className="nav-right">
           <div className="user-pill">
             <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
             <span>{user.name}</span>
           </div>
        </div>
      </nav>

      <div className="app-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="auth-form-wrap anim-fade-up" style={{ maxWidth: 400, width: '100%' }}>
          <h2 style={{textAlign: 'center', marginBottom: 10}}>Group Meeting</h2>
          <p className="auth-form-sub" style={{textAlign: 'center', marginBottom: 30}}>Join an existing end-to-end encrypted meeting or create a new one.</p>
          
          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '12px', marginBottom: 20 }} onClick={createRoom}>
            <Plus size={18} style={{marginRight: 8}}/> Create New Meeting
          </button>
          
          <div className="auth-divider">or join with code</div>

          <form className="auth-form" onSubmit={joinRoom} style={{marginTop: 20}}>
            <div className="form-field">
              <input
                type="text"
                placeholder="Enter room code"
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                style={{textAlign: 'center', letterSpacing: '2px', fontSize: '1.2rem'}}
              />
            </div>
            <button type="submit" className="btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '12px' }} disabled={!roomId.trim()}>
              <Video size={18} style={{marginRight: 8}}/> Join Meeting
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
