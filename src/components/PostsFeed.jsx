import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot, orderBy, query, limit, doc, runTransaction, serverTimestamp, increment, getDoc, where } from 'firebase/firestore';

const PostsFeed = ({ currentUser, filterAuthorUid, filterAuthorUsername }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedMap, setLikedMap] = useState({}); // { [postId]: true }

  useEffect(() => {
    // Helper to sort posts by postedAt desc safely
    const sortPosts = (arr) => arr.slice().sort((a, b) => {
      const ta = a.postedAt?.toDate ? a.postedAt.toDate().getTime() : 0;
      const tb = b.postedAt?.toDate ? b.postedAt.toDate().getTime() : 0;
      return tb - ta;
    });

    // Main feed (no filters)
    if (!filterAuthorUid && !filterAuthorUsername) {
      const qRef = query(
        collection(db, 'posts'),
        orderBy('postedAt', 'desc'),
        limit(20)
      );
      const unsub = onSnapshot(qRef, (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPosts(data);
        setLoading(false);
      }, (err) => {
        console.error('Failed to load posts:', err);
        setLoading(false);
      });
      return () => unsub();
    }

    // Profile feed: combine posts matched by uid and by username to support legacy docs
    const unsubs = [];
    let uidLoaded = false;
    let usernameLoaded = false;
    let map = new Map();

    const flush = () => {
      // Only set loading false after at least one listener returns
      if (!uidLoaded && !usernameLoaded) return;
      const data = Array.from(map.values());
      setPosts(sortPosts(data));
      setLoading(false);
    };

    if (filterAuthorUid) {
      const qUid = query(
        collection(db, 'posts'),
        where('authorUid', '==', filterAuthorUid)
      );
      unsubs.push(onSnapshot(qUid, (snap) => {
        uidLoaded = true;
        snap.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
        flush();
      }, (err) => {
        uidLoaded = true;
        console.error('Failed to load posts by uid:', err);
        flush();
      }));
    }

    if (filterAuthorUsername) {
      const qUser = query(
        collection(db, 'posts'),
        where('author', '==', filterAuthorUsername)
      );
      unsubs.push(onSnapshot(qUser, (snap) => {
        usernameLoaded = true;
        snap.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
        flush();
      }, (err) => {
        usernameLoaded = true;
        console.error('Failed to load posts by username:', err);
        flush();
      }));
    }

    return () => unsubs.forEach((u) => u && u());
  }, [filterAuthorUid, filterAuthorUsername]);

  // Load which posts the current user has liked among the loaded posts
  useEffect(() => {
    const loadLikes = async () => {
      if (!currentUser?.uid || !posts.length) {
        setLikedMap({});
        return;
      }
      const newMap = {};
      await Promise.all(posts.map(async (p) => {
        try {
          const likeDocRef = doc(db, 'posts', p.id, 'likes', currentUser.uid);
          const likeSnap = await getDoc(likeDocRef);
          if (likeSnap.exists()) newMap[p.id] = true;
        } catch (e) {
          // ignore
        }
      }));
      setLikedMap(newMap);
    };
    loadLikes();
  }, [currentUser?.uid, posts]);

  const toggleLike = async (post) => {
    if (!currentUser?.uid) return; // optionally prompt login
    const postRef = doc(db, 'posts', post.id);
    const likeRef = doc(db, 'posts', post.id, 'likes', currentUser.uid);
    try {
      await runTransaction(db, async (tx) => {
        const likeSnap = await tx.get(likeRef);
        if (likeSnap.exists()) {
          tx.delete(likeRef);
          tx.update(postRef, { likeCount: increment(-1) });
        } else {
          tx.set(likeRef, { uid: currentUser.uid, createdAt: serverTimestamp() });
          tx.update(postRef, { likeCount: increment(1) });
        }
      });
      // Optimistically update liked map
      setLikedMap((prev) => ({ ...prev, [post.id]: !prev[post.id] }));
    } catch (e) {
      console.error('Failed to toggle like:', e);
    }
  };

  if (loading) {
    const skeletons = new Array(6).fill(0);
    return (
      <div className="feed">
        {skeletons.map((_, i) => (
          <div className="post-card" key={`s-${i}`}>
            <div className="post-header">
              <div className="skeleton skeleton-avatar" />
              <div className="post-author" style={{flex: 1}}>
                <div className="skeleton skeleton-line lg" style={{width: '40%'}} />
                <div className="skeleton skeleton-line" style={{width: '30%', marginTop: 6}} />
              </div>
            </div>
            <div className="post-image-wrapper">
              <div className="skeleton skeleton-image" />
            </div>
            <div className="post-footer" style={{display: 'flex', justifyContent: 'flex-start', gap: '0.5rem'}}>
              <div className="skeleton skeleton-pill" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!posts.length) {
    return <div className="feed-empty">No posts yet.</div>;
  }

  return (
    <div className="feed">
      {posts.map((post) => (
        <div className="post-card" key={post.id}>
          <div className="post-header">
            <img className="post-author-pp" src={post.authorPp || ''} alt={post.author || 'user'} onError={(e)=>{e.currentTarget.style.display='none';}} />
            <div className="post-author">
              <div className="name">
                <Link to={`/profile/${post.author}`} style={{color: '#eee'}}>
                  @{post.author || 'unknown'}
                </Link>
              </div>
              <div className="time">{post.postedAt?.toDate ? new Date(post.postedAt.toDate()).toLocaleString() : ''}</div>
            </div>
          </div>
          {post.imageUrl && (
            <div className="post-image-wrapper">
              <img className="post-image" src={post.imageUrl} alt="post" />
            </div>
          )}
          {post.caption && <div className="post-caption">{post.caption}</div>}
          <div className="post-footer">
            <button
              className="like-button"
              onClick={() => toggleLike(post)}
              disabled={!currentUser}
              aria-label={likedMap[post.id] ? 'Unlike' : 'Like'}
              title={!currentUser ? 'Sign in to like' : likedMap[post.id] ? 'Unlike' : 'Like'}
            >
              <span className="heart">{likedMap[post.id] ? '❤' : '♡'}</span> {post.likeCount || 0}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PostsFeed;
