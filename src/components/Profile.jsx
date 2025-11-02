import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db, auth, storage } from '../firebase';
import { rtdb } from '../firebase';
import { ref as dbRef, get as rtdbGet, update as rtdbUpdate, serverTimestamp } from 'firebase/database';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore';
import { signOut, updateProfile as updateAuthProfile } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import PostsFeed from './PostsFeed';
import { cropImageToSquare } from '../utils/imageCompressor';
import { useTranslation } from 'react-i18next';

const Profile = ({ currentUser }) => {
  const { username } = useParams();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nameBusy, setNameBusy] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const fileInputRef = useRef(null);
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError(t('userNotFound'));
        } else {
          const profileData = querySnapshot.docs[0].data();
          setUserProfile(profileData);
          if (currentUser) {
            const uidMatch = currentUser.uid && profileData.uid && currentUser.uid === profileData.uid;
            const emailMatch = currentUser.email && profileData.email && currentUser.email.toLowerCase() === profileData.email.toLowerCase();
            const usernameMatch = currentUser.username && profileData.username && currentUser.username.toLowerCase() === profileData.username.toLowerCase();
            setIsCurrentUser(Boolean(uidMatch || emailMatch || usernameMatch));
            window.scrollTo(0, 0);
          }
        }
      } catch (err) {
        setError(t('failedToFetchProfile'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [username, currentUser]);

  // Live subscribe to viewed user's profile to get followers/following arrays and counts
  useEffect(() => {
    if (!userProfile?.uid) return;
    const unsub = onSnapshot(doc(db, 'users', userProfile.uid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setUserProfile((prev) => ({ ...(prev || {}), ...data }));
      if (currentUser?.uid) {
        const followers = Array.isArray(data.followers) ? data.followers : [];
        setIsFollowing(followers.includes(currentUser.uid));
      } else {
        setIsFollowing(false);
      }
    }, (err) => {
      console.warn('Profile live update failed:', err);
    });
    return () => unsub();
  }, [userProfile?.uid, currentUser?.uid]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('user');
      window.location.href = '/';
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleEditName = async () => {
    if (!isCurrentUser || !userProfile?.uid) return;
    const current = userProfile.displayName || userProfile.name || '';
    const input = window.prompt(t('enterDisplayName'), current);
    const newName = (input ?? '').trim();
    if (!newName) return;
    if (newName.length > 30) {
      alert(t('displayNameTooLong'));
      return;
    }
    if (newName === current) return;
    try {
      setNameBusy(true);
      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, { displayName: newName });
      // Update local UI state
      setUserProfile((prev) => ({ ...prev, displayName: newName }));
      // Update localStorage cached user
      const cached = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...cached, displayName: newName }));
    } catch (err) {
      console.error('Failed to update name:', err);
      alert(t('couldNotUpdateName'));
    } finally {
      setNameBusy(false);
    }
  };

  // Avatar upload handlers (allow current user to change profile photo)
  const triggerPhotoPicker = () => {
    if (!isCurrentUser) return;
    fileInputRef.current?.click();
  };

  const onPhotoSelected = async (e) => {
    if (!isCurrentUser || !userProfile?.uid) return;
    const file = e?.target?.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      // Crop/resize to square thumbnail
      const blob = await cropImageToSquare(file);
      const path = `avatars/${userProfile.uid}/${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, path);
      await uploadBytes(sRef, blob);
      const url = await getDownloadURL(sRef);

      // Update Firestore user doc
      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, { photoURL: url });

      // If viewing own profile, update auth profile and local cache
      if (currentUser?.uid === userProfile.uid) {
        try {
          await updateAuthProfile(auth.currentUser, { photoURL: url });
        } catch (e) {
          // Non-fatal if auth update fails
          console.warn('Auth profile update failed:', e);
        }
        const cached = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...cached, photoURL: url }));
      }

      // Update local UI state
      setUserProfile((prev) => ({ ...prev, photoURL: url }));
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      alert(t('couldNotUploadImage'));
    } finally {
      setUploading(false);
      // clear file input value so same file can be picked again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleFollow = async () => {
    if (!currentUser?.uid || !userProfile?.uid || isCurrentUser || followBusy) return;
    setFollowBusy(true);
    try {
      const followerUid = currentUser.uid;
      const followingUid = userProfile.uid;
      const batch = writeBatch(db);
      const followerUserRef = doc(db, 'users', followerUid);
      const followingUserRef = doc(db, 'users', followingUid);

      if (isFollowing) {
        // Unfollow: remove from both arrays
        batch.update(followerUserRef, { following: arrayRemove(followingUid) });
        batch.update(followingUserRef, { followers: arrayRemove(followerUid) });
      } else {
        // Follow: add to both arrays
        batch.update(followerUserRef, { following: arrayUnion(followingUid) });
        batch.update(followingUserRef, { followers: arrayUnion(followerUid) });
      }
      await batch.commit();
      setIsFollowing(!isFollowing);
    } catch (err) {
      console.error('Failed to toggle follow:', err);
      alert(t('couldNotUpdateFollow'));
    } finally {
      setFollowBusy(false);
    }
  };

  const startChat = async () => {
    try {
      if (!currentUser?.uid || !userProfile?.uid || isCurrentUser) return;
      const uid1 = currentUser.uid;
      const uid2 = userProfile.uid;
      const [a, b] = uid1 < uid2 ? [uid1, uid2] : [uid2, uid1];
      const chatId = `${a}_${b}`;

      // Check if chat exists
      const chatSnap = await rtdbGet(dbRef(rtdb, `chats/${chatId}`));

      const updates = {};
      if (!chatSnap.exists()) {
        updates[`/chats/${chatId}`] = {
          members: { [uid1]: true, [uid2]: true },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: null,
        };
      }
      // Store lightweight other user info for lists
      const otherFor1 = {
        uid: uid2,
        username: userProfile.username || '',
        displayName: userProfile.displayName || '',
        photoURL: userProfile.photoURL || '',
      };
      const otherFor2 = {
        uid: uid1,
        username: currentUser.username || '',
        displayName: currentUser.displayName || '',
        photoURL: currentUser.photoURL || '',
      };

      updates[`/userChats/${uid1}/${uid2}`] = {
        chatId,
        otherUid: uid2,
        other: otherFor1,
        updatedAt: serverTimestamp(),
      };
      updates[`/userChats/${uid2}/${uid1}`] = {
        chatId,
        otherUid: uid1,
        other: otherFor2,
        updatedAt: serverTimestamp(),
      };

      await rtdbUpdate(dbRef(rtdb), updates);
      navigate(`/messages?chatId=${encodeURIComponent(chatId)}`);
    } catch (err) {
      console.error('Failed to start chat:', err);
      // Non-fatal: silently fail or alert minimal
    }
  };

  // end avatar handlers

  if (loading) {
    return (
      <div className="profile-card">
        <div className="skeleton-avatar profile-picture" />
        <div className="profile-info" style={{width: '100%'}}>
          <div className="profile-header">
            <div className="identity" style={{flex: 1}}>
              <div className="skeleton skeleton-line lg" style={{width: '40%', marginBottom: 8}} />
              <div className="skeleton skeleton-line" style={{width: '30%'}} />
            </div>
            <div className="profile-actions" style={{gap: 8}}>
              <div className="skeleton skeleton-pill" />
              <div className="skeleton skeleton-pill" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div>
      {userProfile ? (
        <>
          <div className="profile-card" id="profile-card">
          <div className={`profile-picture-wrapper${isCurrentUser ? ' editable' : ''}${uploading ? ' uploading' : ''}`}>
            <img src={userProfile.photoURL} alt={userProfile.displayName} className="profile-picture" onClick={triggerPhotoPicker} />
              {isCurrentUser && (
                  <>
                    <button
                      type="button"
                      className="pfp-overlay"
                      onClick={triggerPhotoPicker}
                      aria-label={t('changeProfilePhoto')}
                      title={t('changeProfilePhoto')}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <span className="pfp-uploading">{t('uploading')}</span>
                      ) : (
                        <svg className="pfp-edit-icon" viewBox="0 0 24 24" aria-hidden="true">
                          <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92L5.92 19.58zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/>
                        </svg>
                      )}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={onPhotoSelected} className="pfp-input" />
                  </>
                )}
              </div>
            <div className="profile-info">
              <div className="profile-header">
                <div className="identity">
                  <h1>{userProfile.displayName}</h1>
                  <p>@{userProfile.username}</p>
                  <div className="profile-stats">
                    <span><strong>{Array.isArray(userProfile.followers) ? userProfile.followers.length : 0}</strong> {t('followers')}</span>
                    <span className="dot">•</span>
                    <span><strong>{Array.isArray(userProfile.following) ? userProfile.following.length : 0}</strong> {t('following')}</span>
                  </div>
                </div>
                {isCurrentUser ? (
                  <div className="profile-actions">
                    <button onClick={handleEditName} disabled={nameBusy}>
                      {nameBusy ? t('saving') : t('editName')}
                    </button>
                    <button onClick={handleLogout} aria-label={t('logout')}>
                      {t('logout')}
                    </button>
                  </div>
                ) : (
                  currentUser && (
                  <div className="profile-actions">
                    <button
                      onClick={toggleFollow}
                      className={`btn-${isFollowing ? 'following' : 'primary'}`}
                      disabled={followBusy || !currentUser}
                      aria-pressed={isFollowing}
                    >
                      {followBusy ? t('updating') : isFollowing ? t('unfollow') : t('follow')}
                    </button>
                    <button
                      onClick={startChat}
                      className="btn-secondary"
                    >
                      {t('sendMessage')}
                    </button>
                  </div>
                  )
                )}
              </div>
            </div>
          </div>
          {isCurrentUser && (
            <div style={{ maxWidth: 720, margin: '1rem auto' }}>
              <button style={{ width: '100%', maxWidth: '300px' }}>
                <Link to="/create" style={{ display: 'inline-block' }}>
                  {t('createPostTitle')}
                </Link>
              </button>
            </div>
          )}
          <PostsFeed
            currentUser={currentUser}
            filterAuthorUid={userProfile.uid}
            filterAuthorUsername={userProfile.username}
          />
        </>
      ) : (
        <p>{t('userNotFound')}</p>
      )}
    </div>
  );
};

export default Profile;
