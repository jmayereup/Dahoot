import React, { useState } from 'react';
import { pb } from '../pb';
import { SchoolFooter } from './SchoolFooter';

export function AuthView({ onSuccess, onCancel }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password complexity helper checks
  const meetsMinLength = password.length >= 8;
  const meetsUppercase = /[A-Z]/.test(password);
  const meetsNumber = /\d/.test(password);
  const meetsSpecial = /[\W_]/.test(password);
  const passwordValid = meetsMinLength && meetsUppercase && meetsNumber && meetsSpecial;

  // Track if fields are blurred to support validation feedback after interaction
  const [blurredFields, setBlurredFields] = useState({});

  const handleBlur = (field) => {
    setBlurredFields(prev => ({ ...prev, [field]: true }));
  };

  const isFieldInvalid = (field, value, validationFn) => {
    if (!blurredFields[field]) return false;
    return !validationFn(value);
  };

  const validateEmail = (val) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    // Make all fields blurred on submit so validation shows
    setBlurredFields({
      email: true,
      password: true,
      passwordConfirm: true,
      name: true,
      school: true
    });

    try {
      if (isLogin) {
        if (!validateEmail(email)) {
          throw new Error("Please enter a valid email address.");
        }
        if (!password) {
          throw new Error("Password is required.");
        }
        // Authenticate with PocketBase
        await pb.collection('users').authWithPassword(email.trim(), password);
        onSuccess?.();
      } else {
        // Registration Mode
        if (!validateEmail(email)) {
          throw new Error("Please enter a valid email address.");
        }
        if (!passwordValid) {
          throw new Error("Password does not meet complexity requirements.");
        }
        if (password !== passwordConfirm) {
          throw new Error("Passwords do not match.");
        }

        // 1. Create the dahoot_user_info record
        const userInfo = await pb.collection('dahoot_user_info').create({
          role: 'TEACHER',
          school: school.trim() || undefined
        });

        // 2. Create the user
        await pb.collection('users').create({
          email: email.trim(),
          password: password,
          passwordConfirm: passwordConfirm,
          username: email.trim().split('@')[0] + Math.floor(Math.random() * 10000),
          name: name.trim() || undefined,
          dahoot_info: userInfo.id
        });

        setSuccessMsg("Account registered successfully! Logging you in...");
        
        // 3. Authenticate the newly created user
        await pb.collection('users').authWithPassword(email.trim(), password);
        
        setTimeout(() => {
          onSuccess?.();
        }, 1000);
      }
    } catch (err) {
      console.error("Auth error details:", err);
      let errMsg = err.message || "An authentication error occurred.";
      if (err.response?.data) {
        // Parse PocketBase specific validation errors
        const data = err.response.data;
        const details = Object.entries(data)
          .map(([key, val]) => `${key}: ${val.message}`)
          .join(', ');
        if (details) errMsg = `Validation failed: ${details}`;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="panel" style={{ maxWidth: '520px', textAlign: 'left' }}>
        <h2>{isLogin ? 'Teacher Access' : 'Create Teacher Account'}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.95rem' }}>
          {isLogin 
            ? 'Log in with your email and password to manage quiz games.' 
            : 'Register a new teacher profile to start creating educational quizzes.'}
        </p>

        {/* Tab Selection */}
        <div style={{
          display: 'flex',
          background: 'rgba(93, 107, 130, 0.08)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px',
          marginBottom: '24px',
          border: '1px solid rgba(93, 107, 130, 0.12)'
        }}>
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(''); setBlurredFields({}); }}
            style={{
              flex: 1,
              background: isLogin ? 'var(--accent-gradient)' : 'transparent',
              color: isLogin ? '#5D6B82' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '6px',
              padding: '10px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(''); setBlurredFields({}); }}
            style={{
              flex: 1,
              background: !isLogin ? 'var(--accent-gradient)' : 'transparent',
              color: !isLogin ? '#5D6B82' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '6px',
              padding: '10px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ff4b60',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: 20,
            fontSize: '0.9rem',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            ❌ {error}
          </div>
        )}

        {successMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: 20,
            fontSize: '0.9rem'
          }}>
            ✓ {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                className={`form-input ${isFieldInvalid('name', name, val => !!val.trim()) ? 'user-invalid-fallback' : ''}`}
                placeholder="e.g. Jake Miller"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => handleBlur('name')}
                disabled={loading}
                autoComplete="name"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <span id="email-hint" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Format: you@example.com
            </span>
            <input
              type="email"
              id="email"
              className={`form-input ${isFieldInvalid('email', email, validateEmail) ? 'user-invalid-fallback' : (blurredFields['email'] && validateEmail(email) ? 'user-valid-fallback' : '')}`}
              placeholder="e.g. jake@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => handleBlur('email')}
              disabled={loading}
              required
              autoComplete="email"
              inputMode="email"
              aria-describedby="email-hint"
            />
            {isFieldInvalid('email', email, validateEmail) && (
              <div style={{ color: '#ff4b60', fontSize: '0.8rem', marginTop: '6px' }}>
                ❌ Please enter a valid email address.
              </div>
            )}
          </div>

          {!isLogin && (
            <div className="form-group">
              <label className="form-label" htmlFor="school">School / Organization (Optional)</label>
              <input
                type="text"
                id="school"
                className="form-input"
                placeholder="e.g. Greenfield Academy"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            {!isLogin && (
              <ul id="password-rules" style={{ 
                fontSize: '0.8rem', 
                color: 'var(--text-secondary)', 
                marginBottom: '10px',
                paddingLeft: '16px',
                listStyleType: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <li style={{ color: meetsMinLength ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1rem' }}>{meetsMinLength ? '✓' : '•'}</span> At least 8 characters
                </li>
                <li style={{ color: meetsUppercase ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1rem' }}>{meetsUppercase ? '✓' : '•'}</span> One uppercase letter
                </li>
                <li style={{ color: meetsNumber ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1rem' }}>{meetsNumber ? '✓' : '•'}</span> One number
                </li>
                <li style={{ color: meetsSpecial ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1rem' }}>{meetsSpecial ? '✓' : '•'}</span> One special character
                </li>
              </ul>
            )}
            <input
              type="password"
              id="password"
              className={`form-input ${!isLogin && isFieldInvalid('password', password, () => passwordValid) ? 'user-invalid-fallback' : (!isLogin && blurredFields['password'] && passwordValid ? 'user-valid-fallback' : '')}`}
              placeholder={isLogin ? "Enter your password" : "Create password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => handleBlur('password')}
              disabled={loading}
              required
              autoComplete={isLogin ? "current-password" : "new-password"}
              aria-describedby={!isLogin ? "password-rules" : undefined}
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label className="form-label" htmlFor="passwordConfirm">Confirm Password</label>
              <input
                type="password"
                id="passwordConfirm"
                className={`form-input ${isFieldInvalid('passwordConfirm', passwordConfirm, val => val === password && !!val) ? 'user-invalid-fallback' : (blurredFields['passwordConfirm'] && passwordConfirm === password ? 'user-valid-fallback' : '')}`}
                placeholder="Re-type password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                onBlur={() => handleBlur('passwordConfirm')}
                disabled={loading}
                required
                autoComplete="new-password"
              />
              {isFieldInvalid('passwordConfirm', passwordConfirm, val => val === password) && (
                <div style={{ color: '#ff4b60', fontSize: '0.8rem', marginTop: '6px' }}>
                  ❌ Passwords do not match.
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 28 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '16px' }}
            >
              {loading ? 'Authenticating...' : isLogin ? 'Log In' : 'Register & Create Account'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={loading}
              style={{ width: '100%', padding: '16px' }}
            >
              ← Cancel & Back
            </button>
          </div>
        </form>
      </div>
      <SchoolFooter />
    </div>
  );
}
