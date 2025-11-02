import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import CommentList from './comments/CommentList';
import CommentInput from './comments/CommentInput';
import timeAgo from '../utils/timeAgo';
import { useTranslation } from 'react-i18next';

const PostPage = ({ currentUser }) => {
  const { postId } = useParams();
  const location = useLocation();

  const initialPostData = location.state?.preloadedPostData || null;

  const [post, setPost] = useState(initialPostData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentsRefresh, setCommentsRefresh] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    console.log('Initial Post Data:', initialPostData);
    
    const fetchPost = async () => {
      if (!initialPostData) setLoading(true);

      setError('');
      
      try {
        const ref = doc(db, 'posts', postId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setError(t('postNotFound'));
          setPost(null);
        } else {
          setPost({ id: snap.id, ...snap.data() });
        }
      } catch (e) {
        console.error('Failed to load post:', e);
        setError(t('failedLoadPost'));
      } finally {
        setLoading(false);
      }
    };
    if (postId) fetchPost();
  }, [postId, t, initialPostData]);

  if (loading && !post) {
    return (
      <div className="post-page">
        <div className="post-detail">
          <div className="post-card">
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <div className="skeleton skeleton-avatar" style={{ margin: '0.8rem' }} />
                <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-line lg" style={{ width: '80%', margin: '0.8rem' }} />
                <div className="skeleton skeleton-line" style={{ width: '80%', margin: '0.8rem' }} />
                </div>
            </div>
            <div className="skeleton skeleton-image" style={{ height: 420 }} />
          </div>
        </div>
        <aside className="comments-panel">
            <h3>{t('comments')}</h3>
            <div className="skeleton skeleton-line" style={{ width: '70%', margin: '0.8rem' }} />
            <div className="skeleton skeleton-line" style={{ width: '90%', margin: '0.8rem' }} />
        </aside>
      </div>
    );
  }

  if (error || !post) {
    return <div className="error-message" style={{ maxWidth: 720, margin: '2rem auto' }}>{error}</div>;
  }

  if (!post) return null;

  return (
    <div className="post-page">
      <div className="post-detail">
        <div className="post-card" key={post.id}>
          <div className="post-header">
            <img
              className="post-author-pp"
              src={post.authorPp || '/default-avatar.png'}
              alt={post.author || 'user'}
              onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
            />
            <div className="post-author">
              <Link to={`/profile/${post.author}`} className="name">
                @{post.author || 'unknown'}
              </Link>
              <div className="time">
                {post.postedAt ? timeAgo(post.postedAt) : ''}
              </div>
            </div>
          </div>

          {post.imageUrl && (
            <div className="post-image-wrapper">
              <img className="post-image" src={post.imageUrl} alt="post" />
            </div>
          )}

          <div className="post-caption">{post.caption}</div>
        </div>
      </div>
      <aside className="comments-panel">
        <h3>{t('comments')}</h3>
        <CommentList postId={postId} refreshToken={commentsRefresh} />
        {currentUser ? (
          <CommentInput
            postId={postId}
            currentUser={currentUser}
            onPosted={() => setCommentsRefresh((n) => n + 1)}
          />
        ) : (
          <p className="info-message">{t('signInToComment')}</p>
        )}
      </aside>
    </div>
  );
};

export default PostPage;
