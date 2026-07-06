import { useState, useEffect } from 'react';
import { pb } from '../pb';

export function ProfileModal({ isOpen, onClose, currentUser, userInfo, setUserInfo }) {
  const [profileSchool, setProfileSchool] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      setProfileSchool(userInfo?.school || '');
      setProfileUsername(userInfo?.dahoot_username || '');
      setProfileError('');
      setProfileSuccess('');
    }
  }, [isOpen, userInfo]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (profileSaving) return;
    setProfileError('');
    setProfileSuccess('');
    setProfileSaving(true);
    try {
      if (!currentUser?.dahoot_info) {
        throw new Error('No linked user info record found.');
      }
      const updatedInfo = await pb.collection('dahoot_user_info').update(currentUser.dahoot_info, {
        school: profileSchool.trim(),
        dahoot_username: profileUsername.trim()
      });
      if (setUserInfo) {
        setUserInfo(updatedInfo);
      }
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error saving profile details:', err);
      setProfileError(err.message || 'Failed to update profile details.');
    } finally {
      setProfileSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(9, 10, 15, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '40px 12px 12px 12px'
    }}>
      <div
        className="panel animate-fade-in p-6 sm:p-8"
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          textAlign: 'left',
          border: '1px solid var(--panel-border-focus)',
          position: 'relative'
        }}
      >
        <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }} className="text-slate-800 flex items-center gap-2">
              ⚙️ Profile Settings
            </h2>
            <p className="text-xs text-slate-500 mt-1">Update your teacher information</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setProfileError('');
              setProfileSuccess('');
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg p-2 rounded-full hover:bg-slate-100 transition-all cursor-pointer border-none outline-none bg-transparent"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          {profileError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs font-semibold">
              ⚠️ {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-xs font-semibold">
              ✓ {profileSuccess}
            </div>
          )}

          <div>
            <label className="form-label text-slate-700 font-bold block mb-1.5 text-xs uppercase tracking-wider" htmlFor="profileUsername">
              Dahoot Username
            </label>
            <input
              type="text"
              id="profileUsername"
              value={profileUsername}
              onChange={(e) => setProfileUsername(e.target.value)}
              placeholder="Enter your Dahoot username"
              className="form-input text-xs font-semibold py-2.5 w-full"
              maxLength={50}
            />
            <p className="text-[10px] text-slate-400 mt-1">This name will be displayed in the header and when creating/hosting games.</p>
          </div>

          <div>
            <label className="form-label text-slate-700 font-bold block mb-1.5 text-xs uppercase tracking-wider" htmlFor="profileSchool">
              School / Institution
            </label>
            <input
              type="text"
              id="profileSchool"
              value={profileSchool}
              onChange={(e) => setProfileSchool(e.target.value)}
              placeholder="Enter your school name"
              className="form-input text-xs font-semibold py-2.5 w-full"
              maxLength={100}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={() => {
                setProfileError('');
                setProfileSuccess('');
                onClose();
              }}
              className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer outline-none bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={profileSaving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
            >
              {profileSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
