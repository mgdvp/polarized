import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Login from './components/Login';
import SignUp from './components/SignUp';
import UsernameForm from './components/UsernameForm';
import Header from './components/Header';
import ChatPage from './components/chat/ChatPage';
import PostsFeed from './components/PostsFeed';
import CreatePost from './components/CreatePost';
import Profile from './components/Profile';
import PostPage from './components/PostPage';
import './style.css';

function App() {
  const location = useLocation();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [loading, setLoading] = useState(!user);
  const [hasUsername, setHasUsername] = useState(user?.username ? true : false);
  const { t } = useTranslation();

  useEffect(() => {
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

  if (loading) {
    return (
      <div></div>
    );
  }


  return (
    <div className={`App ${location.pathname.startsWith('/messages') ? 'route-messages' : ''}`}>
      <Header user={user} />
      <Routes>
        <Route path="/post/:postId" element={<PostPage currentUser={user} />} />
        <Route path="/create" element={<CreatePost currentUser={user} />} />
        <Route path="/profile/:username" element={<Profile currentUser={user} />} />
        <Route path="/messages" element={<ChatPage currentUser={user} />} />
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
        <Route path="*" element={
          <div style={{marginTop: '4rem'}}>
            <span class="error-404">404</span>
            <p>{t('notFound')}</p>
          </div>
        } />
      </Routes>
    </div>
  );
}

export default App;