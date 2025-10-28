import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Routes, Route, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Login from './components/Login';
import SignUp from './components/SignUp';
import UsernameForm from './components/UsernameForm';
import Header from './components/Header';
import Chat from './components/Chat';
import PostsFeed from './components/PostsFeed';
import Profile from './components/Profile';
import PostPage from './components/PostPage';
import './style.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasUsername, setHasUsername] = useState(false);
  const { t } = useTranslation();

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
          const fullUserData = {
            ...userData,
            // Prefer Firestore profile fields if present
            username: existingData.username || null,
            displayName: existingData.displayName || currentUser.displayName,
            photoURL: existingData.photoURL || userData.photoURL || '',
          };
          localStorage.setItem('user', JSON.stringify(fullUserData));
          setUser(fullUserData);
          setHasUsername(!!existingData.username);
        } else {
          // This case should ideally not happen if login flow is correct
          const newUser = { ...userData, username: null, displayName: currentUser.displayName };
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

  return (
    <div className="App">
      <Header user={user} />
      <Routes>
        <Route path="/post/:postId" element={<PostPage currentUser={user} />} />
        <Route path="/profile/:username" element={<Profile currentUser={user} />} />
        <Route path="/messages" element={<Chat currentUser={user} />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/" element={
          user ? (
            hasUsername ? (
              <div>
                <h2>{t('welcome', { name: user.displayName || '' })}</h2>
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