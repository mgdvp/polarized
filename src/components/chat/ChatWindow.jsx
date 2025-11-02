import React, { useEffect, useRef, useState, useLayoutEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { rtdb } from '../../firebase';
import { ref, onValue, off, query, orderByChild, limitToLast, onChildAdded, startAt, endAt, get } from 'firebase/database';
import MessageBubble from './MessageBubble';

const ChatWindow = ({ chatId, uid, other, title, onBack }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [otherTyping, setOtherTyping] = useState(false);
  const messagesRef = useRef(null);
  const detach = useRef(null);
  const detachNew = useRef(null);
  const oldestTsRef = useRef(null);
  const newestTsRef = useRef(null);
  const idSetRef = useRef(new Set());

  const otherUid = useMemo(() => {
    if (!chatId || !uid) return null;
    const parts = chatId.split('_');
    if (parts.length !== 2) return null;
    return parts[0] === uid ? parts[1] : parts[0];
  }, [chatId, uid]);

  useEffect(() => {
    // Cleanup previous listeners when chat changes
  detach.current?.();
  detachNew.current?.();

    if (!chatId) {
      setMessages([]);
      setLoaded(false);
      setHasMore(true);
      oldestTsRef.current = null;
      newestTsRef.current = null;
      idSetRef.current = new Set();
      return;
    }

    let cancelled = false;
  const msgsRef = ref(rtdb, `messages/${chatId}`);
    const initQ = query(msgsRef, orderByChild('createdAt'), limitToLast(50));
    setLoaded(false);
    setHasMore(true);
  idSetRef.current = new Set();

    (async () => {
      try {
        const snap = await get(initQ);
        if (cancelled) return;
        const arr = [];
        snap.forEach((child) => {
          arr.push({ id: child.key, ...child.val() });
        });
  // Already ordered ascending by createdAt because of limitToLast + orderByChild
  setMessages(arr);
  idSetRef.current = new Set(arr.map((m) => m.id));
        setLoaded(true);

        if (arr.length > 0) {
          oldestTsRef.current = Number(arr[0]?.createdAt) || 0;
          newestTsRef.current = Number(arr[arr.length - 1]?.createdAt) || 0;
        } else {
          oldestTsRef.current = null;
          newestTsRef.current = null;
          setHasMore(false);
        }

        // Subscribe only to new messages after the newest timestamp
        const startTs = (newestTsRef.current || 0) + 1; // strict greater than
        const newQ = query(msgsRef, orderByChild('createdAt'), startAt(startTs));
        const handler = onChildAdded(newQ, (child) => {
          const val = child.val();
          const msg = { id: child.key, ...val };
          // Append only if newer to avoid dupes
          const ts = Number(val?.createdAt) || 0;
          if (!newestTsRef.current || ts >= newestTsRef.current) {
            newestTsRef.current = ts;
          }
          // Global dedupe by id
          if (idSetRef.current.has(msg.id)) return;
          idSetRef.current.add(msg.id);
          setMessages((prev) => [...prev, msg]);
        });
        detachNew.current = () => off(newQ, 'child_added', handler);
      } catch (e) {
        console.warn('Failed initial messages load:', e);
        setLoaded(true);
      }
    })();

    // No onValue listener now; keep a no-op detach.current for symmetry
    detach.current = () => {};

    return () => {
      cancelled = true;
      detach.current?.();
      detachNew.current?.();
    };
  }, [chatId]);

  // Auto-scroll to bottom on new messages and when typing row appears
  useLayoutEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, otherTyping]);

  // preserve stickiness to bottom based on user scroll position
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    const onScroll = () => {
      // Load older when reaching top
      if (el.scrollTop <= 16) {
        loadOlder();
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [chatId]);

  const loadOlder = useCallback(async () => {
    if (!chatId || loadingOlder || !hasMore) return;
    const oldestTs = Number(oldestTsRef.current || 0);
    if (!oldestTs) return;
    try {
      setLoadingOlder(true);
      const el = messagesRef.current;
      const prevTop = el ? el.scrollTop : 0;
      const prevHeight = el ? el.scrollHeight : 0;

      const msgsRef = ref(rtdb, `messages/${chatId}`);
      // RTDB has endAt (inclusive); emulate endBefore by subtracting 1 ms
      const bound = oldestTs - 1;
      const olderQ = query(msgsRef, orderByChild('createdAt'), endAt(bound), limitToLast(50));
      const snap = await get(olderQ);
      const arr = [];
      snap.forEach((child) => {
        arr.push({ id: child.key, ...child.val() });
      });
      if (arr.length === 0) {
        setHasMore(false);
        return;
      }
      // Filter out any duplicate IDs to avoid React key collisions
      const filtered = arr.filter((m) => !idSetRef.current.has(m.id));
      if (filtered.length === 0) {
        // No new unique older messages found; assume no more
        setHasMore(false);
        return;
      }
      filtered.forEach((m) => idSetRef.current.add(m.id));
      // Prepend older
      setMessages((prev) => [...filtered, ...prev]);
      oldestTsRef.current = Number(filtered[0]?.createdAt) || oldestTsRef.current;

      // restore scroll position after DOM updates
      requestAnimationFrame(() => {
        const el2 = messagesRef.current;
        if (!el2) return;
        const newHeight = el2.scrollHeight;
        el2.scrollTop = (newHeight - prevHeight) + prevTop;
      });
    } catch (e) {
      console.warn('Failed to load older messages:', e);
    } finally {
      setLoadingOlder(false);
    }
  }, [chatId, loadingOlder, hasMore]);

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

  // Helper formatters moved outside map to avoid redefining on each iteration
  const GAP = 60 * 60 * 1000; // 1 hour
  const formatDate = useCallback((ts) => {
    if (!ts) return '';
    try {
      const d = new Date(Number(ts));
      const today = new Date();
      const y = new Date();
      y.setDate(today.getDate() - 1);
      const sameDay = (a, b) => a.toDateString() === b.toDateString();
      if (sameDay(d, today)) return t('time.today');
      if (sameDay(d, y)) return t('time.yesterday');
      return d.toLocaleDateString();
    } catch { return ''; }
  }, [t]);
  const formatTime = useCallback((ts) => {
    if (!ts) return '';
    try { return new Date(Number(ts)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
  }, []);

  // If no chat selected
  if (!chatId) {
    return <div className="chat-empty">{t('selectAChat')}</div>;
  }


  // Seen indicator removed: no inline seen state

  return (
    <>
      <div className='chat-info-mobile'>
        {onBack && <button onClick={onBack}><ion-icon name="arrow-back-outline"></ion-icon></button>}
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
            return (
              <MessageBubble
                  key={m.id}
                  m={m}
                  uid={uid}
                  other={other}
                  title={title}
                  GAP={GAP}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  prev={messages[i - 1]}
                  i={i}
                  messages={messages}
              />
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
