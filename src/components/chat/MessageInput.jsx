import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const MessageInput = ({ onSend, disabled }) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    try {
      await onSend(trimmed);
      setText('');
    } catch (err) {
      // Silently ignore or add error toast if needed
      console.error('Send failed', err);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, padding: 12, flexDirection: 'row' }} className="comment-input">
      <input
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
