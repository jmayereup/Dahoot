import React, { useState, useRef, useEffect } from 'react';
import { pb } from '../pb';
import { SchoolFooter } from './SchoolFooter';

export function AuthView({ onSuccess, onCancel, pocketbaseStatus }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const timeoutRef = useRef(null);

  const [dahootUsername, setDahootUsername] = useState('');
  const [needsActivation, setNeedsActivation] = useState(false);
  const [activationInviteCode, setActivationInviteCode] = useState('');
  const [activationSchool, setActivationSchool] = useState('');
  const [activationDahootUsername, setActivationDahootUsername] = useState('');

  useEffect(() => {
    if (pb.authStore.isValid && pb.authStore.record && !pb.authStore.record.dahoot_info) {
      setNeedsActivation(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

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
    if (loading) return;
    setError('');
    setSuccessMsg('');
    setLoading(true);

    // Make all fields blurred on submit so validation shows
    setBlurredFields({
      email: true,
      password: true,
      passwordConfirm: true,
      name: true,
      school: true,
      inviteCode: true,
      dahootUsername: true
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
        const authData = await pb.collection('users').authWithPassword(email.trim(), password);
        if (!authData.record.dahoot_info) {
          setNeedsActivation(true);
          setLoading(false);
          return;
        }
        onSuccess?.();
      } else {
        // Registration Mode
        if (!inviteCode.trim()) {
          throw new Error("Invite code is required.");
        }
        if (!dahootUsername.trim()) {
          throw new Error("Dahoot username is required.");
        }
        if (!validateEmail(email)) {
          throw new Error("Please enter a valid email address.");
        }
        if (!passwordValid) {
          throw new Error("Password does not meet complexity requirements.");
        }
        if (password !== passwordConfirm) {
          throw new Error("Passwords do not match.");
        }

        // Check if the user already exists in the system (e.g. from another app)
        let existingUser = null;
        try {
          existingUser = await pb.collection('users').getFirstListItem(`email = "${email.trim()}"`);
        } catch (e) {
          // User does not exist, which is normal for standard sign-up
        }

        if (existingUser) {
          if (existingUser.dahoot_info) {
            throw new Error("An account with this email already exists. Please log in.");
          }

          // Verify the password by attempting to authenticate
          try {
            await pb.collection('users').authWithPassword(email.trim(), password);
          } catch (authErr) {
            throw new Error("An account with this email already exists, and the password provided is incorrect.");
          }

          // Create the dahoot_user_info record
          const userInfo = await pb.collection('dahoot_user_info').create({
            role: 'TEACHER',
            school: school.trim() || undefined,
            dahoot_username: dahootUsername.trim(),
            invite_code: inviteCode.trim()
          });

          try {
            // Link it to the existing user record
            await pb.collection('users').update(existingUser.id, {
              dahoot_info: userInfo.id
            });
            // Refresh auth store to update the session record details
            await pb.collection('users').authRefresh();
          } catch (updateErr) {
            try {
              await pb.collection('dahoot_user_info').delete(userInfo.id);
            } catch (delErr) {
              console.error("Failed to delete orphaned user info record:", delErr);
            }
            throw updateErr;
          }

          setSuccessMsg("Teacher access activated! Logging you in...");
          
          timeoutRef.current = setTimeout(() => {
            onSuccess?.();
          }, 1000);
          return;
        }

        // 1. Create the dahoot_user_info record (invite_code will be validated server-side by hook)
        const userInfo = await pb.collection('dahoot_user_info').create({
          role: 'TEACHER',
          school: school.trim() || undefined,
          dahoot_username: dahootUsername.trim(),
          invite_code: inviteCode.trim()
        });

        try {
          // 2. Create the user
          await pb.collection('users').create({
            email: email.trim(),
            password: password,
            passwordConfirm: passwordConfirm,
            username: email.trim().split('@')[0] + Math.floor(Math.random() * 10000),
            name: name.trim() || undefined,
            dahoot_info: userInfo.id
          });
        } catch (userErr) {
          try {
            await pb.collection('dahoot_user_info').delete(userInfo.id);
          } catch (delErr) {
            console.error("Failed to delete orphaned user info record:", delErr);
          }
          throw userErr;
        }

        setSuccessMsg("Account registered successfully! Logging you in...");
        
        // 3. Authenticate the newly created user
        await pb.collection('users').authWithPassword(email.trim(), password);
        
        timeoutRef.current = setTimeout(() => {
          onSuccess?.();
        }, 1000);
      }
    } catch (err) {
      console.error("Auth error details:", err);
      let errMsg = err.message || "An authentication error occurred.";
      if (errMsg.includes("Something went wrong while processing your request")) {
        errMsg = "Registration/Activation failed: Invalid invite code. Please verify your invite code and try again.";
      } else if (err.response?.data) {
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

  const handleActivate = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      if (!activationInviteCode.trim()) {
        throw new Error("Invite code is required.");
      }
      if (!activationDahootUsername.trim()) {
        throw new Error("Dahoot username is required.");
      }

      // 1. Create the dahoot_user_info record (invite code verified server-side by hook)
      const userInfo = await pb.collection('dahoot_user_info').create({
        role: 'TEACHER',
        school: activationSchool.trim() || undefined,
        dahoot_username: activationDahootUsername.trim(),
        invite_code: activationInviteCode.trim()
      });

      try {
        // 2. Link it to the existing authenticated user
        const userId = pb.authStore.record.id;
        await pb.collection('users').update(userId, {
          dahoot_info: userInfo.id
        });

        // 3. Refresh auth store state
        await pb.collection('users').authRefresh();
      } catch (err) {
        // Clean up orphaned info record if user update fails
        try {
          await pb.collection('dahoot_user_info').delete(userInfo.id);
        } catch (delErr) {
          console.error("Failed to delete orphaned user info record:", delErr);
        }
        throw err;
      }

      setSuccessMsg("Teacher access activated successfully!");
      
      timeoutRef.current = setTimeout(() => {
        onSuccess?.();
      }, 1000);
    } catch (err) {
      console.error("Activation error details:", err);
      let errMsg = err.message || "An activation error occurred.";
      if (errMsg.includes("Something went wrong while processing your request")) {
        errMsg = "Activation failed: Invalid invite code. Please verify your invite code and try again.";
      } else if (err.response?.data) {
        const data = err.response.data;
        const details = Object.entries(data)
          .map(([key, val]) => `${key}: ${val.message}`)
          .join(', ');
        if (details) errMsg = `Activation failed: ${details}`;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelActivation = () => {
    pb.authStore.clear();
    setNeedsActivation(false);
    setError('');
    setActivationInviteCode('');
    setActivationSchool('');
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      // Authenticate with Google OAuth2
      const authData = await pb.collection('users').authWithOAuth2({
        provider: 'google'
      });

      if (!authData.record.dahoot_info) {
        setNeedsActivation(true);
        setLoading(false);
        return;
      }

      setSuccessMsg("Logged in with Google successfully!");
      timeoutRef.current = setTimeout(() => {
        onSuccess?.();
      }, 1000);
    } catch (err) {
      console.error("Google Auth error:", err);
      let errMsg = err.message || "Failed to sign in with Google.";
      if (errMsg.includes("Missing or invalid provider") || errMsg.includes("invalid provider")) {
        errMsg = "Google Sign In is not enabled on this server. Please enable and configure the 'Google' OAuth2 provider in your PocketBase Admin panel (Settings -> Auth providers -> Google).";
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (needsActivation) {
    return (
      <div className="app-container">
        <div className="panel animate-join-focus" style={{ maxWidth: '520px', textAlign: 'left' }}>
          <h2>Activate Teacher Access</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.95rem' }}>
            Your account is authenticated, but you do not have teacher permissions yet. Please enter a valid invite code to activate teacher access.
          </p>

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

          <form onSubmit={handleActivate} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="activationInviteCode">Invite Code</label>
              <input
                type="text"
                id="activationInviteCode"
                className="form-input"
                placeholder="Required invite code"
                value={activationInviteCode}
                onChange={(e) => setActivationInviteCode(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase' }}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="activationDahootUsername">Dahoot Username</label>
              <input
                type="text"
                id="activationDahootUsername"
                className="form-input"
                placeholder="Enter your Dahoot username"
                value={activationDahootUsername}
                onChange={(e) => setActivationDahootUsername(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="activationSchool">School / Organization (Optional)</label>
              <input
                type="text"
                id="activationSchool"
                className="form-input"
                placeholder="e.g. Greenfield Academy"
                value={activationSchool}
                onChange={(e) => setActivationSchool(e.target.value)}
                disabled={loading}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 28 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: '16px' }}
              >
                {loading ? 'Activating...' : 'Activate Account'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelActivation}
                disabled={loading}
                style={{ width: '100%', padding: '16px' }}
              >
                ← Cancel & Log Out
              </button>
            </div>
          </form>
        </div>
        <SchoolFooter status={pocketbaseStatus} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="panel" style={{ maxWidth: '520px', textAlign: 'left' }}>
        <h2>{isLogin ? 'Teacher Access' : 'Create Teacher Account'}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.95rem' }}>
          {isLogin 
            ? 'Log in with your email and password to manage quiz games.' 
            : 'Register a new teacher profile to start creating educational quizzes.'}
        </p>

        {/* Note about only teachers needing to sign up */}
        <div style={{
          backgroundColor: 'rgba(255, 183, 178, 0.1)',
          border: '1.5px solid var(--color-school-primary)',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '24px',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)'
        }}>
          <span className="font-semibold text-rose-400">Note for Students:</span> Only teachers need to sign up. Students can join and play instantly without an account. <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', color: '#ff4b60', textDecoration: 'underline', cursor: 'pointer', font: 'inherit', padding: 0 }}>Click here to go back and enter a Game PIN</button>.
        </div>

        {/* Google Sign In Button */}
        <div style={{ marginBottom: '24px' }}>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200/80 hover:border-slate-300"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontSize: '0.9rem',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'var(--text-muted)' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(93, 107, 130, 0.15)' }} />
          <span style={{ padding: '0 10px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(93, 107, 130, 0.15)' }} />
        </div>

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

          {!isLogin && (
            <div className="form-group">
              <label className="form-label" htmlFor="dahootUsername">Dahoot Username</label>
              <input
                type="text"
                id="dahootUsername"
                className={`form-input ${isFieldInvalid('dahootUsername', dahootUsername, val => !!val.trim()) ? 'user-invalid-fallback' : ''}`}
                placeholder="Choose your display username"
                value={dahootUsername}
                onChange={(e) => setDahootUsername(e.target.value)}
                onBlur={() => handleBlur('dahootUsername')}
                disabled={loading}
                required
              />
              {isFieldInvalid('dahootUsername', dahootUsername, val => !!val.trim()) && (
                <div style={{ color: '#ff4b60', fontSize: '0.8rem', marginTop: '6px' }}>
                  ❌ Dahoot username is required to register.
                </div>
              )}
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

          {!isLogin && (
            <div className="form-group">
              <label className="form-label" htmlFor="inviteCode">Invite Code</label>
              <input
                type="text"
                id="inviteCode"
                className={`form-input ${isFieldInvalid('inviteCode', inviteCode, val => !!val.trim()) ? 'user-invalid-fallback' : ''}`}
                placeholder="Required invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                onBlur={() => handleBlur('inviteCode')}
                style={{ textTransform: 'uppercase' }}
                disabled={loading}
                required
              />
              {isFieldInvalid('inviteCode', inviteCode, val => !!val.trim()) && (
                <div style={{ color: '#ff4b60', fontSize: '0.8rem', marginTop: '6px' }}>
                  ❌ Invite code is required to register.
                </div>
              )}
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
      <SchoolFooter status={pocketbaseStatus} />
    </div>
  );
}
