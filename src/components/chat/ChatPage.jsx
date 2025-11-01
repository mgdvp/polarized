import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { rtdb, db } from '../../firebase';
import { ref, onValue, off, update, push, serverTimestamp, set } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';

import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import MessageInput from './MessageInput';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const ChatPage = ({ currentUser }) => {
  const query = useQuery();
  const initialChatId = query.get('chatId') || null;

  const [conversations, setConversations] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(initialChatId);
  const [selectedChatOtherUserName, setSelectedChatOtherUserName] = useState(null);
  const [selectedChatOther, setSelectedChatOther] = useState(null);
  const [loadingChats, setLoadingChats] = useState(true);

  const uid = currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    setLoadingChats(true);
    const userChatsRef = ref(rtdb, `userChats/${uid}`);
    // console.log('Current user UID:', currentUser?.uid);
    // console.log('Setting up listener for userChats/', uid);
    const unsub = onValue(userChatsRef, async (snap) => {
      // console.log('Triggered, exists:', snap.exists());
      const val = snap.val() || {};
      const arr = await Promise.all(
        Object.entries(val).map(async ([otherUid, data]) => {
          let other = data.other || null;
          if (!other) {
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
      arr.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setConversations(arr);
      setLoadingChats(false);

      // if (!selectedChatId && arr.length > 0 && typeof window !== 'undefined' && window.innerWidth > 600) {
      //   setSelectedChatId(arr[0].chatId);
      //   setSelectedChatOtherUserName(arr[0].other?.displayName || arr[0].other?.username || `@${arr[0].otherUid}`);
      //   setSelectedChatOther(arr[0].other || { uid: arr[0].otherUid });
      // }
    });
    return () => off(userChatsRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const getOtherUidFromChatId = (chatId) => {
    if (!chatId || !uid) return null;
    const parts = chatId.split('_');
    if (parts.length === 2) {
      return parts[0] === uid ? parts[1] : parts[0];
    }
    return null;
  };

  const sendMessage = async (text) => {
    if (!text || !uid || !selectedChatId) return;
    console.log(selectedChatId)
    const otherUid = getOtherUidFromChatId(selectedChatId);


    const newMsgRef = push(ref(rtdb, `messages/${selectedChatId}`));
    const message = { senderId: uid, text, createdAt: serverTimestamp() };

    // 1️⃣ Mesajı /messages/... path’ine yaz
    await set(newMsgRef, message); // senderId check geçiyor

    // 2️⃣ /chats/... path’ini ayrı update et
    await update(ref(rtdb, `chats/${selectedChatId}`), {
      lastMessage: message,
      updatedAt: serverTimestamp()
    });

    // 3️⃣ /userChats/... path’ini ayrı update et
    if (otherUid) {
      await update(ref(rtdb, `userChats/${uid}/${otherUid}`), {
        lastMessage: message,
        updatedAt: serverTimestamp()
      });

      await update(ref(rtdb, `userChats/${otherUid}/${uid}`), {
        lastMessage: message,
        updatedAt: serverTimestamp()
      });
    }
  };


  return (
    <div className="chat-page" style={{ display: 'flex', height: 'calc(100vh - 112px)', gap: 16 }}>
      <ChatList
        className={selectedChatId ? 'hidden-mobile' : ''}
        conversations={conversations}
        selectedChatId={selectedChatId}
        onSelect={(chatId) => {
          setSelectedChatId(chatId);
          const c = conversations.find((x) => x.chatId === chatId);
          setSelectedChatOtherUserName(c?.other?.displayName || c?.other?.username || (c ? `@${c.otherUid}` : ''));
          setSelectedChatOther(c?.other || (c ? { uid: c.otherUid } : null));
        }}
        loading={loadingChats}
      />
      <div className={`chat-window ${selectedChatId ? '' : 'hidden-mobile'}`} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <ChatWindow chatId={selectedChatId} uid={uid} other={selectedChatOther} title={selectedChatOtherUserName} onBack={() => setSelectedChatId(null)} />
        <MessageInput onSend={sendMessage} disabled={!selectedChatId || !uid} chatId={selectedChatId} uid={uid} other={selectedChatOther} />
      </div>
    </div>
  );
};

export default ChatPage;
