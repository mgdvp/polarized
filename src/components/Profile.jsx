import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import '../styles/Profile.css';
import CreatePost from './CreatePost';
import PostsFeed from './PostsFeed';

const Profile = ({ currentUser }) => {
  const { username } = useParams();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);

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
      await updateDoc(userRef, { name: newName });
      // Update local UI state
      setUserProfile((prev) => ({ ...prev, name: newName }));
      // Update localStorage cached user
      const cached = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...cached, name: newName }));
    } catch (err) {
      console.error('Failed to update name:', err);
      alert('Could not update name. Please try again later.');
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
            <img src={userProfile.photoURL} alt={userProfile.name} className="profile-picture" />
            <div className="profile-info">
              <div className="profile-header">
                <div className="identity">
                  <h1>{userProfile.name}</h1>
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
