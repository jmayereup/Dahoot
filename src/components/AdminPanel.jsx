import { useState, useEffect } from 'react';
import { pb } from '../pb';
import { useConfirm } from '../hooks/useConfirm';

export function AdminPanel({
  isOpen,
  onClose,
  currentUser,
  availableSubjects,
  setAvailableSubjects,
  availableCefrLevels,
  setAvailableCefrLevels,
  availableLanguages,
  setAvailableLanguages
}) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [adminPanelTab, setAdminPanelTab] = useState('invite');
  const [optionsList, setOptionsList] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [newSubjectValue, setNewSubjectValue] = useState('');
  const [newCefrValue, setNewCefrValue] = useState('');
  const [newLanguageValue, setNewLanguageValue] = useState('');
  const [isAddingOption, setIsAddingOption] = useState(false);

  const [teachers, setTeachers] = useState([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [teachersError, setTeachersError] = useState('');

  const [inviteCodeSettingRecord, setInviteCodeSettingRecord] = useState(null);
  const [inviteCodeValue, setInviteCodeValue] = useState('');
  const [isSavingInvite, setIsSavingInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const [isCreatingTeacher, setIsCreatingTeacher] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('');
  const [newTeacherSchool, setNewTeacherSchool] = useState('');
  const [newTeacherRole, setNewTeacherRole] = useState('TEACHER');
  const [createTeacherLoading, setCreateTeacherLoading] = useState(false);
  const [createTeacherError, setCreateTeacherError] = useState('');
  const [createTeacherSuccess, setCreateTeacherSuccess] = useState('');

  useEffect(() => {
    let active = true;
    if (!isOpen) return;

    if (adminPanelTab === 'invite') {
      pb.collection('dahoot_settings').getFirstListItem('key = "invite_code"')
        .then(record => {
          if (active) {
            setInviteCodeSettingRecord(record);
            setInviteCodeValue(record.value);
            setInviteError('');
          }
        })
        .catch(err => {
          if (active) {
            console.error("Error fetching invite code:", err);
            setInviteError("Failed to load invite code.");
          }
        });
    } else if (adminPanelTab === 'teachers') {
      setIsLoadingTeachers(true);
      setTeachersError('');
      pb.collection('users').getFullList({
        filter: 'dahoot_info != ""',
        expand: 'dahoot_info',
        sort: 'created'
      })
        .then(list => {
          if (active) {
            setTeachers(list.filter(t => t.dahoot_info));
            setIsLoadingTeachers(false);
          }
        })
        .catch(err => {
          if (active) {
            console.error("Error fetching users:", err);
            setTeachersError("Failed to load teachers list.");
            setIsLoadingTeachers(false);
          }
        });
    } else if (adminPanelTab === 'filters') {
      setIsLoadingOptions(true);
      setOptionsError('');
      pb.collection('dahoot_options').getFullList()
        .then(list => {
          if (active) {
            setOptionsList(list);
            setIsLoadingOptions(false);
          }
        })
        .catch(err => {
          if (active) {
            console.error("Error fetching options:", err);
            setOptionsError("Failed to load filter options.");
            setIsLoadingOptions(false);
          }
        });
    }

    return () => { active = false; };
  }, [isOpen, adminPanelTab]);

  const handleAddOption = async (type, value) => {
    if (!value.trim()) return;
    const cleanValue = value.trim();
    const exists = optionsList.some(opt => opt.type === type && opt.value.toLowerCase() === cleanValue.toLowerCase());
    if (exists) {
      await confirm({
        title: "Duplicate Option",
        message: `This option already exists.`,
        confirmText: "OK",
        cancelText: null,
        variant: "warning"
      });
      return;
    }

    setIsAddingOption(true);
    setOptionsError('');
    try {
      const created = await pb.collection('dahoot_options').create({ type, value: cleanValue });
      const updatedList = [...optionsList, created];
      setOptionsList(updatedList);

      const subjects = updatedList.filter(r => r.type === 'subject').map(r => r.value);
      const cefr = updatedList.filter(r => r.type === 'cefr_level').map(r => r.value);
      const langs = updatedList.filter(r => r.type === 'language').map(r => r.value);
      if (type === 'subject') {
        setAvailableSubjects(subjects);
        setNewSubjectValue('');
      } else if (type === 'cefr_level') {
        setAvailableCefrLevels(cefr);
        setNewCefrValue('');
      } else if (type === 'language') {
        setAvailableLanguages(langs);
        setNewLanguageValue('');
      }
    } catch (err) {
      console.error("Error adding option:", err);
      setOptionsError("Failed to add option: " + err.message);
    } finally {
      setIsAddingOption(false);
    }
  };

  const handleDeleteOption = async (option) => {
    const confirmed = await confirm({
      title: "Delete Option",
      message: `Are you sure you want to delete "${option.value}"?`
    });
    if (!confirmed) return;

    setOptionsError('');
    try {
      await pb.collection('dahoot_options').delete(option.id);
      const updatedList = optionsList.filter(opt => opt.id !== option.id);
      setOptionsList(updatedList);

      const subjects = updatedList.filter(r => r.type === 'subject').map(r => r.value);
      const cefr = updatedList.filter(r => r.type === 'cefr_level').map(r => r.value);
      const langs = updatedList.filter(r => r.type === 'language').map(r => r.value);

      setAvailableSubjects(subjects.length > 0 ? subjects : ['Math', 'Science', 'English', 'History', 'Geography', 'Other']);
      setAvailableCefrLevels(cefr.length > 0 ? cefr : ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
      setAvailableLanguages(langs.length > 0 ? langs : ['English', 'Thai', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Russian', 'Other']);
    } catch (err) {
      console.error("Error deleting option:", err);
      setOptionsError("Failed to delete option: " + err.message);
    }
  };

  const saveInviteCode = async () => {
    setInviteSuccess('');
    setInviteError('');
    setIsSavingInvite(true);
    try {
      if (!inviteCodeValue.trim()) {
        throw new Error("Invite code cannot be empty.");
      }

      let record = inviteCodeSettingRecord;
      if (!record) {
        record = await pb.collection('dahoot_settings').getFirstListItem('key = "invite_code"');
      }

      const updated = await pb.collection('dahoot_settings').update(record.id, {
        value: inviteCodeValue.trim()
      });

      setInviteCodeSettingRecord(updated);
      setInviteCodeValue(updated.value);
      setInviteSuccess("Invite code updated successfully!");
    } catch (err) {
      console.error("Error saving invite code:", err);
      setInviteError(err.message || "Failed to update invite code.");
    } finally {
      setIsSavingInvite(false);
    }
  };

  const handleUpdateRole = async (user, newRole) => {
    setTeachersError('');
    try {
      if (user.id === currentUser.id) {
        await confirm({
          title: "Action Not Allowed",
          message: "You cannot change your own role!",
          confirmText: "OK",
          cancelText: null,
          variant: "warning"
        });
        return;
      }
      if (user.expand && user.expand.dahoot_info) {
        await pb.collection('dahoot_user_info').update(user.expand.dahoot_info.id, {
          role: newRole
        });
      } else {
        const info = await pb.collection('dahoot_user_info').create({
          role: newRole
        });
        await pb.collection('users').update(user.id, {
          dahoot_info: info.id
        });
      }

      const list = await pb.collection('users').getFullList({
        filter: 'dahoot_info != ""',
        expand: 'dahoot_info',
        sort: 'created'
      });
      setTeachers(list.filter(t => t.dahoot_info));
    } catch (err) {
      console.error("Error updating user role:", err);
      setTeachersError("Failed to update role: " + err.message);
    }
  };

  const handleToggleDisableUser = async (user) => {
    if (user.id === currentUser.id) {
      await confirm({
        title: "Action Not Allowed",
        message: "You cannot disable yourself!",
        confirmText: "OK",
        cancelText: null,
        variant: "warning"
      });
      return;
    }
    const info = user.expand?.dahoot_info;
    const isCurrentlyDisabled = info?.role === 'DISABLED';
    const actionText = isCurrentlyDisabled ? "enable" : "disable";
    const confirmTitle = isCurrentlyDisabled ? "Enable User" : "Disable User";
    const confirmMessage = isCurrentlyDisabled
      ? `Are you sure you want to enable user ${user.email || user.username}? This will restore their access.`
      : `Are you sure you want to disable user ${user.email || user.username}? They will not be able to create or manage games.`;

    const confirmed = await confirm({
      title: confirmTitle,
      message: confirmMessage,
      confirmText: isCurrentlyDisabled ? "Enable User" : "Disable User",
      variant: isCurrentlyDisabled ? "primary" : "danger"
    });
    if (!confirmed) return;
    setTeachersError('');
    try {
      const newRole = isCurrentlyDisabled ? 'TEACHER' : 'DISABLED';
      if (user.dahoot_info) {
        await pb.collection('dahoot_user_info').update(user.dahoot_info, {
          role: newRole
        });
      } else {
        const newInfo = await pb.collection('dahoot_user_info').create({
          role: newRole
        });
        await pb.collection('users').update(user.id, {
          dahoot_info: newInfo.id
        });
      }
      const list = await pb.collection('users').getFullList({
        filter: 'dahoot_info != ""',
        expand: 'dahoot_info',
        sort: 'created'
      });
      setTeachers(list.filter(t => t.dahoot_info));
    } catch (err) {
      console.error("Error toggling user status:", err);
      setTeachersError(`Failed to ${actionText} user: ` + err.message);
    }
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setCreateTeacherError('');
    setCreateTeacherSuccess('');
    setCreateTeacherLoading(true);
    try {
      if (!newTeacherEmail.trim() || !newTeacherPassword) {
        throw new Error("Email and password are required.");
      }
      if (newTeacherPassword.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      const info = await pb.collection('dahoot_user_info').create({
        role: newTeacherRole,
        school: newTeacherSchool.trim() || undefined
      });

      try {
        await pb.collection('users').create({
          email: newTeacherEmail.trim(),
          password: newTeacherPassword,
          passwordConfirm: newTeacherPassword,
          username: newTeacherEmail.trim().split('@')[0] + Math.floor(Math.random() * 10000),
          name: newTeacherName.trim() || undefined,
          dahoot_info: info.id
        });
      } catch (userErr) {
        try { await pb.collection('dahoot_user_info').delete(info.id); } catch (delErr) { }
        throw userErr;
      }

      setCreateTeacherSuccess("New teacher account created successfully!");
      setNewTeacherName('');
      setNewTeacherEmail('');
      setNewTeacherPassword('');
      setNewTeacherSchool('');
      setNewTeacherRole('TEACHER');
      setIsCreatingTeacher(false);

      const list = await pb.collection('users').getFullList({
        filter: 'dahoot_info != ""',
        expand: 'dahoot_info',
        sort: 'created'
      });
      setTeachers(list.filter(t => t.dahoot_info));
    } catch (err) {
      console.error("Error creating teacher:", err);
      let msg = err.message || "Failed to create teacher.";
      if (err.response?.data) {
        const details = Object.entries(err.response.data)
          .map(([key, val]) => `${key}: ${val.message}`)
          .join(', ');
        if (details) msg = `Validation failed: ${details}`;
      }
      setCreateTeacherError(msg);
    } finally {
      setCreateTeacherLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
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
          className="panel panel-large animate-fade-in p-6 sm:p-8"
          style={{
            width: '100%',
            maxWidth: '1100px',
            maxHeight: '90vh',
            overflowY: 'auto',
            textAlign: 'left',
            border: '1px solid var(--panel-border-focus)',
            position: 'relative'
          }}
        >
          <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }} className="text-slate-800 flex items-center gap-2">
                ⚙️ Dahoot Administration Panel
              </h2>
              <p className="text-xs text-slate-500 mt-1">Configure global settings and manage teacher access control</p>
            </div>
            <button
              onClick={() => {
                setIsCreatingTeacher(false);
                setCreateTeacherError('');
                setCreateTeacherSuccess('');
                onClose();
              }}
              className="text-slate-400 hover:text-slate-600 font-bold text-lg p-2 rounded-full hover:bg-slate-100 transition-all cursor-pointer border-none outline-none bg-transparent"
            >
              ✕
            </button>
          </div>

          <div className="flex gap-2 mb-6 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
            <button
              type="button"
              onClick={() => setAdminPanelTab('invite')}
              className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer border-none outline-none ${adminPanelTab === 'invite' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 bg-transparent'}`}
            >
              ✉️ Signup Invite Code
            </button>
            <button
              type="button"
              onClick={() => setAdminPanelTab('teachers')}
              className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer border-none outline-none ${adminPanelTab === 'teachers' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 bg-transparent'}`}
            >
              👥 Manage Teacher Accounts
            </button>
            <button
              type="button"
              onClick={() => setAdminPanelTab('filters')}
              className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer border-none outline-none ${adminPanelTab === 'filters' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 bg-transparent'}`}
            >
              🏷️ Filter Options
            </button>
          </div>

          {adminPanelTab === 'invite' && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-2">Invite Code Settings</h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  When new teachers register, they must enter this exact code. You can update this code at any time.
                </p>

                {inviteSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-3 rounded-xl text-xs font-semibold mb-4">
                    ✓ {inviteSuccess}
                  </div>
                )}
                {inviteError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-xs font-semibold mb-4">
                    ❌ {inviteError}
                  </div>
                )}

                <div className="form-group mb-4">
                  <label className="form-label" htmlFor="adminInviteCode">Current Invite Code</label>
                  <input
                    type="text"
                    id="adminInviteCode"
                    className="form-input font-mono uppercase tracking-wider text-center max-w-sm text-base font-bold bg-white"
                    value={inviteCodeValue}
                    onChange={(e) => {
                      setInviteCodeValue(e.target.value);
                      setInviteSuccess('');
                    }}
                    placeholder="Enter invite code"
                    disabled={isSavingInvite}
                  />
                </div>

                <button
                  type="button"
                  onClick={saveInviteCode}
                  disabled={isSavingInvite || !inviteCodeValue.trim()}
                  className="btn btn-primary"
                  style={{ width: 'auto', minWidth: '150px', padding: '10px 20px', fontSize: '0.85rem' }}
                >
                  {isSavingInvite ? 'Saving...' : 'Update Invite Code'}
                </button>
              </div>
            </div>
          )}

          {adminPanelTab === 'teachers' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-800 margin-0">Registered Accounts</h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingTeacher(!isCreatingTeacher)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer border-none outline-none"
                >
                  {isCreatingTeacher ? '✕ Close Form' : '+ Add Teacher'}
                </button>
              </div>

              {teachersError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-xs font-semibold mb-4">
                  ❌ {teachersError}
                </div>
              )}

              {isCreatingTeacher && (
                <form onSubmit={handleCreateTeacher} className="bg-slate-50 border border-indigo-100 rounded-2xl p-5 mb-6 space-y-4">
                  <h4 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider mb-2">Create New Teacher Profile</h4>

                  {createTeacherSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-2 rounded-xl text-xs font-semibold">
                      ✓ {createTeacherSuccess}
                    </div>
                  )}
                  {createTeacherError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-2 rounded-xl text-xs font-semibold">
                      ❌ {createTeacherError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label" htmlFor="newTName">Full Name</label>
                      <input type="text" id="newTName" className="form-input bg-white" value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} placeholder="e.g. Sarah Connor" disabled={createTeacherLoading} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="newTEmail">Email Address *</label>
                      <input type="email" id="newTEmail" className="form-input bg-white" value={newTeacherEmail} onChange={(e) => setNewTeacherEmail(e.target.value)} placeholder="sarah@school.edu" required disabled={createTeacherLoading} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="newTPassword">Password *</label>
                      <input type="password" id="newTPassword" className="form-input bg-white" value={newTeacherPassword} onChange={(e) => setNewTeacherPassword(e.target.value)} placeholder="Min 8 characters" required disabled={createTeacherLoading} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="newTSchool">School / Organization</label>
                      <input type="text" id="newTSchool" className="form-input bg-white" value={newTeacherSchool} onChange={(e) => setNewTeacherSchool(e.target.value)} placeholder="e.g. West High School" disabled={createTeacherLoading} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="newTRole">System Role</label>
                      <select id="newTRole" className="form-input bg-white py-2" value={newTeacherRole} onChange={(e) => setNewTeacherRole(e.target.value)} disabled={createTeacherLoading}>
                        <option value="TEACHER">TEACHER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <button type="button" onClick={() => { setIsCreatingTeacher(false); setCreateTeacherError(''); setCreateTeacherSuccess(''); }} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer border-none outline-none">Cancel</button>
                    <button type="submit" disabled={createTeacherLoading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer border-none outline-none">{createTeacherLoading ? 'Creating...' : 'Create Account'}</button>
                  </div>
                </form>
              )}

              {isLoadingTeachers ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="spinner mb-3 animate-spin" />
                  <p className="text-xs text-slate-500">Loading user accounts...</p>
                </div>
              ) : teachers.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-slate-400">No accounts found.</div>
              ) : (
                <div className="overflow-x-auto border border-slate-200/60 rounded-2xl bg-white shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                        <th className="p-3">User Details</th>
                        <th className="p-3">School</th>
                        <th className="p-3">System Role</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachers.map((t) => {
                        const info = t.expand?.dahoot_info;
                        const role = info?.role || 'TEACHER';
                        const schoolName = info?.school || 'N/A';
                        const isSelf = t.id === currentUser.id;
                        return (
                          <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-slate-800">{t.name || 'Unnamed Teacher'}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{t.email}</div>
                              {isSelf && <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded ml-0.5 mt-1 inline-block border border-slate-200">Current Session</span>}
                            </td>
                            <td className="p-3 text-slate-600 font-medium">{schoolName}</td>
                            <td className="p-3">
                              <select value={role} onChange={(e) => handleUpdateRole(t, e.target.value)} disabled={isSelf} className="bg-slate-50 border border-slate-200 rounded px-2 py-1 font-bold text-[10px] text-slate-700 focus:outline-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                                <option value="TEACHER">TEACHER</option>
                                <option value="ADMIN">ADMIN</option>
                                <option value="STUDENT">STUDENT</option>
                                <option value="DISABLED">DISABLED</option>
                              </select>
                            </td>
                            <td className="p-3 text-right">
                              <button type="button" onClick={() => handleToggleDisableUser(t)} disabled={isSelf} className={`px-2.5 py-1 border rounded font-bold text-[10px] transition-all cursor-pointer outline-none disabled:opacity-30 disabled:cursor-not-allowed ${role === 'DISABLED' ? 'border-indigo-200 hover:bg-indigo-50 text-indigo-500 hover:text-indigo-600' : 'border-rose-200 hover:bg-rose-50 text-rose-500 hover:text-rose-600'}`}>
                                {role === 'DISABLED' ? 'Enable' : 'Disable'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {adminPanelTab === 'filters' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-800 mb-2">Manage Filter Options</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Add or remove subjects and CEFR levels that are globally available for tagging and filtering quizzes.
              </p>

              {optionsError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-xs font-semibold mb-4">
                  ❌ {optionsError}
                </div>
              )}

              {isLoadingOptions ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="spinner mb-3 animate-spin" />
                  <p className="text-xs text-slate-500">Loading filter options...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Subjects</h4>
                    <div className="flex gap-2">
                      <input type="text" placeholder="New Subject (e.g. Science)" className="form-input bg-white text-xs py-2 px-3 h-auto" value={newSubjectValue} onChange={(e) => setNewSubjectValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddOption('subject', newSubjectValue)} disabled={isAddingOption} />
                      <button type="button" onClick={() => handleAddOption('subject', newSubjectValue)} disabled={isAddingOption || !newSubjectValue.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap">Add</button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200/50 rounded-xl p-3 bg-white">
                      {optionsList.filter(o => o.type === 'subject').length === 0 ? (
                        <p className="text-slate-400 text-xs italic text-center py-2">No subjects configured.</p>
                      ) : (
                        optionsList.filter(o => o.type === 'subject').map(opt => (
                          <div key={opt.id} className="flex justify-between items-center bg-slate-50 hover:bg-slate-100/50 p-2.5 rounded-lg border border-slate-100 text-xs transition-colors">
                            <span className="font-semibold text-slate-700">{opt.value}</span>
                            <button type="button" onClick={() => handleDeleteOption(opt)} className="text-rose-400 hover:text-rose-600 font-bold px-2 py-1 bg-transparent border-none cursor-pointer">✕</button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">CEFR Levels</h4>
                    <div className="flex gap-2">
                      <input type="text" placeholder="New CEFR Level (e.g. C1)" className="form-input bg-white text-xs py-2 px-3 h-auto" value={newCefrValue} onChange={(e) => setNewCefrValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddOption('cefr_level', newCefrValue)} disabled={isAddingOption} />
                      <button type="button" onClick={() => handleAddOption('cefr_level', newCefrValue)} disabled={isAddingOption || !newCefrValue.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap">Add</button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200/50 rounded-xl p-3 bg-white">
                      {optionsList.filter(o => o.type === 'cefr_level').length === 0 ? (
                        <p className="text-slate-400 text-xs italic text-center py-2">No CEFR levels configured.</p>
                      ) : (
                        optionsList.filter(o => o.type === 'cefr_level').map(opt => (
                          <div key={opt.id} className="flex justify-between items-center bg-slate-50 hover:bg-slate-100/50 p-2.5 rounded-lg border border-slate-100 text-xs transition-colors">
                            <span className="font-semibold text-slate-700">{opt.value}</span>
                            <button type="button" onClick={() => handleDeleteOption(opt)} className="text-rose-400 hover:text-rose-600 font-bold px-2 py-1 bg-transparent border-none cursor-pointer">✕</button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Languages</h4>
                    <div className="flex gap-2">
                      <input type="text" placeholder="New Language (e.g. French)" className="form-input bg-white text-xs py-2 px-3 h-auto" value={newLanguageValue} onChange={(e) => setNewLanguageValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddOption('language', newLanguageValue)} disabled={isAddingOption} />
                      <button type="button" onClick={() => handleAddOption('language', newLanguageValue)} disabled={isAddingOption || !newLanguageValue.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap">Add</button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200/50 rounded-xl p-3 bg-white">
                      {optionsList.filter(o => o.type === 'language').length === 0 ? (
                        <p className="text-slate-400 text-xs italic text-center py-2">No languages configured.</p>
                      ) : (
                        optionsList.filter(o => o.type === 'language').map(opt => (
                          <div key={opt.id} className="flex justify-between items-center bg-slate-50 hover:bg-slate-100/50 p-2.5 rounded-lg border border-slate-100 text-xs transition-colors">
                            <span className="font-semibold text-slate-700">{opt.value}</span>
                            <button type="button" onClick={() => handleDeleteOption(opt)} className="text-rose-400 hover:text-rose-600 font-bold px-2 py-1 bg-transparent border-none cursor-pointer">✕</button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {ConfirmDialog}
    </>
  );
}
