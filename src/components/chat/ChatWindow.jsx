import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rtdb } from '../../firebase';
import { ref, onValue, off } from 'firebase/database';

const ChatWindow = ({ chatId, uid, title, onBack }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef(null);
  const detach = useRef(null);

  useEffect(() => {
    if (!chatId) {
      if (detach.current) detach.current();
      setMessages([]);
      return;
    }
    const msgsRef = ref(rtdb, `messages/${chatId}`);
    setLoading(true);
    const handler = onValue(msgsRef, (snap) => {
      const val = snap.val() || {};
      const arr = Object.entries(val)
        .map(([id, m]) => ({ id, ...m }))
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setMessages(arr);
      setLoading(false);
      // Scroll to bottom
      if (messagesRef.current) {
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }
    });
    detach.current = () => off(msgsRef, 'value', handler);
    return () => detach.current?.();
  }, [chatId]);

  if (!chatId) {
    return <div style={{ margin: 'auto', color: '#666' }}>{t('selectAChat')}</div>;
  }

  return (
    <>
      <div className='chat-info-mobile'>
        {onBack && (
          <button onClick={onBack}>⬅️</button>
        )}
        <span>{title}</span>
      </div>
      <div ref={messagesRef} style={{ flex: 1, overflowY: 'auto', padding: 16 }} className="chat-messages">
        {loading ? (
          <div>…</div>
        ) : messages.length === 0 ? (
          <div style={{ color: '#666' }}>{t('noMessages')}</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="chat-msg-wrapper" style={{ justifyContent: m.senderId === uid ? 'flex-end' : 'flex-start' }}>
              <div className="chat-msg">{m.text}</div>
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default ChatWindow;