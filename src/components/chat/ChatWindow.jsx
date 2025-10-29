import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { rtdb } from '../../firebase';
import { ref, onValue, off, set } from 'firebase/database';

const ChatWindow = ({ chatId, uid, title, onBack }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const messagesRef = useRef(null);
  const detach = useRef(null);

  useEffect(() => {
    if(window.innerWidth <= 600) {
      document.querySelector('.app-header').style.display = 'none';
    };

    if (!chatId) {
      if (detach.current) detach.current();
      setMessages([]);
      setLoaded(false);
      return;
    }

    const msgsRef = ref(rtdb, `messages/${chatId}`); // <-- template literal düzgün
    setLoaded(false);

    const handler = onValue(msgsRef, (snap) => {
      const val = snap.val() || {};
      const arr = Object.entries(val)
        .map(([id, m]) => ({ id, ...m }))
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

      setMessages(arr);
      setLoaded(true);
    });

    detach.current = () => off(msgsRef, 'value', handler);

    return () => detach.current?.();
  }, [chatId]);

  // Auto-scroll to bottom on new messages
  useLayoutEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle back button for mobile (prevent browser back and take to chat list)
  useEffect(() => {
    if (window.innerWidth > 600) return;
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      onBack?.();
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onBack]);

  // If no chat selected
  if (!chatId) {
    return <div style={{ margin: 'auto', color: '#666' }}>{t('selectAChat')}</div>;
  }

  return (
    <>
      <div className='chat-info-mobile'>
        {onBack && <button onClick={onBack}>⬅️</button>}
        <span>{title}</span>
      </div>

      <div
        ref={messagesRef}
        style={{ flex: 1, overflowY: 'auto', padding: 16 }}
        className="chat-messages"
      >
        {!loaded ? (
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
