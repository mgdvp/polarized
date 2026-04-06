import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  doc,
  updateDoc,
  increment,
  getCountFromServer,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import timeAgo from '../utils/timeAgo';
import { useTranslation } from 'react-i18next';

const PostsFeed = ({ currentUser, filterAuthorUid, filterAuthorUsername, hideSkeletons = false }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedMap, setLikedMap] = useState({}); // local UI state only
  const [commentCounts, setCommentCounts] = useState({}); // postId -> count
  const { t } = useTranslation();

  // 📦 Posts yükleme (tek seferlik)
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        let q;
        if (filterAuthorUid || filterAuthorUsername) {
          const conditions = [];
          if (filterAuthorUid)
            conditions.push(where('authorUid', '==', filterAuthorUid));
          if (filterAuthorUsername)
            conditions.push(where('author', '==', filterAuthorUsername));

          // sadece birini kullanabiliriz, çünkü Firestore OR desteklemez
          q = query(collection(db, 'posts'), conditions[0], orderBy('postedAt', 'desc'));
        } else {
          q = query(collection(db, 'posts'), orderBy('postedAt', 'desc'), limit(20));
        }

        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPosts(data);

        // fetchPosts içindeki data'yı setPosts yaptıktan sonra
        const initialLikedMap = {};
        data.forEach(post => {
          if (post.likedBy && post.likedBy.includes(currentUser?.uid)) {
            initialLikedMap[post.id] = true;
          }
        });
        setLikedMap(initialLikedMap);
      } catch (err) {
        console.error('Failed to fetch posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [filterAuthorUid, filterAuthorUsername]);

  // 🧮 Fetch comment counts per post (simple per-post aggregation)
// ❤️ Beğeni toggle (önce UI, sonra server - arrayUnion/arrayRemove ile)
  const toggleLike = useCallback(async (post) => {
    if (!currentUser?.uid) return; // Kullanıcı girişi kontrolü

    const postRef = doc(db, 'posts', post.id);
    const uid = currentUser.uid;

    // 1. Mevcut (lokal) durumu kontrol et
    // likedMap, kullanıcının o anda UI'da ne gördüğünü temsil eder.
    const alreadyLiked = likedMap[post.id];

    // 2. UI'ı anında iyimser olarak güncelle
    // Değişimin yönünü belirle (beğeniyorsa +1, vazgeçiyorsa -1)
    const delta = alreadyLiked ? -1 : 1;

    // likeCount'u anında artır/azalt
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likeCount: (p.likeCount || 0) + delta }
          : p
      )
    );
    // Beğeni haritasını (lokal state) anında tersine çevir
    setLikedMap((prev) => ({ ...prev, [post.id]: !alreadyLiked }));


    // 3. Server’a asıl güncellemeyi gönder (arkadan)
    try {
      if (alreadyLiked) {
        // Zaten beğenilmişti (UI'da ❤ idi), şimdi VAZGEÇİYOR
        // Sunucudan UID'yi kaldır ve sayacı 1 azalt
        await updateDoc(postRef, {
          likeCount: increment(-1),
          likedBy: arrayRemove(uid)
        });
      } else {
        // Beğenilmemişti (UI'da ♡ idi), şimdi BEĞENİYOR
        // Sunucuya UID'yi ekle ve sayacı 1 artır
        await updateDoc(postRef, {
          likeCount: increment(1),
          likedBy: arrayUnion(uid)
        });
      }
    } catch (err) {
      console.error('Failed to update like:', err);

      // 4. Geri al (rollback UI) - Eğer sunucu başarısız olursa
      // UI'ı tam tersi yönde güncelle
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, likeCount: (p.likeCount || 0) - delta } // delta'yı geri al
            : p
        )
      );
      // Beğeni haritasını orijinal durumuna geri al
      setLikedMap((prev) => ({ ...prev, [post.id]: alreadyLiked }));
    }
  }, [currentUser, likedMap, db]); // 'db'yi bağımlılıklara eklemek iyi bir pratiktir

  // 🧱 Skeleton
  if (loading) {
    if (hideSkeletons) return null;
    return (
      <div className="feed">
        {Array.from({ length: 5 }).map((_, i) => (
        <div className="post-card" key={i}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="skeleton skeleton-avatar" style={{ margin: '0.8rem' }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-line lg" style={{ width: '80%', margin: '0.8rem' }} />
              <div className="skeleton skeleton-line" style={{ width: '80%', margin: '0.8rem' }} />
            </div>
          </div>
          <div className="skeleton skeleton-image" style={{ height: 250 }} />
          <div className="skeleton skeleton-pill" style={{ margin: '1rem' }} />
          <div className="skeleton skeleton-pill" style={{ margin: '1rem' }} />
        </div>
        ))}
      </div>
    );
  }

  // 🪶 Boş durum
  if (!posts.length) {
    return <div className="feed-empty">{t('noPosts')}</div>;
  }

  // 🖼️ Post Listesi
  return (
    <div className="feed">
      {posts.map((post) => (
        <div className="post-card" key={post.id}>
          <div className="post-header">
            <img
              className="post-author-pp"
              src={post.authorPp || '/default-avatar.png'}
              alt={post.author || 'user'}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-avatar.png'; }}
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
            <div className="post-image-wrapper" onDoubleClick={() => toggleLike(post)}>
              <img className="post-image" src={post.imageUrl} alt="post" />
            </div>
          )}

          {post.caption && <div className="post-caption">{post.caption}</div>}

          <div className="post-footer">
            <button
              className="like-button"
              onClick={() => toggleLike(post)}
              disabled={!currentUser}
              title={!currentUser ? t('signInToLike') : ''}
            >
              <ion-icon name={likedMap[post.id] ? 'heart' : 'heart-outline'} className="like-icon"></ion-icon>
              <span>{post.likeCount || 0}</span>
            </button>
            <Link
              to={`/post/${post.id}`}
              state={{
                preloadedPostData: {
                  imageUrl: post.imageUrl,
                  caption: post.caption,
                  author: post.author,
                  authorPp: post.authorPp,
                  postedAt: post.postedAt.toMillis(),
                },
              }}
              className="comment-button"
              title={t('viewAndComment')}
            >
              <ion-icon className="comment-icon" name="chatbubble-outline"></ion-icon>
              <span>{post.commentCount || 0}</span>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PostsFeed;

