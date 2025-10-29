import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const MessageInput = ({ onSend, disabled }) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    inputRef.current.focus();
    const trimmed = text.trim();
    setText('');
    if (!trimmed || disabled) return;
    try {
      await onSend(trimmed);
    } catch (err) {
      // Silently ignore or add error toast if needed
      console.error('Send failed', err);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, padding: 12, flexDirection: 'row' }} className="comment-input">
      <input  
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('typeMessage')}
        style={{ flex: 1 }}
        disabled={disabled}
      />
      <button type="submit" className="btn-primary" disabled={disabled}>{t('send')}</button>
    </form>
  );
};

export default MessageInput;
