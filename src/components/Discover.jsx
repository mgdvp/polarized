import React, { useState, useEffect } from 'react';
import PostGrid from './PostGrid';
import { db } from '../firebase';
import { collection, query, orderBy, startAt, endAt, limit, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Simple debounce hook
function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}

const Discover = () => {
  const { t } = useTranslation();
  const [term, setTerm] = useState('');
  const debouncedTerm = useDebounced(term, 500);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function runSearch() {
      setError(null);
      if (!debouncedTerm || debouncedTerm.trim().length < 2) {
        setUsers([]);
        setLoadingUsers(false);
        return;
      }
      const qTerm = debouncedTerm.trim().toLowerCase();
      setLoadingUsers(true);
      try {
        // Prefix search on username (stored as-is) and displayName (normalized to lowercase for search)
        // Firestore doesn't support OR; we perform two queries and merge client-side.
        const usersRef = collection(db, 'users');
        const unameQ = query(usersRef, orderBy('username'), startAt(qTerm), endAt(qTerm + '\uf8ff'), limit(10));
        const nameQ = query(usersRef, orderBy('displayName'), startAt(debouncedTerm), endAt(debouncedTerm + '\uf8ff'), limit(10));
        const [unameSnap, nameSnap] = await Promise.all([getDocs(unameQ), getDocs(nameQ)]);
        const map = new Map();
        unameSnap.forEach(d => map.set(d.id, d.data()));
        nameSnap.forEach(d => map.set(d.id, d.data()));
        const merged = Array.from(map.entries()).map(([id, data]) => ({ id, ...data }));
        // Basic relevance: sort by username startsWith then displayName startsWith then followers count
        merged.sort((a, b) => {
          const aU = a.username || '';
          const bU = b.username || '';
          const prefixA = aU.toLowerCase().startsWith(qTerm) ? 1 : 0;
          const prefixB = bU.toLowerCase().startsWith(qTerm) ? 1 : 0;
          if (prefixB !== prefixA) return prefixB - prefixA;
        });
        setUsers(merged);
      } catch (e) {
        setError(e.message || 'Search failed');
      } finally {
        setLoadingUsers(false);
      }
    }
    runSearch();
  }, [debouncedTerm]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1rem' }}>
      <div className="discover-search">
        <input
          type="text"
          className="discover-search-input"
          placeholder={t('searchUsers')}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>
      {term.trim().length >= 2 ? (
        <div className="user-search-results">
          {loadingUsers && <div className="search-status">{t('loading')}</div>}
          {!loadingUsers && error && <div className="search-error">{error}</div>}
          {!loadingUsers && !error && users.length === 0 && (
            <div className="search-empty">{t('noUsersFound')}</div>
          )}
          {!loadingUsers && !error && users.length > 0 && (
            <ul className="user-results-list">
              {users.map(u => (
                <li key={u.id} className="user-result-item">
                  <Link to={`/profile/${u.username}`} className="user-result-link">
                    <div className="user-result-avatar-wrapper">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt={u.displayName || u.username} className="user-result-avatar" />
                      ) : (
                        <div className="user-result-avatar placeholder" />
                      )}
                    </div>
                    <div className="user-result-meta">
                      <span className="user-result-name">{u.displayName || u.username}</span>
                      <span className="user-result-username">@{u.username}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <PostGrid />
      )}
    </div>
  );
};

export default Discover;
