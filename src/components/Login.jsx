import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuthErrorMessage } from '../utils/firebaseErrors';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      const userData = {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
      };

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, { ...userData, name: user.displayName });
        localStorage.setItem('user', JSON.stringify({ ...userData, username: null, name: user.displayName }));
      } else {
        const existingData = userDocSnap.data();
        localStorage.setItem('user', JSON.stringify({ ...userData, username: existingData.username || null, name: existingData.name || user.displayName }));
      }
      window.location.reload();
    } catch (error) {
      console.error("Error during Google login or user creation:", error);
      setError(getAuthErrorMessage(error));
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      if (user.providerData.some(p => p.providerId === 'password') && !user.emailVerified) {
        try {
          await sendEmailVerification(user);
          setInfo(`We sent a verification link to ${user.email}. Please verify your email, then sign in.`);
        } catch (e) {
          console.error('Error sending verification email:', e);
          setError('Could not send verification email. Please try again later.');
        }
        await signOut(auth);
        return;
      }
      // Verified or non-password provider
      window.location.reload();
    } catch (error) {
      console.error("Error signing in with email:", error);
      setError(getAuthErrorMessage(error));
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleEmailSignIn} className="login-form">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <button type="submit">Sign In</button>
      </form>
      <p className="or-separator">or</p>
      <button onClick={handleGoogleLogin}>Login with Google</button>
      {info && <p className="info-message">{info}</p>}
      {error && <p className="error-message">{error}</p>}
      <p>
        Don't have an account? <Link to="/signup">Create new account</Link>
      </p>
    </div>
  );
};

export default Login;