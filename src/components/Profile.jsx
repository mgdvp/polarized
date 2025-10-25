import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { db, auth, storage } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore';
import { signOut, updateProfile as updateAuthProfile } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import CreatePost from './CreatePost';
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

  const triggerPhotoPicker = () => {
    if (!isCurrentUser || uploading) return;
    fileInputRef.current?.click();
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

  const onPhotoSelected = async (e) => {
    try {
      const file = e.target.files?.[0];
      // reset so same file can be reselected later
      e.target.value = '';
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        alert(t('selectImageFile'));
        return;
      }
      if (!userProfile?.uid) return;

      setUploading(true);

  // Crop to 240x240 for avatar at quality 1.0
  const croppedBlob = await cropImageToSquare(file, 240, 1.0);

  const avatarRef = storageRef(storage, `avatars/${userProfile.uid}.jpg`);
  await uploadBytes(avatarRef, croppedBlob, { contentType: 'image/webp' });
      const url = await getDownloadURL(avatarRef);

      // Update Firestore profile document
      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, { photoURL: url });

      // Update local UI state
      setUserProfile((prev) => ({ ...prev, photoURL: url }));

      // Update auth profile if this is the current user
      if (auth.currentUser && isCurrentUser) {
        try {
          await updateAuthProfile(auth.currentUser, { photoURL: url });
        } catch (err) {
          // Non-fatal; log and proceed
          console.warn('Auth profile not updated:', err);
        }
      }

      // Update cached user in localStorage if present
      const cached = JSON.parse(localStorage.getItem('user') || '{}');
      if (cached && typeof cached === 'object') {
        localStorage.setItem('user', JSON.stringify({ ...cached, photoURL: url }));
      }
    } catch (err) {
      console.error('Failed to update profile photo:', err);
      alert(t('couldNotUpdatePhoto'));
    } finally {
      setUploading(false);
    }
  };

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
              <img src={userProfile.photoURL} alt={userProfile.displayName} className="profile-picture" />
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
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="pfp-input"
                    onChange={onPhotoSelected}
                  />
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
                    <button onClick={handleEditName} className="btn-primary" disabled={nameBusy}>
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
                  </div>
                  )
                )}
              </div>
            </div>
          </div>
          {isCurrentUser && (
            <CreatePost currentUser={currentUser} />
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
