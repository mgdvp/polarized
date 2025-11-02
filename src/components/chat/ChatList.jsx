import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ChatList = ({ conversations, selectedChatId, onSelect, loading, className }) => {
  const { t } = useTranslation();

  return (
    <div className={`chat-list ${className || ''}`}>
      <div className="chat-list-header">
        <Link to="/" className="chat-home-button mobile-only" aria-label="Home" title="Home" style={{ padding: 6 }}>
          <ion-icon name="home-outline" style={{ color: 'var(--text-primary)' }}></ion-icon>
        </Link>
        <span>{t('messages')}</span>
      </div>
      {loading ? (
        <div className="chat-list-empty">…</div>
      ) : conversations.length === 0 ? (
        <div className="chat-list-empty">{t('noChats')}</div>
      ) : (
        conversations.map((c) => {
          return (
          <button
            key={c.chatId}
            className={`chat-list-user ${c.chatId === selectedChatId ? 'selected' : ''}`}
            onClick={() => onSelect(c.chatId)}
          >
            <img
              src={c.other?.photoURL || '/avatar.png'}
              alt={c.other?.displayName || c.other?.username || c.otherUid}
              className="chat-list-avatar"
            />
            <div className="chat-list-content">
              <div className="chat-list-name">
                {c.other?.displayName || c.other?.username || `@${c.otherUid}`}
              </div>
              <div className="chat-list-last-message">
                {c.lastMessage?.text || ' '}
              </div>
            </div>
          </button>
        )})
      )}
    </div>
  );
};

export default ChatList;