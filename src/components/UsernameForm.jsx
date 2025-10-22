import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, updateDoc, query, collection, where, getDocs, setDoc } from 'firebase/firestore';

const UsernameForm = () => {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (user && user.displayName) {
      setDisplayName(user.displayName);
    }
  }, []);

  const handleUsernameChange = (e) => {
    setUsername(e.target.value.trim());
  };

  const handleDisplayNameChange = (e) => {
    setDisplayName(e.target.value);
  };

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (username.length < 3 || name.length < 1) {
      setError('Username must be at least 3 characters long and name cannot be empty.');
      setLoading(false);
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setError('Username already exists. Please choose another one.');
        setLoading(false);
        return;
      }

      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { username, displayName });
        
        const localUser = JSON.parse(localStorage.getItem('user'));
        if(localUser) {
          localUser.username = username;
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
      <form onSubmit={handleUsernameSubmit}>
        <input
          name="name"
          type="text"
          value={name}
          onChange={handleNameChange}
          placeholder="Enter your name"
          autoComplete='off'
        />
        <input
          name="username"
          type="text"
          value={username}
          onChange={handleUsernameChange}
          placeholder="Enter your username"
          autoComplete='off'
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </button>
      </form>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default UsernameForm;