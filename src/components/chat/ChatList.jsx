import React from 'react';
import { useTranslation } from 'react-i18next';

const ChatList = ({ conversations, selectedChatId, onSelect, loading, className }) => {
  const { t } = useTranslation();

  return (
    <div className={`chat-list ${className || ''}`} style={{ width: 320, borderRight: '1px solid #444', paddingRight: 12, overflowY: 'auto' }}>
      <div style={{ padding: 12, fontWeight: 600 }}>{t('messages')}</div>
      {loading ? (
        <div style={{ padding: 12 }}>…</div>
      ) : conversations.length === 0 ? (
        <div style={{ padding: 12 }}>{t('noChats')}</div>
      ) : (
        conversations.map((c) => (
          <button
            key={c.chatId}
            className="chat-list-user"
            onClick={() => onSelect(c.chatId)}
            style={{
              background: c.chatId === selectedChatId ? '#363636' : '#262626',
            }}
          >
            <img
              src={c.other?.photoURL || '/avatar.png'}
              alt={c.other?.displayName || c.other?.username || c.otherUid}
              style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>
                {c.other?.displayName || c.other?.username || `@${c.otherUid}`}
              </div>
              <div className="chat-list-last-message">
                {c.lastMessage?.text || ' '}
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
};

export default ChatList;