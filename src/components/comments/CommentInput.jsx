import React, { useState } from 'react';
import { db } from '../../firebase';
import { addDoc, collection, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

const MAX_LEN = 280;

const CommentInput = ({ postId, currentUser, onPosted }) => {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  const postRef = doc(db, 'posts', postId);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const content = text.trim();
    if (!content) return;
    if (content.length > MAX_LEN) return;

    try {
      setSubmitting(true);
      await updateDoc(postRef, {
        commentCount: increment(1)
      });
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        text: content,
        createdAt: serverTimestamp(),
        authorUid: currentUser.uid,
        authorUsername: currentUser.username,
        authorPp: currentUser.photoURL || currentUser.photoUrl || '',
      });
      setText('');
      if (onPosted) onPosted();
    } catch (err) {
  console.error('Failed to add comment:', err);
  setError(t('failedAddComment'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="comment-input">
      <input
        type="text"
        placeholder={t('writeAComment')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_LEN}
        disabled={submitting}
      />
      <button type="submit" disabled={submitting || !text.trim()}>
        <ion-icon name="send" style={{ fontSize: '1.2rem', verticalAlign: 'bottom', marginLeft: 2 }}></ion-icon>
      </button>
    </form>
  );
};

export default CommentInput;
