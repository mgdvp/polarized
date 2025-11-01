import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Header = ({ user }) => {
  const { t } = useTranslation();
  const isLoggedIn = user && user.username;

  return (
    <header className="app-header">
      <Link to="/" className="logo"><img src="/logo.png" alt="Logo" /></Link>
      
      <div className="header-user-info">
        {isLoggedIn && (
          <Link to="/messages" className="header-messages-link">
            {t('messages')}
          </Link>
        )}
        <Link 
          to={isLoggedIn ? `/profile/${user.username}` : "/"}
        >
          {isLoggedIn ? `@${user.username}` : t('login')}
        </Link>
      </div>
      
    </header>
  );
};

export default Header;