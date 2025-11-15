import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuthErrorMessage } from '../utils/firebaseErrors';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const { t } = useTranslation();

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
        await setDoc(userDocRef, { ...userData, displayName: user.displayName });
        localStorage.setItem('user', JSON.stringify({ ...userData, username: null, displayName: user.displayName }));
      } else {
        const existingData = userDocSnap.data();
        localStorage.setItem('user', JSON.stringify({ ...userData, username: existingData.username || null, displayName: existingData.displayName || user.displayName }));
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
          setInfo(t('verificationEmailSent', { email: user.email }));
        } catch (e) {
          console.error('Error sending verification email:', e);
          setError(t('couldNotSendVerification'));
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
    <div className="auth-page" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
      <div className="auth-left">
        <div className="auth-hero">
          <h1>{t('connectShareDiscover')}</h1>
          <p>{t('heroSubtitle')}</p>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-inner">
          <div className="auth-brand">
            <img src="/logo.png" alt="Logo" />
            <span className="name">Polarized</span>
          </div>
          <h2 className="auth-title">{t('welcomeBack')}</h2>

          <form onSubmit={handleEmailSignIn} className="auth-form">
            <label className="auth-label">{t('email')}</label>
            <div className="auth-field">
              <ion-icon name="mail-outline" aria-hidden="true"></ion-icon>
              <input
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('enterYourEmail')}
                required
              />
            </div>

            <label className="auth-label">{t('password')}</label>
            <div className="auth-field">
              <ion-icon name="lock-closed-outline" aria-hidden="true"></ion-icon>
              <input
                className="auth-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('enterPassword')}
                required
                minLength={6}
              />
            </div>

            <div className="auth-row">
              <span></span>
              <Link className="auth-forgot" to="/reset">{t('forgotPassword')}</Link>
            </div>

            <button type="submit" className="auth-submit">{t('signIn')}</button>
          </form>

          <div className="auth-divider">{t('or')}</div>

          <button onClick={handleGoogleLogin} className="auth-google">
            <ion-icon name="logo-google" aria-hidden="true"></ion-icon>
            {t('continueWithGoogle')}
          </button>

          {info && <p className="info-message" style={{ marginTop: 12 }}>{info}</p>}
          {error && <p className="error-message" style={{ marginTop: 8 }}>{error}</p>}

          <p className="auth-meta" style={{ marginTop: 18 }}>
            {t('dontHaveAccount')} <Link to="/signup">{t('createNewAccount')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;