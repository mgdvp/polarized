import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { db, auth, storage } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { signOut, updateProfile as updateAuthProfile } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import '../styles/Profile.css';
import CreatePost from './CreatePost';
import PostsFeed from './PostsFeed';
import { cropImageToSquare } from '../utils/image';

const Profile = ({ currentUser }) => {
  const { username } = useParams();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError('User not found.');
        } else {
          const profileData = querySnapshot.docs[0].data();
          setUserProfile(profileData);
          if (currentUser) {
            const uidMatch = currentUser.uid && profileData.uid && currentUser.uid === profileData.uid;
            const emailMatch = currentUser.email && profileData.email && currentUser.email.toLowerCase() === profileData.email.toLowerCase();
            const usernameMatch = currentUser.username && profileData.username && currentUser.username.toLowerCase() === profileData.username.toLowerCase();
            setIsCurrentUser(Boolean(uidMatch || emailMatch || usernameMatch));
          }
        }
      } catch (err) {
        setError('Failed to fetch user profile.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [username, currentUser]);

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
    const newName = window.prompt('Enter your display name:', userProfile.name || '')?.trim();
    if (!newName || newName === userProfile.name) return;
    try {
      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, { displayName: newName });
      // Update local UI state
      setUserProfile((prev) => ({ ...prev, displayName: newName }));
      // Update localStorage cached user
      const cached = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...cached, displayName: newName }));
    } catch (err) {
      console.error('Failed to update name:', err);
      alert('Could not update name. Please try again later.');
    }
  };

  const triggerPhotoPicker = () => {
    if (!isCurrentUser || uploading) return;
    fileInputRef.current?.click();
  };

  const onPhotoSelected = async (e) => {
    try {
      const file = e.target.files?.[0];
      // reset so same file can be reselected later
      e.target.value = '';
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }
      if (!userProfile?.uid) return;

      setUploading(true);

  // Crop to 240x240 for avatar at quality 1.0
  const croppedBlob = await cropImageToSquare(file, 240, 1.0);

  const avatarRef = storageRef(storage, `avatars/${userProfile.uid}.jpg`);
  await uploadBytes(avatarRef, croppedBlob, { contentType: 'image/jpeg' });
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
      alert('Could not update profile photo. Please try again later.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-card">
        <div className="skeleton skeleton-avatar profile-picture" style={{width: 80, height: 80}} />
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
          <div className="profile-card">
            <div className={`profile-picture-wrapper${isCurrentUser ? ' editable' : ''}${uploading ? ' uploading' : ''}`}>
              <img src={userProfile.photoURL} alt={userProfile.displayName} className="profile-picture" />
              {isCurrentUser && (
                <>
                  <button
                    type="button"
                    className="pfp-overlay"
                    onClick={triggerPhotoPicker}
                    aria-label="Change profile photo"
                    title="Change profile photo"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <span className="pfp-uploading">Uploading…</span>
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
                </div>
                {isCurrentUser && (
                  <div className="profile-actions">
                    <button onClick={handleEditName} className="profile-edit-button">Edit name</button>
                    <button onClick={handleLogout} className="profile-logout-button" aria-label="Logout">
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {isCurrentUser && (
            <CreatePost currentUser={currentUser} />
          )}
          {/* Show all posts by this user below (support uid and legacy username) */}
          <PostsFeed
            currentUser={currentUser}
            filterAuthorUid={userProfile.uid}
            filterAuthorUsername={userProfile.username}
          />
        </>
      ) : (
        <p>User not found.</p>
      )}
    </div>
  );
};

export default Profile;
