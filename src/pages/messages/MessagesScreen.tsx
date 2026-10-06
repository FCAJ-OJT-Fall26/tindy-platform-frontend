import React, { useState, useEffect } from 'react';
import { Search, Paperclip, Send, Users, Shield } from 'lucide-react';

interface MessagesScreenProps {
  onNavigateTeam: () => void;
  onNotify: (text: string) => void;
  selectedConversation?: string;
}

interface ChatChannel {
  id: string;
  name: string;
  avatar: string;
  subtitle: string;
  role: string;
  status: string;
  isTeam: boolean;
}

const CHANNELS: Record<string, ChatChannel> = {
  'EcoTrack Team': {
    id: 'ecotrack',
    name: 'EcoTrack Team',
    avatar: 'ET',
    subtitle: 'Active Sprint Channel · 4 members',
    role: 'Frontend Engineering Sprint',
    status: 'Sprint 3 In Progress',
    isTeam: true,
  },
  'Jamie Le': {
    id: 'jamie',
    name: 'Jamie Le',
    avatar: 'JL',
    subtitle: 'Project Lead · EcoTrack',
    role: 'Lead Project Coordinator',
    status: 'Online',
    isTeam: false,
  },
  'StudyBuddy Team': {
    id: 'studybuddy',
    name: 'StudyBuddy Team',
    avatar: 'SB',
    subtitle: 'Sprint Planning Channel · 3 members',
    role: 'EdTech AI Project',
    status: 'Kickoff Friday',
    isTeam: true,
  },
};

const DEFAULT_MESSAGES: Record<string, string[]> = {
  'EcoTrack Team': [
    'Jamie Le: Welcome Alex to the EcoTrack sprint! Kelly has updated the telemetry wireframes.',
    'Alex Le: Thanks Jamie! I am currently working on the solar energy sensor components and chart hooks.',
    'Kelly Tran: The color tokens and chart specs are pushed to GitHub branch `feature/telemetry`.',
  ],
  'Jamie Le': [
    'Hello Alex, your experience with React and state management aligns well with the EcoTrack sprint requirements.',
    'Thank you Jamie. I have reviewed the technical specifications and sprint roadmap.',
  ],
  'StudyBuddy Team': [
    'Michael Kim: Welcome team! We will be syncing on the FastAPI endpoints tomorrow morning.',
    'Alex Le: Looking forward to it, let me know if you need help with the OpenAPI schema.',
  ],
};

export default function MessagesScreen({
  onNavigateTeam,
  onNotify,
  selectedConversation,
}: MessagesScreenProps) {
  const [activeChat, setActiveChat] = useState<string>(
    selectedConversation || 'EcoTrack Team'
  );
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');

  // Per-conversation message storage
  const [conversationsMap, setConversationsMap] = useState<Record<string, string[]>>(
    DEFAULT_MESSAGES
  );

  useEffect(() => {
    if (selectedConversation && CHANNELS[selectedConversation]) {
      setActiveChat(selectedConversation);
    }
  }, [selectedConversation]);

  const channelInfo = CHANNELS[activeChat] || CHANNELS['EcoTrack Team'];
  const currentMessages = conversationsMap[activeChat] || [];

  const handleSelectChannel = (name: string) => {
    setActiveChat(name);
    onNotify(`Switched to ${name}`);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;

    setConversationsMap((prev) => ({
      ...prev,
      [activeChat]: [...(prev[activeChat] || []), `Alex Le: ${draft.trim()}`],
    }));

    setDraft('');
    onNotify('Message sent');
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ACADEMIC PROJECT DISCOVERY & COLLABORATION</div>
          <h1>
            Direct Communications<span className="heading-dot">.</span>
          </h1>
          <p>Collaborate with project leads, candidates, and team members.</p>
        </div>
      </div>

      <section className="chat-panel">
        <aside className="chat-list">
          <label className="search-field">
            <Search size={15} />
            <input
              placeholder="Search conversations..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {Object.keys(CHANNELS)
            .filter((person) => person.toLowerCase().includes(query.toLowerCase()))
            .map((person) => {
              const ch = CHANNELS[person];
              const isActive = activeChat === person;
              return (
                <button
                  key={person}
                  onClick={() => handleSelectChannel(person)}
                  className={`conversation ${isActive ? 'active' : ''} cursor-pointer`}
                >
                  <span className="avatar">{ch.avatar}</span>
                  <div>
                    <strong>{ch.name}</strong>
                    <small>{ch.subtitle}</small>
                  </div>
                  <i />
                </button>
              );
            })}
        </aside>

        <div className="chat-main">
          <div className="chat-heading">
            <span className="avatar">{channelInfo.avatar}</span>
            <div>
              <h3>{channelInfo.name}</h3>
              <small>
                <i className="live-dot" /> {channelInfo.subtitle}
              </small>
            </div>
            <button className="button outline text-xs ml-auto cursor-pointer" onClick={onNavigateTeam}>
              View Team Workspace
            </button>
          </div>

          <div className="chat-messages">
            <span className="date-separator">Today, October 6</span>
            {currentMessages.map((msg, index) => {
              const isMine = msg.startsWith('Alex Le:');
              return (
                <div className={`message ${isMine ? 'outgoing' : ''}`} key={index}>
                  <p>{msg}</p>
                  <small>
                    10:{24 + index} AM {isMine ? '(Delivered)' : ''}
                  </small>
                </div>
              );
            })}
          </div>

          <form className="chat-input" onSubmit={handleSend}>
            <label className="icon-button cursor-pointer" aria-label="Attach documentation">
              <Paperclip size={16} />
              <input
                type="file"
                hidden
                onChange={() => onNotify('Attachment selected')}
              />
            </label>
            <input
              placeholder={`Write message to ${channelInfo.name}...`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className="button primary cursor-pointer" aria-label="Send message">
              <Send size={15} />
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
