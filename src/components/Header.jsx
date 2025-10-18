import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Header.css';

const Header = ({ user }) => {
  return (
    <header className="app-header">
      <Link to="/" className="logo"><img src="/logo.png" alt="Logo" /></Link>
      {user && user.username && (
        <div className="header-user-info">
          <Link to={`/profile/${user.username}`}>@{user.username}</Link>
        </div>
      )}
    </header>
  );
};

export default Header;