import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const Header = ({ user }) => {
  const { t } = useTranslation();
  const isLoggedIn = !!(user && user.username && user.uid);

  // optimistic photo URL: prefer prop, then localStorage, then placeholder
  const initialLocal = typeof window !== 'undefined' ? localStorage.getItem('photoURL') : null;
  const [photoURL, setPhotoURL] = useState(user?.photoURL || initialLocal || '/avatar.png');

  // keep localStorage in sync and perform an optimistic update: fetch authoritative URL from Firestore
  useEffect(() => {
    let mounted = true;
    if (!user?.uid) {
      // no user -> clear optimistic cached photo
      setPhotoURL('/avatar.png');
      try { localStorage.removeItem('photoURL'); } catch (e) {}
      return;
    }

    // If the prop has a photoURL different from cached, prefer prop immediately
    if (user.photoURL && user.photoURL !== photoURL) {
      setPhotoURL(user.photoURL);
      try { localStorage.setItem('photoURL', user.photoURL); } catch (e) {}
    }

    // fetch latest from Firestore and persist to localStorage
    (async () => {
      try {
        const ud = await getDoc(doc(db, 'users', user.uid));
        if (!mounted) return;
        if (ud.exists()) {
          const data = ud.data();
          const remote = data.photoURL || null;
          if (remote && remote !== photoURL) {
            setPhotoURL(remote);
            try { localStorage.setItem('photoURL', remote); } catch (e) {}
          }
        }
      } catch (e) {
        // ignore network errors; keep optimistic UI
        console.warn('Failed to fetch user photo for header', e);
      }
    })();

    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  return (
    <header className="app-header">
      <Link to="/" className="logo"><img src="/logo.png" alt="Logo" /></Link>

      <div className="header-user-info">
        {isLoggedIn && (
          <>
            <Link to="/messages" className="header-messages-link" aria-label={t('messages')}>
              <ion-icon name="chatbubbles-outline"></ion-icon>
            </Link>
            <Link to="/create" className="header-create-link" aria-label={t('createPostTitle')} title={t('createPostTitle')}>
              <ion-icon name="add-circle-outline"></ion-icon>
            </Link>
          </>
        )}

        <Link to={isLoggedIn ? `/profile/${user.username}` : '/'} className="header-profile-link">
          {isLoggedIn ? (
            <img
              src={photoURL || '/avatar.png'}
              alt={user.displayName || user.username || 'Profile'}
              className="header-user-pp"
              onError={(e) => { e.currentTarget.src = '/avatar.png'; }}
            />
          ) : (
            t('login')
          )}
        </Link>
      </div>

    </header>
  );
};

export default Header;