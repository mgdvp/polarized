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
  const [usernameError, setUsernameError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Username: letters, numbers, dot and underscore. No consecutive dots, no trailing dot. Max 30.
  const USERNAME_REGEX = /^(?!.*\.{2})(?!.*\.$)[a-zA-Z0-9._]{1,30}$/;

  const handleUsernameChange = (e) => {
    // Accept input as-is; we'll validate with regex on submit
    setUsername(e.target.value);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    setLoading(true);
    if (!displayName.trim().length || displayName.length > 30) {
      setError(t('displayNameRequired'));
      setLoading(false);
      return;
    }
    if (!USERNAME_REGEX.test(username)) {
      setError(t('usernameRules'));
      setLoading(false);
      return;
    }
    // Lowercase for storage and availability check
    const usernameLower = username.toLowerCase();
    // Check username availability now (post-validation)
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', usernameLower));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setError(t('usernameTaken'));
        setLoading(false);
        return;
      }
    } catch (e1) {
      console.error('Error checking username availability:', e1);
      setError(t('usernameCheckFailed'));
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError(t('passwordMin'));
      setLoading(false);
      return;
    }

    setInfo(t('creatingYourAccount'));

    try {
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
      try {
        await sendEmailVerification(user);
        setInfo(t('verificationEmailSent', { email }));
      } catch (e) {
        console.error('Error sending verification email:', e);
        setError(getAuthErrorMessage(e));
      }
      // Sign out until email is verified
      await signOut(auth);
    } catch (error) {
      console.error("Error signing up:", error);
      setError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>{t('createAccount')}</h2>
      <form onSubmit={handleSignUp} className="login-form">
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value.slice(0, 30))}
          placeholder={t('fullName')}
          maxLength={30}
          disabled={loading}
          required
        />
        <input
          type="text"
          value={username}
          onChange={handleUsernameChange}
          placeholder={t('username')}
          maxLength={30}
          disabled={loading}
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('email')}
          disabled={loading}
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('password')}
          disabled={loading}
          required
        />
        <button type="submit" disabled={loading}>{loading ? t('creating') : t('signUp')}</button>
      </form>
      {info && <p className="info-message">{info}</p>}
      {error && <p className="error-message">{error}</p>}
      <p>
        {t('alreadyHaveAccount')} <Link to="/">{t('signIn')}</Link>
      </p>
    </div>
  );
};

export default SignUp;
