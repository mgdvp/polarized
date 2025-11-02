// 📄 MessageBubble.jsx (New Component)
import React from 'react';

// Destructure all props to ensure memoization works correctly
const MessageBubble = React.memo(({ m, uid, other, title, GAP, formatDate, formatTime, prev, i, messages }) => {
  const fromMe = m.senderId === uid;
  const prevTs = prev?.createdAt ? Number(prev.createdAt) : 0;
  const curTs = m.createdAt ? Number(m.createdAt) : 0;

  // Optimized logic (you can pass these derived values as props too)
  const showAvatar = !fromMe && (i === 0 || (messages[i - 1] && messages[i - 1].senderId === uid));
  const showDateSeparator = i === 0 || (curTs - prevTs >= GAP);

  return (
    <React.Fragment>
      {showDateSeparator && (
        <div className="chat-date-separator" aria-hidden>
          {formatDate(curTs)}
        </div>
      )}
      <div className={`chat-msg-wrapper ${fromMe ? 'from-me' : 'from-other'} ${showAvatar ? 'with-avatar' : ''}`}>
        {!fromMe && showAvatar && (
          <img
            className="chat-msg-avatar"
            src={other?.photoURL || '/avatar.png'}
            alt={title || 'User'}
            onError={(e) => { e.currentTarget.src = '/avatar.png'; }}
          />
        )}

        {fromMe ? (
          <span className="chat-msg-time left" title={new Date(curTs).toLocaleString()}>{formatTime(curTs)}</span>
        ) : null}

        <div className="chat-msg">{m.text}</div>

        {!fromMe ? (
          <span className="chat-msg-time right" title={new Date(curTs).toLocaleString()}>{formatTime(curTs)}</span>
        ) : null}
      </div>
    </React.Fragment>
  );
});

export default MessageBubble;