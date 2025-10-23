import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import timeAgo from '../../utils/timeAgo';
import { useTranslation } from 'react-i18next';

const CommentList = ({ postId, refreshToken }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    const fetchOnce = async () => {
      setLoading(true);
      setError('');
      try {
        const q = query(
          collection(db, 'posts', postId, 'comments'),
          orderBy('createdAt', 'asc')
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setComments(data);
      } catch (err) {
  console.error('Failed to load comments:', err);
  if (!cancelled) setError(t('failedLoadComments'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchOnce();
    return () => { cancelled = true; };
  }, [postId, refreshToken]);

  if (loading) {
    return (
      <div className="comments-list">
        <div className="skeleton skeleton-line" style={{ width: '80%', margin: '0.4rem 0' }} />
        <div className="skeleton skeleton-line" style={{ width: '60%', margin: '0.4rem 0' }} />
      </div>
    );
  }

  if (!comments.length && !loading) {
    return <div className="comments-list empty">{t('noComments')}</div>;
  }

  return (
    <div className="comments-list">
      {comments.map((c) => (
        <div className="comment" key={c.id}>
          <img className="comment-pp" src={c.authorPp || '/default-avatar.png'} alt={c.authorUsername || 'user'} onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }} />
          <div className="comment-body">
            <div className="comment-meta">
              <div className="comment-author-line">
                <span className="comment-author">@{c.authorUsername || 'unknown'}</span>
                    <span className="comment-time">
                    {c.createdAt ? timeAgo(c.createdAt, { short: true }) : ''}
                </span>
              </div>
              <div className="comment-text">{c.text}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CommentList;
