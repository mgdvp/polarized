import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Routes, Route, Link } from 'react-router-dom';

import Login from './components/Login';
import SignUp from './components/SignUp';
import UsernameForm from './components/UsernameForm';
import Header from './components/Header';
import PostsFeed from './components/PostsFeed';
import Profile from './components/Profile';
import './style.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasUsername, setHasUsername] = useState(false);

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem('user'));
    if (localUser) {
      setUser(localUser);
      setHasUsername(!!localUser.username);
      setLoading(false);
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // If using email/password and the email isn't verified, treat as signed out
        const isPasswordUser = currentUser.providerData.some(p => p.providerId === 'password');
        if (isPasswordUser && !currentUser.emailVerified) {
          localStorage.removeItem('user');
          setUser(null);
          setHasUsername(false);
          setLoading(false);
          return;
        }
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        const userData = {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL,
        };

        if (userDocSnap.exists()) {
          const existingData = userDocSnap.data();
          const fullUserData = { ...userData, username: existingData.username || null, name: existingData.name || currentUser.displayName };
          localStorage.setItem('user', JSON.stringify(fullUserData));
          setUser(fullUserData);
          setHasUsername(!!existingData.username);
        } else {
          // This case should ideally not happen if login flow is correct
          const newUser = { ...userData, username: null, name: currentUser.displayName };
          localStorage.setItem('user', JSON.stringify(newUser));
          setUser(newUser);
          setHasUsername(false);
        }
      } else {
        localStorage.removeItem('user');
        setUser(null);
        setHasUsername(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('user');
      window.location.reload();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
  <Header user={user} />
      <Routes>
        <Route path="/profile/:username" element={<Profile currentUser={user} />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/" element={
          user ? (
            hasUsername ? (
              <div>
                <h2>Welcome, {user.displayName}!</h2>
                <PostsFeed currentUser={user} />
              </div>
            ) : (
              <>
                <UsernameForm />
                <PostsFeed currentUser={user} />
              </>
            )
          ) : (
            <>
              <Login />
              <PostsFeed currentUser={user} />
            </>
          )
        } />
      </Routes>
    </div>
  );
}

export default App;