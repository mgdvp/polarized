import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { getAuthErrorMessage } from '../utils/firebaseErrors';

const ResetPassword = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setInfo(t('resetEmailSent', { email }));
    } catch (err) {
      console.error('Error sending password reset email:', err);
      setError(getAuthErrorMessage(err) || t('couldNotSendReset'));
    } finally {
      setSubmitting(false);
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
          <h2 className="auth-title">{t('resetPassword')}</h2>

          <form onSubmit={onSubmit} className="auth-form">
            <label className="auth-label" htmlFor="email">{t('email')}</label>
            <div className="auth-field">
              <ion-icon name="mail-outline" aria-hidden="true"></ion-icon>
              <input
                id="email"
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('enterYourEmail')}
                required
              />
            </div>

            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting ? t('sending') : t('sendResetLink')}
            </button>
          </form>

          {info && <p className="info-message" style={{ marginTop: 12 }}>{info}</p>}
          {error && <p className="error-message" style={{ marginTop: 8 }}>{error}</p>}

          <p className="auth-meta" style={{ marginTop: 18 }}>
            <Link to="/">{t('backToLogin')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
