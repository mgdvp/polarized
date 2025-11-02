import React, { useEffect, useRef, useState, useMemo, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { rtdb } from '../../firebase';
import { ref, set } from 'firebase/database';

const TYPING_IDLE_MS = 2000;

const MessageInput = ({ onSend, disabled, chatId, uid, other }) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const idleTimer = useRef(null);
  const typingActiveRef = useRef(false); // only send typing:true once per burst
  // Prefer provided other.uid; fallback to parsing chatId deterministically
  const otherUid = useMemo(() => {
    if (other?.uid) return other.uid;
    if (chatId && uid) {
      const parts = String(chatId).split('_');
      if (parts.length === 2) return parts[0] === uid ? parts[1] : parts[0];
    }
    return undefined;
  }, [other?.uid, chatId, uid]);

  const submit = useCallback(async (e) => {
    e.preventDefault();
    inputRef.current && inputRef.current.focus();
    const trimmed = text.trim();
    setText('');
    if (!trimmed || disabled) return;
    try {
      if (uid && otherUid && typingActiveRef.current) {
        set(ref(rtdb, `userChats/${otherUid}/${uid}/other/typing`), false).catch(() => {});
      }
      await onSend(trimmed);
      typingActiveRef.current = false;
    } catch (err) {
      // Silently ignore or add error toast if needed
      console.error('Send failed', err);
    }
  }, [text, disabled, uid, otherUid, onSend]);

  const handleChange = useCallback((e) => {
    const v = e.target.value;
    setText(v);
    if (disabled || !uid || !otherUid) return;

    const hasText = v.trim().length > 0;
    // Only send typing:true once at the start of a typing burst
    if (hasText && !typingActiveRef.current) {
      typingActiveRef.current = true;
      set(ref(rtdb, `userChats/${otherUid}/${uid}/other/typing`), true).catch(() => {});
    }

    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (typingActiveRef.current) {
        typingActiveRef.current = false;
        set(ref(rtdb, `userChats/${otherUid}/${uid}/other/typing`), false).catch(() => {});
      }
    }, TYPING_IDLE_MS);
  }, [disabled, uid, otherUid]);

  return (
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, padding: 12, flexDirection: 'row' }} className="comment-input">
      <input  
        ref={inputRef}
        type="text"
        value={text}
        onChange={handleChange}
        placeholder={t('typeMessage')}
        disabled={disabled}
      />
      <button type="submit" className="btn-primary" disabled={disabled} id="msg-send-button">
        <ion-icon name="send" style={{ fontSize: '1.2rem', verticalAlign: 'bottom', marginLeft: 2 }}></ion-icon>
      </button>
    </form>
  );
};

export default memo(MessageInput);
