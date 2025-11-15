import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

const UsernameForm = () => {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

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
      setError(t('usernameRules'));
      setLoading(false);
      return;
    }
    if (displayName.trim().length === 0 || displayName.length > 30) {
      setError(t('displayNameRequired'));
      setLoading(false);
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const usernameLower = username.toLowerCase();
      const q = query(usersRef, where('username', '==', usernameLower));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setError(t('usernameTaken'));
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
      setError(t('usernameCheckFailed'));
      console.error('Error setting username:', error);
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

          <form onSubmit={handleUsernameSubmit} className="auth-form">
            <label className="auth-label" htmlFor="name">{t('fullName')}</label>
            <div className="auth-field">
              <ion-icon name="person-outline" aria-hidden="true"></ion-icon>
              <input
                id="name"
                name="name"
                className="auth-input"
                type="text"
                value={displayName}
                onChange={handleDisplayNameChange}
                placeholder={t('yourFullName')}
                autoComplete='off'
                maxLength={30}
                disabled={loading}
              />
            </div>

            <label className="auth-label" htmlFor="username">{t('username')}</label>
            <div className="auth-field">
              <ion-icon name="at-outline" aria-hidden="true"></ion-icon>
              <input
                id="username"
                name="username"
                className="auth-input"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder={t('chooseUsername')}
                autoComplete='off'
                maxLength={30}
                disabled={loading}
              />
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? t('saving') : t('save')}
            </button>
          </form>

          {info && <p className="info-message" style={{ marginTop: 12 }}>{info}</p>}
          {error && <p className="error-message" style={{ marginTop: 8 }}>{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default UsernameForm;