import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

const PostGrid = ({ filterAuthorUid, filterAuthorUsername, pageSize = 60, hideSkeletons = false }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        let q;
        if (filterAuthorUid || filterAuthorUsername) {
          const conditions = [];
          if (filterAuthorUid) conditions.push(where('authorUid', '==', filterAuthorUid));
          if (filterAuthorUsername) conditions.push(where('author', '==', filterAuthorUsername));
          q = query(collection(db, 'posts'), conditions[0], orderBy('postedAt', 'desc'), limit(pageSize));
        } else {
          q = query(collection(db, 'posts'), orderBy('postedAt', 'desc'), limit(pageSize));
        }
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPosts(data);
      } catch (e) {
        console.error('Failed to load grid posts:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [filterAuthorUid, filterAuthorUsername, pageSize]);

  if (loading) {
    if (hideSkeletons) return null;
    return (
      <div className="post-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div className="post-grid-item skeleton" key={i} />
        ))}
      </div>
    );
  }

  if (!posts.length) {
    return <div className="feed-empty">{t('noPosts')}</div>;
  }

  return (
    <div className="post-grid">
      {posts.map((p) => (
        <Link
          key={p.id}
          to={`/post/${p.id}`}
          state={{ preloadedPostData: { imageUrl: p.imageUrl, caption: p.caption, author: p.author, authorPp: p.authorPp, postedAt: p.postedAt?.toMillis?.() } }}
          className="post-grid-item"
          title={p.caption || ''}
        >
          {p.imageUrl ? (
            <img src={p.imageUrl} alt={p.caption || 'post'} loading="lazy" />
          ) : (
            <div className="post-grid-fallback">{p.caption || ''}</div>
          )}
        </Link>
      ))}
    </div>
  );
};

export default PostGrid;
