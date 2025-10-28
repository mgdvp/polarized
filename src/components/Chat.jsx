import React, { useEffect, useMemo, useRef, useState, useLayoutEffect, use } from 'react';
import { useLocation } from 'react-router-dom';
import { rtdb, db } from '../firebase';
import { ref, onValue, off, update, push, serverTimestamp, get, child } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const Chat = ({ currentUser }) => {
  const { t } = useTranslation();
  const query = useQuery();
  const initialChatId = query.get('chatId') || null;

  const [conversations, setConversations] = useState([]); // [{otherUid, chatId, lastMessage, updatedAt, other}]
  const [selectedChatId, setSelectedChatId] = useState(initialChatId);
  const [selectedChatOtherUserName, setSelectedChatOtherUserName] = useState(null);
  const [messages, setMessages] = useState([]); // [{id, senderId, text, createdAt}]
  const [input, setInput] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesRef = useRef(null);
  const detachMessages = useRef(null);

  const uid = currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    setLoadingChats(true);
    const userChatsRef = ref(rtdb, `userChats/${uid}`);
    const unsub = onValue(userChatsRef, async (snap) => {
      const val = snap.val() || {};
      // Transform mapping to array
      const arr = await Promise.all(
        Object.entries(val).map(async ([otherUid, data]) => {
          let other = data.other || null;
          if (!other) {
            // Fetch from Firestore users collection for display
            try {
              const otherDoc = await getDoc(doc(db, 'users', otherUid));
              if (otherDoc.exists()) {
                const od = otherDoc.data();
                other = { uid: otherUid, username: od.username || '', displayName: od.displayName || '', photoURL: od.photoURL || '' };
              }
            } catch (_) {}
          }
          return { otherUid, ...data, other };
        })
      );
      // Sort by updatedAt desc
      arr.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setConversations(arr);
      setLoadingChats(false);

      // Auto-select first if none selected
      if (!selectedChatId && arr.length > 0 && window.innerWidth > 600) {
        setSelectedChatId(arr[0].chatId);
        setSelectedChatOtherUserName(arr[0].other?.displayName || arr[0].other?.username || `@${arr[0].otherUid}`);
      }
    });
    return () => off(userChatsRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useLayoutEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Listen to messages for selected chat
  useEffect(() => {
    if (!selectedChatId) {
      if (detachMessages.current) detachMessages.current();
      setMessages([]);
      return;
    }
    const msgsRef = ref(rtdb, `messages/${selectedChatId}`);
    setLoadingMessages(true);
    const handler = onValue(msgsRef, (snap) => {
      const val = snap.val() || {};
      const arr = Object.entries(val)
        .map(([id, m]) => ({ id, ...m }))
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setMessages(arr);
      setLoadingMessages(false);
      // Scroll to bottom
        if (messagesRef.current) {
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
    });
    detachMessages.current = () => off(msgsRef, 'value', handler);
    return () => detachMessages.current?.();
  }, [selectedChatId]);

  const getOtherUidFromChatId = (chatId) => {
    if (!chatId || !uid) return null;
    const parts = chatId.split('_');
    if (parts.length === 2) {
      return parts[0] === uid ? parts[1] : parts[0];
    }
    return null;
  };

  const sendMessage = async (e) => {
    e?.preventDefault?.();
    const text = input.trim();
    setInput('');
    if (!text || !uid || !selectedChatId) return;

    const otherUid = getOtherUidFromChatId(selectedChatId);

    try {
      const newMsgRef = push(ref(rtdb, `messages/${selectedChatId}`));
      const message = { senderId: uid, text, createdAt: Date.now() };
      // Write message and update metadata in one multi-location update
      const updates = {};
      updates[`/messages/${selectedChatId}/${newMsgRef.key}`] = message;
      updates[`/chats/${selectedChatId}/lastMessage`] = message;
      updates[`/chats/${selectedChatId}/updatedAt`] = serverTimestamp();
      if (otherUid) {
        updates[`/userChats/${uid}/${otherUid}/lastMessage`] = message;
        updates[`/userChats/${uid}/${otherUid}/updatedAt`] = serverTimestamp();
        updates[`/userChats/${otherUid}/${uid}/lastMessage`] = message;
        updates[`/userChats/${otherUid}/${uid}/updatedAt`] = serverTimestamp();
      }
      await update(ref(rtdb), updates);
      setInput('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <div className="chat-page" style={{ display: 'flex', height: 'calc(100vh - 112px)', gap: 16 }}>
      <div className={`chat-list ${selectedChatId ? 'hidden-mobile' : ''}`} style={{ width: 320, borderRight: '1px solid #444', paddingRight: 12, overflowY: 'auto' }}>
        <div style={{ padding: 12, fontWeight: 600 }}>{t('messages')}</div>
        {loadingChats ? (
          <div style={{ padding: 12 }}>…</div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: 12 }}>{t('noChats')}</div>
        ) : (
          conversations.map((c) => (
            <button
              key={c.chatId}
              className='chat-list-user'
              onClick={() => {
                setSelectedChatId(c.chatId);
                setSelectedChatOtherUserName(c.other?.displayName || c.other?.username || `@${c.otherUid}`);
              }}
              style={{background: c.chatId === selectedChatId ? '#363636' : '#262626',}}
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
                <div style={{ color: '#999', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.lastMessage?.text || ' '}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
      <div className={`chat-window ${selectedChatId ? '' : 'hidden-mobile'}`} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!selectedChatId ? (
          <div style={{ margin: 'auto', color: '#666' }}>{t('selectAChat')}</div>
        ) : (
          <>
            <div className='chat-info-mobile'>
              <button onClick={() => setSelectedChatId(null)}>⬅️</button>
              <span>{selectedChatOtherUserName}</span>
            </div>
            <div ref={messagesRef} style={{ flex: 1, overflowY: 'auto', padding: 16 }} className="chat-messages">
              {loadingMessages ? (
                <div>…</div>
              ) : messages.length === 0 ? (
                <div style={{ color: '#666' }}>{t('noChats')}</div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="chat-msg-wrapper" style={{ justifyContent: m.senderId === uid ? 'flex-end' : 'flex-start' }}>
                    <div className="chat-msg">{m.text}</div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8, padding: 12, flexDirection: 'row' }} className="comment-input">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('typeMessage')}
              />
              <button type="submit" className="btn-primary">{t('send')}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
export default Chat;