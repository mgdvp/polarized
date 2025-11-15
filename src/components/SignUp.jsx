import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { getAuthErrorMessage } from '../utils/firebaseErrors';
import { useTranslation } from 'react-i18next';

const SignUp = () => {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const USERNAME_REGEX = /^(?!.*\. {2})(?!.*\.$)[a-zA-Z0-9._]{1,30}$/;

  const handleUsernameChange = (e) => setUsername(e.target.value);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      if (!displayName.trim().length || displayName.length > 30) throw new Error('display');
      if (!USERNAME_REGEX.test(username)) throw new Error('username');

      const usernameLower = username.toLowerCase();
      const usersRef = collection(db, 'users');
      const q1 = query(usersRef, where('username', '==', usernameLower));
      const existing = await getDocs(q1);
      if (!existing.empty) throw new Error('taken');

      if (password.length < 6) throw new Error('password');

      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      const userDocRef = doc(db, 'users', user.uid);
      const userData = {
        uid: user.uid,
        name: displayName.slice(0, 30),
        displayName: displayName.slice(0, 30),
        username: usernameLower,
        photoURL: `https://api.dicebear.com/9.x/initials/svg?seed=${displayName}`,
      };
      await setDoc(userDocRef, userData);
      try { await sendEmailVerification(user); setInfo(t('verificationEmailSent', { email })); } catch (e2) { setError(getAuthErrorMessage(e2)); }
      await signOut(auth);
    } catch (err) {
      const code = err?.message;
      if (code === 'display') setError(t('displayNameRequired'));
      else if (code === 'username') setError(t('usernameRules'));
      else if (code === 'taken') setError(t('usernameTaken'));
      else if (code === 'password') setError(t('passwordMin'));
      else setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
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
          <h2 className="auth-title">{t('createYourAccount')}</h2>

          <form onSubmit={handleSignUp} className="auth-form">
            <label className="auth-label">{t('fullName')}</label>
            <div className="auth-field">
              <ion-icon name="person-outline"></ion-icon>
              <input className="auth-input" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value.slice(0, 30))} placeholder={t('yourFullName')} maxLength={30} disabled={loading} required />
            </div>

            <label className="auth-label">{t('username')}</label>
            <div className="auth-field">
              <ion-icon name="at-outline"></ion-icon>
              <input className="auth-input" type="text" value={username} onChange={handleUsernameChange} placeholder={t('chooseUsername')} maxLength={30} disabled={loading} required />
            </div>

            <label className="auth-label">{t('email')}</label>
            <div className="auth-field">
              <ion-icon name="mail-outline"></ion-icon>
              <input className="auth-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('enterYourEmail')} disabled={loading} required />
            </div>

            <label className="auth-label">{t('password')}</label>
            <div className="auth-field">
              <ion-icon name="lock-closed-outline"></ion-icon>
              <input className="auth-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('createPassword')} disabled={loading} required />
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>{loading ? t('creating') : t('signUp')}</button>
          </form>

          {info && <p className="info-message" style={{ marginTop: 12 }}>{info}</p>}
          {error && <p className="error-message" style={{ marginTop: 8 }}>{error}</p>}

          <p className="auth-meta" style={{ marginTop: 18 }}>
            {t('alreadyHaveAccount')} <Link to="/">{t('signIn')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
