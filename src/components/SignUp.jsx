import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { getAuthErrorMessage } from '../utils/firebaseErrors';

const SignUp = () => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const navigate = useNavigate();

  const checkUsernameAvailability = async (username) => {
    if (username.length >= 3) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setUsernameError('Username is already taken.');
      } else {
        setUsernameError('');
      }
    } else {
      setUsernameError('');
    }
  };

  const handleUsernameChange = (e) => {
    const newUsername = e.target.value.trim();
    setUsername(newUsername);
    checkUsernameAvailability(newUsername);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
  setError('');
  setInfo('');
    if (usernameError) {
      setError('Please choose a different username.');
      return;
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userData = {
        uid: user.uid,
        name,
        username,
        photoURL: `https://api.dicebear.com/9.x/initials/svg?seed=${name}`,
      };

      await setDoc(userDocRef, userData);
      try {
        await sendEmailVerification(user);
        setInfo(`We sent a verification link to ${email}. Verify your email, then sign in.`);
      } catch (e) {
        console.error('Error sending verification email:', e);
        setError(getAuthErrorMessage(e));
      }
      // Sign out until email is verified
      await signOut(auth);
    } catch (error) {
      console.error("Error signing up:", error);
      setError(getAuthErrorMessage(error));
    }
  };

  return (
    <div className="login-container">
      <h2>Create Account</h2>
      <form onSubmit={handleSignUp} className="login-form">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full Name"
          required
        />
        <input
          type="text"
          value={username}
          onChange={handleUsernameChange}
          placeholder="Username"
          required
        />
        {usernameError && <p className="error-message" style={{textAlign: 'center'}}>{usernameError}</p>}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit" disabled={!!usernameError}>Sign Up</button>
      </form>
  {info && <p className="info-message" style={{textAlign: 'center'}}>{info}</p>}
  {error && <p className="error-message">{error}</p>}
      <p>
        Already have an account? <Link to="/">Sign In</Link>
      </p>
    </div>
  );
};

export default SignUp;
