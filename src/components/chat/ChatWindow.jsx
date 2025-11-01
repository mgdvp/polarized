import React, { useEffect, useRef, useState, useLayoutEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { rtdb } from '../../firebase';
import { ref, onValue, off, query, orderByChild, limitToLast } from 'firebase/database';

const ChatWindow = ({ chatId, uid, other, title, onBack }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const messagesRef = useRef(null);
  const detach = useRef(null);

  const otherUid = useMemo(() => {
    if (!chatId || !uid) return null;
    const parts = chatId.split('_');
    if (parts.length !== 2) return null;
    return parts[0] === uid ? parts[1] : parts[0];
  }, [chatId, uid]);

  // Seen indicator removed: no tracking of other's lastMessage

  useEffect(() => {
    if (!chatId) {
      if (detach.current) detach.current();
      setMessages([]);
      setLoaded(false);
      return;
    }

    const msgsRef = ref(rtdb, `messages/${chatId}`);
    const msgsQ = query(msgsRef, orderByChild('createdAt'), limitToLast(200));
    setLoaded(false);

    const handler = onValue(msgsQ, (snap) => {
      const arr = [];
      snap.forEach((child) => {
        arr.push({ id: child.key, ...child.val() });
      });
      setMessages(arr);
      setLoaded(true);
    });

    detach.current = () => off(msgsQ, 'value', handler);

    return () => {
      detach.current?.();
    };
  }, [chatId]);

  // Auto-scroll to bottom on new messages and when typing row appears
  useLayoutEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, otherTyping]);

  // // Also scroll when loading completes
  // useEffect(() => {
  //   if (!loaded) return;
  //   if (messagesRef.current) {
  //     messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  //   }
  // }, [loaded]);

  // Seen indicator removed: no writes to lastMessage.seen

  // typing indicator from other user: read from my userChats entry under other/typing
  useEffect(() => {
    if (!uid || !otherUid) return;
    const typingRef = ref(rtdb, `userChats/${uid}/${otherUid}/other/typing`);
    const unsub = onValue(typingRef, (snap) => {
      setOtherTyping(!!snap.val());
    });
    return () => off(typingRef);
  }, [uid, otherUid]);

  // Handle back button for mobile (prevent browser back and take to chat list)
  useEffect(() => {
    if (window.innerWidth > 600) return;

    const handlePopState = () => {
      onBack?.();
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onBack]);

  // Seen indicator removed: no calculation for last my message seen

  // If no chat selected
  if (!chatId) {
    return <div className="chat-empty">{t('selectAChat')}</div>;
  }


  // Seen indicator removed: no inline seen state

  return (
    <>
      <div className='chat-info-mobile'>
        {onBack && <button onClick={onBack}>⬅️</button>}
        <span>{title}</span>
      </div>

      <div
        ref={messagesRef}
        className="chat-messages"
      >
        {!loaded ? (
          <div>…</div>
        ) : messages.length === 0 ? (
          <div className="chat-no-messages">{t('noMessages')}</div>
        ) : (
          messages.map((m, i) => {
            const fromMe = m.senderId === uid;
            const showAvatar = !fromMe && (i === 0 || (messages[i-1] && messages[i-1].senderId === uid));
            return (
              <div key={m.id} className={`chat-msg-wrapper ${fromMe ? 'from-me' : 'from-other'} ${showAvatar ? 'with-avatar' : ''}`}>
                {!fromMe && showAvatar && (
                  <img
                    className="chat-msg-avatar"
                    src={other?.photoURL || '/avatar.png'}
                    alt={title || 'User'}
                    onError={(e) => { e.currentTarget.src = '/avatar.png'; }}
                  />
                )}
                <div className="chat-msg">{m.text}</div>
                {/* Seen indicator removed */}
              </div>
            );
          })
        )}
        {otherTyping && (
          <div className="chat-msg-wrapper from-other typing-row">
            <div className="chat-msg typing" aria-label={t('typing') || 'typing'}>
              <span className="typing-dots" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ChatWindow;
