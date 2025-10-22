import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, updateDoc, query, collection, where, getDocs, setDoc } from 'firebase/firestore';

const UsernameForm = () => {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const USERNAME_REGEX = /^(?!.*\.{2})(?!.*\.$)[a-zA-Z0-9._]{1,30}$/;

  useEffect(() => {
    const user = auth.currentUser;
    if (user && user.displayName) {
      setDisplayName(user.displayName);
    }
  }, []);

  const handleUsernameChange = (e) => {
    // Do not sanitize or lowercase while typing; validate and lowercase on submit
    setUsername(e.target.value);
  };

  const handleDisplayNameChange = (e) => {
    const raw = e.target.value;
    setDisplayName(raw.slice(0, 30));
  };

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate username with regex and display name max length
    if (!USERNAME_REGEX.test(username)) {
      setError('Username can use letters, numbers, . and _. Max 30 chars, no consecutive dots or trailing dot.');
      setLoading(false);
      return;
    }
    if (displayName.trim().length === 0 || displayName.length > 30) {
      setError('Display name is required and must be at most 30 characters.');
      setLoading(false);
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const usernameLower = username.toLowerCase();
      const q = query(usersRef, where('username', '==', usernameLower));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setError('Username already exists. Please choose another one.');
        setLoading(false);
        return;
      }

      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const usernameLower = username.toLowerCase();
        await updateDoc(userDocRef, { username: usernameLower, displayName });
        
        const localUser = JSON.parse(localStorage.getItem('user'));
        if(localUser) {
          localUser.username = usernameLower;
          localUser.displayName = displayName;
          localStorage.setItem('user', JSON.stringify(localUser));
        }
        window.location.reload();
      }
    } catch (error) {
      setError('Error setting username. Please try again.');
      console.error('Error setting username:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Set Your Username and Name</h2>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
      <form onSubmit={handleUsernameSubmit} style={{ width: '400px' }}>
        <input
          name="name"
          type="text"
          value={displayName}
          onChange={handleDisplayNameChange}
          placeholder="Enter your name"
          autoComplete='off'
          maxLength={30}
          disabled={loading}
        />
        <input
          name="username"
          type="text"
          value={username}
          onChange={handleUsernameChange}
          placeholder="Enter your username"
          autoComplete='off'
          maxLength={30}
          disabled={loading}
        />
          <button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save'}
        </button>
      </form>
      </div>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default UsernameForm;