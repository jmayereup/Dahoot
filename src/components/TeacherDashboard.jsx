import React, { useState, useMemo, useEffect } from 'react';
import { OPTION_CLASSES, OPTION_SHAPES } from '../constants';
import { pb } from '../pb';
import { QuestionInteraction } from './QuestionInteraction';
import { useConfirm } from '../hooks/useConfirm.jsx';

export function TeacherDashboard({
  // Games List State & Handlers
  gamesList = [],
  selectedGame,
  setSelectedGame,
  isEditingGame,
  selectedGameForEdit,
  gameTitle,
  setGameTitle,
  gameDescription,
  setGameDescription,
  gameCreator,
  setGameCreator,
  gameLanguage,
  setGameLanguage,
  gameCefrLevel,
  setGameCefrLevel,
  gameSubject,
  setGameSubject,
  startCreatingGame,
  startEditingGame,
  cancelEditingGame,
  saveGame,
  deleteGame,
  copyGame,

  // Questions List State & Handlers
  questionsList = [],
  loading,
  error,
  isEditing,
  selectedQuestion,
  questionType,
  setQuestionType,
  questionText,
  setQuestionText,

  // Game Creation Questions State & Handlers
  pendingQuestions = [],
  creationQuestionsTab = 'individual',
  setCreationQuestionsTab,
  addPendingQuestion,
  removePendingQuestion,

  // Import State & Handlers
  isImporting,
  importText,
  setImportText,
  startImporting,
  cancelImporting,
  saveImportedQuestions,
  
  // Multiple Choice & Sorting
  options,
  updateOptionValue,
  correctOptionIndex,
  setCorrectOptionIndex,

  // Drag & Drop
  dragSentence,
  setDragSentence,
  dragChoices,
  updateDragChoice,

  // Drop Down
  dropdownSentence,
  setDropdownSentence,
  dropdownOptions,
  updateDropdownOption,

  // Categorize
  categorizeCategories,
  setCategorizeCategories,
  categorizeItemsText,
  setCategorizeItemsText,

  startCreating,
  startEditing,
  cancelEditing,
  saveQuestion,
  deleteQuestion,
  setView,
  availableSubjects = [],
  availableCefrLevels = [],
  availableLanguages = [],
  setAvailableSubjects,
  setAvailableCefrLevels,
  setAvailableLanguages,
  currentUser = null,
  onLogout = null,
  startHosting = null
}) {
  const { confirm, ConfirmDialog } = useConfirm();

  const handleDeleteGame = async (id, e) => {
    if (e) e.stopPropagation();
    const ok = await confirm({
      title: 'Delete this game?',
      message: 'This will also delete all of its questions. This action cannot be undone.',
      confirmText: 'Delete Game',
      cancelText: 'Keep Game',
      variant: 'danger',
      icon: '🗑️'
    });
    if (ok) deleteGame(id);
  };

  const handleCopyGame = async (game, e) => {
    if (e) e.stopPropagation();
    const ok = await confirm({
      title: 'Copy this game?',
      message: `A duplicate of "${game.title}" will be created with "(Copy)" appended to its title.`,
      confirmText: 'Copy Game',
      cancelText: 'Cancel',
      variant: 'primary',
      icon: '📋'
    });
    if (ok) copyGame(game);
  };

  const handleDeleteQuestion = async (id) => {
    const ok = await confirm({
      title: 'Delete this question?',
      message: 'This action cannot be undone.',
      confirmText: 'Delete Question',
      cancelText: 'Keep Question',
      variant: 'danger',
      icon: '🗑️'
    });
    if (ok) deleteQuestion(id);
  };

  // Client-side filtering state
  const [filterSubject, setFilterSubject] = useState([]);
  const [filterCefr, setFilterCefr] = useState([]);
  const [filterLanguage, setFilterLanguage] = useState([]);
  const [filterCreator, setFilterCreator] = useState([]);
  const [libraryTab, setLibraryTab] = useState('all'); // 'all' | 'my'

  // Preview Game state
  const [previewGame, setPreviewGame] = useState(null);
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewCurrentIdx, setPreviewCurrentIdx] = useState(0);
  
  // Interactive preview answering states
  const [previewAnswered, setPreviewAnswered] = useState(false);
  const [previewIsCorrect, setPreviewIsCorrect] = useState(false);
  const [previewPlayerAnswer, setPreviewPlayerAnswer] = useState(null);
  const [previewCategorizeIdx, setPreviewCategorizeIdx] = useState(0);

  // Admin Panel states
  const [userRole, setUserRole] = useState('TEACHER');
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminPanelTab, setAdminPanelTab] = useState('invite'); // 'invite' | 'teachers' | 'filters'
  const [optionsList, setOptionsList] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [newSubjectValue, setNewSubjectValue] = useState('');
  const [newCefrValue, setNewCefrValue] = useState('');
  const [newLanguageValue, setNewLanguageValue] = useState('');
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [showCefrTips, setShowCefrTips] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [teachersError, setTeachersError] = useState('');
  
  const [inviteCodeSettingRecord, setInviteCodeSettingRecord] = useState(null);
  const [inviteCodeValue, setInviteCodeValue] = useState('');
  const [isSavingInvite, setIsSavingInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  // Create teacher form states
  const [isCreatingTeacher, setIsCreatingTeacher] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('');
  const [newTeacherSchool, setNewTeacherSchool] = useState('');
  const [newTeacherRole, setNewTeacherRole] = useState('TEACHER');
  const [createTeacherLoading, setCreateTeacherLoading] = useState(false);
  const [createTeacherError, setCreateTeacherError] = useState('');
  const [createTeacherSuccess, setCreateTeacherSuccess] = useState('');

  // AI Autogenerate States
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [genMcCount, setGenMcCount] = useState(10);
  const [genSortingCount, setGenSortingCount] = useState(3);
  const [genCategorizeCount, setGenCategorizeCount] = useState(2);
  const [genDragDropCount, setGenDragDropCount] = useState(5);
  const [genDropDownCount, setGenDropDownCount] = useState(5);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState('');


  // Fetch current user's role from dahoot_user_info
  useEffect(() => {
    let active = true;
    if (currentUser && currentUser.dahoot_info) {
      pb.collection('dahoot_user_info').getOne(currentUser.dahoot_info)
        .then(record => {
          if (active && record && record.role) {
            setUserRole(record.role);
          }
        })
        .catch(err => {
          if (active) {
            console.error("Error fetching user role:", err);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [currentUser]);

  // Load Admin Data when Admin Panel opens or tab changes
  useEffect(() => {
    let active = true;
    if (isAdminPanelOpen) {
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
          expand: 'dahoot_info',
          sort: 'created'
        })
          .then(list => {
            if (active) {
              setTeachers(list);
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
    }
    return () => {
      active = false;
    };
  }, [isAdminPanelOpen, adminPanelTab]);

  const handleAddOption = async (type, value) => {
    if (!value.trim()) return;
    const cleanValue = value.trim();
    
    // Check for duplicates locally
    const exists = optionsList.some(opt => opt.type === type && opt.value.toLowerCase() === cleanValue.toLowerCase());
    if (exists) {
      alert(`This option already exists.`);
      return;
    }

    setIsAddingOption(true);
    setOptionsError('');
    try {
      const created = await pb.collection('dahoot_options').create({ type, value: cleanValue });
      const updatedList = [...optionsList, created];
      setOptionsList(updatedList);
      
      // Update global parent state instantly
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
      
      // Update global parent state instantly
      const subjects = updatedList.filter(r => r.type === 'subject').map(r => r.value);
      const cefr = updatedList.filter(r => r.type === 'cefr_level').map(r => r.value);
      const langs = updatedList.filter(r => r.type === 'language').map(r => r.value);
      
      // Keep fallbacks if lists are empty
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
        alert("You cannot change your own role!");
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
        expand: 'dahoot_info',
        sort: 'created'
      });
      setTeachers(list);
    } catch (err) {
      console.error("Error updating user role:", err);
      setTeachersError("Failed to update role: " + err.message);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.id === currentUser.id) {
      alert("You cannot delete yourself!");
      return;
    }
    const confirmed = await confirm({
      title: "Delete User",
      message: `Are you sure you want to delete user ${user.email || user.username}?`
    });
    if (!confirmed) return;
    setTeachersError('');
    try {
      await pb.collection('users').delete(user.id);
      if (user.dahoot_info) {
        await pb.collection('dahoot_user_info').delete(user.dahoot_info);
      }
      const list = await pb.collection('users').getFullList({
        expand: 'dahoot_info',
        sort: 'created'
      });
      setTeachers(list);
    } catch (err) {
      console.error("Error deleting user:", err);
      setTeachersError("Failed to delete user: " + err.message);
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
        try {
          await pb.collection('dahoot_user_info').delete(info.id);
        } catch (delErr) {
          console.error("Failed to delete orphaned user info record:", delErr);
        }
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
        expand: 'dahoot_info',
        sort: 'created'
      });
      setTeachers(list);
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

  const renderAdminPanel = () => {
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px'
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
                setIsAdminPanelOpen(false);
                setIsCreatingTeacher(false);
                setCreateTeacherError('');
                setCreateTeacherSuccess('');
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
                      <input
                        type="text"
                        id="newTName"
                        className="form-input bg-white"
                        value={newTeacherName}
                        onChange={(e) => setNewTeacherName(e.target.value)}
                        placeholder="e.g. Sarah Connor"
                        disabled={createTeacherLoading}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="newTEmail">Email Address *</label>
                      <input
                        type="email"
                        id="newTEmail"
                        className="form-input bg-white"
                        value={newTeacherEmail}
                        onChange={(e) => setNewTeacherEmail(e.target.value)}
                        placeholder="sarah@school.edu"
                        required
                        disabled={createTeacherLoading}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="newTPassword">Password *</label>
                      <input
                        type="password"
                        id="newTPassword"
                        className="form-input bg-white"
                        value={newTeacherPassword}
                        onChange={(e) => setNewTeacherPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        required
                        disabled={createTeacherLoading}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="newTSchool">School / Organization</label>
                      <input
                        type="text"
                        id="newTSchool"
                        className="form-input bg-white"
                        value={newTeacherSchool}
                        onChange={(e) => setNewTeacherSchool(e.target.value)}
                        placeholder="e.g. West High School"
                        disabled={createTeacherLoading}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="newTRole">System Role</label>
                      <select
                        id="newTRole"
                        className="form-input bg-white py-2"
                        value={newTeacherRole}
                        onChange={(e) => setNewTeacherRole(e.target.value)}
                        disabled={createTeacherLoading}
                      >
                        <option value="TEACHER">TEACHER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingTeacher(false);
                        setCreateTeacherError('');
                        setCreateTeacherSuccess('');
                      }}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer border-none outline-none"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createTeacherLoading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer border-none outline-none"
                    >
                      {createTeacherLoading ? 'Creating...' : 'Create Account'}
                    </button>
                  </div>
                </form>
              )}

              {isLoadingTeachers ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="spinner mb-3 animate-spin" />
                  <p className="text-xs text-slate-505">Loading user accounts...</p>
                </div>
              ) : teachers.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-205 rounded-2xl text-slate-400">
                  No accounts found.
                </div>
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
                              {isSelf && (
                                <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded ml-0.5 mt-1 inline-block border border-slate-200">
                                  Current Session
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-600 font-medium">{schoolName}</td>
                            <td className="p-3">
                              <select
                                value={role}
                                onChange={(e) => handleUpdateRole(t, e.target.value)}
                                disabled={isSelf}
                                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 font-bold text-[10px] text-slate-700 focus:outline-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="TEACHER">TEACHER</option>
                                <option value="ADMIN">ADMIN</option>
                                <option value="STUDENT">STUDENT</option>
                              </select>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(t)}
                                disabled={isSelf}
                                className="px-2.5 py-1 border border-rose-200 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded font-bold text-[10px] transition-all cursor-pointer outline-none disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                              >
                                Delete
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
                  {/* Subjects Section */}
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Subjects</h4>
                    
                    {/* Add Subject Inline Form */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="New Subject (e.g. Science)"
                        className="form-input bg-white text-xs py-2 px-3 h-auto"
                        value={newSubjectValue}
                        onChange={(e) => setNewSubjectValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddOption('subject', newSubjectValue)}
                        disabled={isAddingOption}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddOption('subject', newSubjectValue)}
                        disabled={isAddingOption || !newSubjectValue.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
                      >
                        Add
                      </button>
                    </div>

                    {/* Subjects List */}
                    <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200/50 rounded-xl p-3 bg-white">
                      {optionsList.filter(o => o.type === 'subject').length === 0 ? (
                        <p className="text-slate-400 text-xs italic text-center py-2">No subjects configured.</p>
                      ) : (
                        optionsList.filter(o => o.type === 'subject').map(opt => (
                          <div key={opt.id} className="flex justify-between items-center bg-slate-50 hover:bg-slate-100/50 p-2.5 rounded-lg border border-slate-100 text-xs transition-colors">
                            <span className="font-semibold text-slate-700">{opt.value}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteOption(opt)}
                              className="text-rose-400 hover:text-rose-600 font-bold px-2 py-1 bg-transparent border-none cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* CEFR Levels Section */}
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">CEFR Levels</h4>
                    
                    {/* Add CEFR Inline Form */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="New CEFR Level (e.g. C1)"
                        className="form-input bg-white text-xs py-2 px-3 h-auto"
                        value={newCefrValue}
                        onChange={(e) => setNewCefrValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddOption('cefr_level', newCefrValue)}
                        disabled={isAddingOption}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddOption('cefr_level', newCefrValue)}
                        disabled={isAddingOption || !newCefrValue.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
                      >
                        Add
                      </button>
                    </div>

                    {/* CEFR List */}
                    <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200/50 rounded-xl p-3 bg-white">
                      {optionsList.filter(o => o.type === 'cefr_level').length === 0 ? (
                        <p className="text-slate-400 text-xs italic text-center py-2">No CEFR levels configured.</p>
                      ) : (
                        optionsList.filter(o => o.type === 'cefr_level').map(opt => (
                          <div key={opt.id} className="flex justify-between items-center bg-slate-50 hover:bg-slate-100/50 p-2.5 rounded-lg border border-slate-100 text-xs transition-colors">
                            <span className="font-semibold text-slate-700">{opt.value}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteOption(opt)}
                              className="text-rose-400 hover:text-rose-600 font-bold px-2 py-1 bg-transparent border-none cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Languages Section */}
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Languages</h4>
                    
                    {/* Add Language Inline Form */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="New Language (e.g. French)"
                        className="form-input bg-white text-xs py-2 px-3 h-auto"
                        value={newLanguageValue}
                        onChange={(e) => setNewLanguageValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddOption('language', newLanguageValue)}
                        disabled={isAddingOption}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddOption('language', newLanguageValue)}
                        disabled={isAddingOption || !newLanguageValue.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
                      >
                        Add
                      </button>
                    </div>

                    {/* Languages List */}
                    <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200/50 rounded-xl p-3 bg-white">
                      {optionsList.filter(o => o.type === 'language').length === 0 ? (
                        <p className="text-slate-400 text-xs italic text-center py-2">No languages configured.</p>
                      ) : (
                        optionsList.filter(o => o.type === 'language').map(opt => (
                          <div key={opt.id} className="flex justify-between items-center bg-slate-50 hover:bg-slate-100/50 p-2.5 rounded-lg border border-slate-100 text-xs transition-colors">
                            <span className="font-semibold text-slate-700">{opt.value}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteOption(opt)}
                              className="text-rose-400 hover:text-rose-600 font-bold px-2 py-1 bg-transparent border-none cursor-pointer"
                            >
                              ✕
                            </button>
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
    );
  };

  const initPreviewQuestionStates = () => {
    setPreviewAnswered(false);
    setPreviewIsCorrect(false);
    setPreviewPlayerAnswer(null);
    setPreviewCategorizeIdx(0);
  };

  const startPreviewGame = async (game) => {
    setPreviewGame(game);
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewCurrentIdx(0);
    setPreviewAnswered(false);
    setPreviewIsCorrect(false);
    try {
      const qList = await pb.collection('dahoot_questions').getFullList({
        filter: pb.filter("game_id = {:gameId}", { gameId: game.id }),
        sort: 'created'
      });
      setPreviewQuestions(qList);
      if (qList.length > 0) {
        initPreviewQuestionStates();
      }
    } catch (err) {
      console.error(err);
      setPreviewError('Failed to load preview questions: ' + err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreviewGame = () => {
    setPreviewGame(null);
    setPreviewQuestions([]);
    setPreviewCurrentIdx(0);
    setPreviewAnswered(false);
    setPreviewIsCorrect(false);
    setPreviewPlayerAnswer(null);
    setPreviewCategorizeIdx(0);
  };

  const submitPreviewAnswer = (userAnswer) => {
    if (previewAnswered) return;

    const activeQuestion = previewQuestions[previewCurrentIdx];
    let isCorrect = false;
    const type = activeQuestion.type || 'MULTIPLE_CHOICE';

    if (type === 'MULTIPLE_CHOICE') {
      isCorrect = userAnswer === activeQuestion.correct_option_index;
    } else if (type === 'SORTING') {
      isCorrect = Array.isArray(userAnswer) && 
                  userAnswer.length === activeQuestion.options.length &&
                  userAnswer.every((val, i) => val === activeQuestion.options[i]);
    } else if (type === 'DRAG_DROP') {
      const correctArr = activeQuestion.options.correct || [];
      isCorrect = Array.isArray(userAnswer) && 
                  userAnswer.length === correctArr.length &&
                  userAnswer.every((val, i) => val === correctArr[i]);
    } else if (type === 'DROP_DOWN') {
      const dropdowns = activeQuestion.options.dropdowns || [];
      isCorrect = Array.isArray(userAnswer) && 
                  userAnswer.length === dropdowns.length &&
                  userAnswer.every((val, i) => val === dropdowns[i]?.correct);
    } else if (type === 'CATEGORIZE') {
      const correctItems = activeQuestion.options.items || [];
      isCorrect = typeof userAnswer === 'object' && userAnswer !== null &&
                  correctItems.every(item => userAnswer[item.name] === item.category);
    }

    setPreviewPlayerAnswer(userAnswer);
    setPreviewIsCorrect(isCorrect);
    setPreviewAnswered(true);
  };

  const nextPreviewQuestion = () => {
    if (previewCurrentIdx + 1 < previewQuestions.length) {
      const nextIdx = previewCurrentIdx + 1;
      setPreviewCurrentIdx(nextIdx);
      initPreviewQuestionStates();
    } else {
      alert("You have previewed all questions in this Dahoot!");
      closePreviewGame();
    }
  };

  const renderPreviewQuestionBody = () => {
    const activeQuestion = previewQuestions[previewCurrentIdx];
    if (!activeQuestion) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!previewAnswered ? (
          <QuestionInteraction
            question={activeQuestion}
            questionNumber={previewCurrentIdx + 1}
            totalQuestions={previewQuestions.length}
            mode="interactive"
            onSubmit={submitPreviewAnswer}
            categorizeIdx={previewCategorizeIdx}
            onCategorizeIdxChange={setPreviewCategorizeIdx}
          />
        ) : (
          <>
            <div style={{
              background: previewIsCorrect ? 'rgba(76, 175, 80, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: '1px solid ' + (previewIsCorrect ? 'rgba(76, 175, 80, 0.3)' : 'rgba(239, 68, 68, 0.3)'),
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <h3 style={{
                color: previewIsCorrect ? '#4caf50' : '#ff4b60',
                margin: '0 0 6px 0',
                fontSize: '1.2rem',
                fontWeight: 700,
                textShadow: previewIsCorrect ? '0 0 10px rgba(76, 175, 80, 0.3)' : '0 0 10px rgba(255, 75, 96, 0.3)'
              }}>
                {previewIsCorrect ? '🎉 Correct!' : '❌ Incorrect'}
              </h3>
            </div>

            <QuestionInteraction
              question={activeQuestion}
              mode="review"
              playerAnswer={previewPlayerAnswer}
            />

            <button
              className="btn btn-primary"
              onClick={nextPreviewQuestion}
              style={{ width: '100%', marginTop: '16px' }}
            >
              {previewCurrentIdx + 1 < previewQuestions.length ? 'Next Question ➔' : 'Finish Preview'}
            </button>
          </>
        )}
      </div>
    );
  };

  const renderPreviewModal = () => {
    if (!previewGame) return null;

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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px'
      }}>
        <div 
          className="panel panel-large animate-join-focus p-4 sm:p-7" 
          style={{ 
            width: '100%', 
            maxWidth: '650px', 
            maxHeight: '94vh', 
            overflowY: 'auto',
            textAlign: 'left',
            border: '1px solid var(--panel-border-focus)',
            position: 'relative'
          }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px', 
            borderBottom: '1px solid var(--panel-border)',
            paddingBottom: '15px'
          }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Game Preview Mode
              </span>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>{previewGame.title}</h2>
            </div>
            <button 
              onClick={closePreviewGame}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '1.2rem',
                cursor: 'pointer',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
            >
              ✕
            </button>
          </div>

          {previewLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Loading questions...</p>
            </div>
          ) : previewError ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#ff4b60' }}>
              <p>{previewError}</p>
              <button className="btn btn-secondary" onClick={closePreviewGame} style={{ marginTop: '16px' }}>Close</button>
            </div>
          ) : previewQuestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '20px' }}>This Dahoot has no questions yet.</p>
              <button className="btn btn-secondary" onClick={closePreviewGame}>Close</button>
            </div>
          ) : (
            <div>
              {renderPreviewQuestionBody()}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderUserStatusBar = () => {
    if (!currentUser) return null;
    return (
      <div className="flex justify-between items-center bg-slate-50 border-b border-slate-200/80 px-6 py-3 -mx-10 -mt-10 mb-6 text-xs text-slate-500 rounded-t-2xl shadow-inner w-[calc(100%+80px)]">
        <span className="flex items-center gap-1.5">
          👤 Logged in as: <strong className="text-slate-700 font-bold">{currentUser.name ? `${currentUser.name} (${currentUser.email})` : currentUser.email}</strong>
          {userRole === 'ADMIN' && (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border border-amber-200/60 ml-2">
              Admin
            </span>
          )}
        </span>
        <div className="flex items-center gap-3">
          {userRole === 'ADMIN' && (
            <button
              type="button"
              onClick={() => setIsAdminPanelOpen(true)}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-full transition-all cursor-pointer shadow-xs active:scale-95 inline-flex items-center justify-center border-none outline-none"
            >
              🛠 Manage
            </button>
          )}
          <button 
            type="button"
            onClick={onLogout} 
            className="px-3 py-1 bg-white hover:bg-rose-50 border border-slate-200/80 text-rose-500 hover:text-rose-600 font-bold text-xs rounded-full transition-all cursor-pointer shadow-xs active:scale-95 inline-flex items-center justify-center outline-none"
          >
            Log Out
          </button>
        </div>
        {isAdminPanelOpen && renderAdminPanel()}
      </div>
    );
  };

  const preventSubmitOnEnter = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const renderQuestionFormFields = () => {
    return (
      <>
        {/* Question Type Selector */}
        <div className="form-group" style={{ maxWidth: '300px' }}>
          <label className="form-label">Question Type</label>
          <select 
            className="form-input" 
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value)}
            disabled={loading}
            style={{ cursor: 'pointer' }}
          >
            <option value="MULTIPLE_CHOICE">Multiple Choice</option>
            <option value="SORTING">Sorting Order</option>
            <option value="DRAG_DROP">Drag & Drop (Blanks)</option>
            <option value="DROP_DOWN">Drop-Down (Select Blanks)</option>
            <option value="CATEGORIZE">Categorization Groups</option>
          </select>
        </div>

        {/* Common Question Text Prompt */}
        <div className="form-group">
          <label className="form-label">Question Prompt / Title</label>
          <input 
            type="text"
            className="form-input" 
            placeholder="e.g. Test your knowledge of React hooks!"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            disabled={loading}
            onKeyDown={preventSubmitOnEnter}
          />
        </div>

        {/* 1. MULTIPLE CHOICE */}
        {questionType === 'MULTIPLE_CHOICE' && (
          <div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Answer Choices & Correct Option</label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 16 }}>
                Fill out the 4 choices and select the option representing the correct answer.
              </p>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
              gap: 16,
              marginBottom: 28
            }}>
              {options.map((opt, idx) => (
                <div 
                  key={idx} 
                  className={`teacher-option-input-card ${OPTION_CLASSES[idx]} ${correctOptionIndex === idx ? 'active' : ''}`}
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(93, 107, 130, 0.15)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="option-icon" style={{ width: 20, height: 20, border: 'none', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {['A', 'B', 'C', 'D'][idx]}
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        Choice {idx + 1}
                      </span>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer', color: correctOptionIndex === idx ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      <input 
                        type="radio" 
                        name="correct-option" 
                        checked={correctOptionIndex === idx}
                        onChange={() => setCorrectOptionIndex(idx)}
                        disabled={loading}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      Correct
                    </label>
                  </div>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => updateOptionValue(idx, e.target.value)}
                    disabled={loading}
                    style={{ padding: '10px 14px', fontSize: '0.95rem' }}
                    onKeyDown={preventSubmitOnEnter}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. SORTING */}
        {questionType === 'SORTING' && (
          <div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Sorting Elements (Correct Order)</label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 16 }}>
                Enter items in their **correct sorted order** (top to bottom). The game will shuffle them automatically for players.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28, maxWidth: '600px' }}>
              {options.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 30, fontWeight: 700, color: 'var(--accent-light)' }}>#{idx + 1}</span>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder={`Sorted Item ${idx + 1}`}
                    value={opt}
                    onChange={(e) => updateOptionValue(idx, e.target.value)}
                    disabled={loading}
                    onKeyDown={preventSubmitOnEnter}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. DRAG & DROP */}
        {questionType === 'DRAG_DROP' && (
          <div>
            <div className="form-group">
              <label className="form-label">Sentence with Blanks</label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 12 }}>
                Write a sentence using placeholders like <code>[blank0]</code>, <code>[blank1]</code>, etc. for blank spaces.
              </p>
              <textarea 
                className="form-input" 
                placeholder="e.g. In React, we use [blank0] to manage state and [blank1] for side effects."
                rows={2}
                value={dragSentence}
                onChange={(e) => setDragSentence(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Blank Words & Distractors</label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 16 }}>
                Define the correct words matching the blanks, followed by incorrect distractor words.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28, maxWidth: '600px' }}>
              {dragChoices.map((choice, idx) => {
                const isBlankValue = dragSentence.includes(`[blank${idx}]`);
                return (
                  <div key={idx} className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', color: isBlankValue ? 'var(--accent-light)' : 'var(--text-muted)' }}>
                      {isBlankValue ? `Choice ${idx + 1} (Fills [blank${idx}])` : `Choice ${idx + 1} (Distractor Word)`}
                    </label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder={isBlankValue ? `Correct word for [blank${idx}]` : `Distractor word`}
                      value={choice}
                      onChange={(e) => updateDragChoice(idx, e.target.value)}
                      disabled={loading}
                      onKeyDown={preventSubmitOnEnter}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. DROP DOWN */}
        {questionType === 'DROP_DOWN' && (
          <div>
            <div className="form-group">
              <label className="form-label">Sentence with Dropdown slots</label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 12 }}>
                Write a sentence using placeholders like <code>{"{{0}}"}</code>, <code>{"{{1}}"}</code> for the dropdowns.
              </p>
              <textarea 
                className="form-input" 
                placeholder="e.g. PocketBase is written in {{0}} and uses {{1}} database."
                rows={2}
                value={dropdownSentence}
                onChange={(e) => setDropdownSentence(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Dropdown Selections Config</label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 16 }}>
                Define comma-separated options. **The first option in the list is the correct answer**.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28, maxWidth: '600px' }}>
              {dropdownOptions.map((choiceLine, idx) => {
                const isDropdownUsed = dropdownSentence.includes(`{{${idx}}}`);
                if (!isDropdownUsed && idx > 0) return null; // Show at least one config input
                return (
                  <div key={idx} className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', color: isDropdownUsed ? 'var(--accent-light)' : 'var(--text-muted)' }}>
                      {isDropdownUsed ? `Dropdown {{${idx}}} Options (Correct, Option2, Option3...)` : `Unused Dropdown Config`}
                    </label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Go, Rust, JavaScript, Python"
                      value={choiceLine}
                      onChange={(e) => updateDropdownOption(idx, e.target.value)}
                      disabled={loading}
                      onKeyDown={preventSubmitOnEnter}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. CATEGORIZE */}
        {questionType === 'CATEGORIZE' && (
          <div>
            <div className="form-group">
              <label className="form-label">Categories (Separated by Commas)</label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 12 }}>
                Enter up to 4 category names, separated by commas.
              </p>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Languages, Frameworks, Databases"
                value={categorizeCategories}
                onChange={(e) => setCategorizeCategories(e.target.value)}
                disabled={loading}
                onKeyDown={preventSubmitOnEnter}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Items and Category Mapping</label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 12 }}>
                Write one item per line, with the format <code>Item: CategoryName</code>. Max 20 items.
              </p>
              <textarea 
                className="form-input" 
                placeholder="e.g.&#10;React: Frameworks&#10;JavaScript: Languages&#10;MongoDB: Databases"
                rows={6}
                value={categorizeItemsText}
                onChange={(e) => setCategorizeItemsText(e.target.value)}
                disabled={loading}
                style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
              />
            </div>
          </div>
        )}
      </>
    );
  };

  const renderPendingQuestionsList = () => {
    if (pendingQuestions.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '24px',
          background: 'rgba(93, 107, 130, 0.02)',
          border: '1px dashed rgba(93, 107, 130, 0.15)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-muted)',
          marginTop: '20px'
        }}>
          No questions added to this Dahoot yet. Fill out the form above and click "+ Add Question to Dahoot".
        </div>
      );
    }

    return (
      <div style={{ marginTop: '24px' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Added Questions ({pendingQuestions.length})
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pendingQuestions.map((q, idx) => (
            <div 
              key={idx} 
              className="pending-question-card animate-fade-in"
              style={{
                background: '#ffffff',
                border: '1px solid rgba(93, 107, 130, 0.12)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontWeight: 700,
                    color: 'var(--accent-light)',
                    fontSize: '0.9rem'
                  }}>
                    #{idx + 1}
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: 'rgba(93, 107, 130, 0.08)',
                    color: 'var(--text-secondary)',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    {q.type.replace('_', ' ')}
                  </span>
                </div>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  {q.text}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {q.type === 'MULTIPLE_CHOICE' && `Options: ${q.options.join(', ')}`}
                  {q.type === 'SORTING' && `Items: ${q.options.join(' → ')}`}
                  {q.type === 'DRAG_DROP' && `Sentence: ${q.options.sentence}`}
                  {q.type === 'DROP_DOWN' && `Sentence: ${q.options.sentence}`}
                  {q.type === 'CATEGORIZE' && `Categories: ${q.options.categories.join(', ')}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removePendingQuestion(idx)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ff4b60',
                  cursor: 'pointer',
                  padding: '8px',
                  fontSize: '1.1rem',
                  transition: 'transform 0.1s'
                }}
                title="Remove question"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getMissingFieldsForGenerate = () => {
    const missing = [];
    if (isEditingGame) {
      if (!gameCefrLevel) missing.push('CEFR Language Level');
      if (!gameLanguage) missing.push('Language');
      if (!gameSubject) missing.push('Subject');
    } else if (isImporting) {
      if (!selectedGame?.cefr_level) missing.push('CEFR Language Level');
      if (!selectedGame?.language) missing.push('Language');
      if (!selectedGame?.subject) missing.push('Subject');
    } else {
      missing.push('CEFR Language Level', 'Language', 'Subject');
    }
    return missing;
  };

  const isGenerateDisabled = getMissingFieldsForGenerate().length > 0;

  const handleGenerateQuestions = async () => {
    setGenLoading(true);
    setGenError('');

    const language = isEditingGame ? gameLanguage : selectedGame?.language;
    const cefrLevel = isEditingGame ? gameCefrLevel : selectedGame?.cefr_level;
    const subject = isEditingGame ? gameSubject : selectedGame?.subject;

    const systemPrompt = `You are an expert curriculum designer and language/subject assessment expert.
Generate educational questions in Markdown format exactly conforming to the specifications below.

Target Student Profile:
- Language of questions/answers: ${language || 'English'}
- CEFR Language Level: ${cefrLevel || 'A2'}
- Subject: ${subject || 'General'}

Generate the following question counts (adjust based on user source content if provided, but default to these counts if not specified):
- Multiple Choice (MULTIPLE_CHOICE): ${genMcCount} questions
- Sorting (SORTING): ${genSortingCount} questions
- Categorization (CATEGORIZE): ${genCategorizeCount} questions
- Drag & Drop (DRAG_DROP): ${genDragDropCount} questions
- Drop Down (DROP_DOWN): ${genDropDownCount} questions

Each question must be formatted EXACTLY as follows. Do not add any extra text or conversational chatter between the markdown question blocks.

--- FORMAT SPECIFICATIONS ---

1. MULTIPLE_CHOICE
Format:
# MULTIPLE_CHOICE
<Question text here>
- <Option 1>
- *<Correct Option> (prefixed with an asterisk * after the hyphen and space)
- <Option 3>
- <Option 4>

Example:
# MULTIPLE_CHOICE
What is the capital of France?
- Berlin
- *Paris
- London
- Rome

2. SORTING
Format:
# SORTING
<Instruction text here>
1. <First item in correct order>
2. <Second item in correct order>
3. <Third item in correct order>
4. <Fourth item in correct order>

Example:
# SORTING
Sort these numbers from lowest to highest.
1. Five
2. Ten
3. Fifteen
4. Twenty

3. DRAG_DROP
Format:
# DRAG_DROP
<Instruction text here>
sentence: <Sentence text with correct answers inside bracket placeholders [answer1] and [answer2]>
- *<Correct Answer 1> (prefixed with *)
- *<Correct Answer 2> (prefixed with *)
- <Distractor 1> (no asterisk)
- <Distractor 2> (no asterisk)

Example:
# DRAG_DROP
Fill in the blanks by dragging the correct words.
sentence: The quick brown [fox] jumps over the lazy [dog].
- *fox
- *dog
- cat
- horse

4. DROP_DOWN
Format:
# DROP_DOWN
<Instruction text here>
sentence: <Sentence text with correct answers inside bracket placeholders [dropdown1] and [dropdown2]>
dropdown
- *<Correct Option for dropdown1> (prefixed with *)
- <Option 2>
- <Option 3>
- <Option 4>
dropdown
- *<Correct Option for dropdown2> (prefixed with *)
- <Option 2>
- <Option 3>
- <Option 4>

Example:
# DROP_DOWN
Choose the correct verb conjugation.
sentence: Yesterday I [dropdown1] to school and [dropdown2] my friend.
dropdown
- *went
- go
- gone
- goes
dropdown
- *saw
- see
- seen
- sees

5. CATEGORIZE
Format:
# CATEGORIZE
<Instruction text here>
categories: <Category 1>, <Category 2>
- <Item 1>: <Category 1>
- <Item 2>: <Category 2>
- <Item 3>: <Category 1>
- <Item 4>: <Category 2>

Example:
# CATEGORIZE
Group the items into the correct categories.
categories: Fruits, Vegetables
- Apple: Fruits
- Broccoli: Vegetables
- Banana: Fruits
- Carrot: Vegetables

-----------------------------

ADDITIONAL REQUIREMENT:
At the very end of your response, output a JSON block containing an engaging 1-2 sentence description for this game based on the subject and questions generated, like this:
\`\`\`json
{
  "description": "Engaging description here"
}
\`\`\`
Ensure that the JSON block is the absolute last thing in your response. Do not output any other text after it.`;

    const userPromptContent = genPrompt.trim() 
      ? `Source text/Instructions provided by the teacher:\n"""\n${genPrompt}\n"""\n\nGenerate the questions based on the source text/instructions above. Ensure they are tailored for CEFR level ${cefrLevel}, Language ${language}, and Subject ${subject}.`
      : `Generate high-quality educational questions for CEFR level ${cefrLevel}, Language ${language}, and Subject ${subject}. Use age-appropriate and level-appropriate vocabulary.`;

    try {
      const data = await pb.send("/api/generate-questions", {
        method: "POST",
        body: {
          systemPrompt,
          userPromptContent
        }
      });

      const choice = data.choices?.[0]?.message?.content;
      if (!choice) {
        throw new Error('No content returned from OpenRouter API.');
      }

      let markdownText = choice;
      let aiDescription = '';

      const jsonRegex = /```json\s*(\{[\s\S]*?\})\s*```/i;
      const match = choice.match(jsonRegex);
      if (match) {
        try {
          const jsonObj = JSON.parse(match[1]);
          aiDescription = jsonObj?.description || '';
          markdownText = choice.replace(match[0], '').trim();
        } catch (e) {
          console.error("Failed to parse AI description JSON:", e);
        }
      } else {
        const endJsonIndex = choice.lastIndexOf('{');
        if (endJsonIndex !== -1) {
          const possibleJson = choice.substring(endJsonIndex);
          try {
            const jsonObj = JSON.parse(possibleJson);
            aiDescription = jsonObj?.description || '';
            markdownText = choice.substring(0, endJsonIndex).trim();
          } catch (e) {
            // Ignore
          }
        }
      }

      // Populate description if blank
      if (isEditingGame && !gameDescription?.trim() && aiDescription) {
        setGameDescription(aiDescription);
      } else if (!isEditingGame && selectedGame && !selectedGame.description?.trim() && aiDescription) {
        try {
          await pb.collection('dahoot_games').update(selectedGame.id, {
            description: aiDescription
          });
          setSelectedGame(prev => ({ ...prev, description: aiDescription }));
        } catch (pbErr) {
          console.error("Failed to update blank description on existing game:", pbErr);
        }
      }

      setImportText(prev => prev ? prev + '\n\n' + markdownText : markdownText);
      setIsGenModalOpen(false);
      setGenPrompt('');
    } catch (err) {
      console.error("Error generating questions:", err);
      setGenError(err.message || 'An error occurred during generation.');
    } finally {
      setGenLoading(false);
    }
  };

  const renderGenerateModal = () => {
    if (!isGenModalOpen) return null;

    const missingFields = getMissingFieldsForGenerate();
    const language = isEditingGame ? gameLanguage : selectedGame?.language;
    const cefrLevel = isEditingGame ? gameCefrLevel : selectedGame?.cefr_level;
    const subject = isEditingGame ? gameSubject : selectedGame?.subject;

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
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px'
      }}>
        <div 
          className="panel panel-large animate-join-focus p-4 sm:p-7" 
          style={{ 
            width: '100%', 
            maxWidth: '650px', 
            maxHeight: '94vh', 
            overflowY: 'auto',
            textAlign: 'left',
            border: '1px solid var(--panel-border-focus)',
            position: 'relative'
          }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px', 
            borderBottom: '1px solid var(--panel-border)',
            paddingBottom: '15px'
          }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                AI Quiz Generator
              </span>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>Autogenerate Questions</h2>
            </div>
            <button 
              type="button"
              onClick={() => {
                setIsGenModalOpen(false);
                setGenError('');
              }}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '1.2rem',
                cursor: 'pointer',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
            >
              ✕
            </button>
          </div>

          {isGenerateDisabled && (
            <div style={{ 
              background: 'rgba(245, 158, 11, 0.1)', 
              border: '1px solid rgba(245, 158, 11, 0.3)', 
              color: '#d97706', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              marginBottom: 20
            }}>
              ⚠️ Required fields missing: {missingFields.join(', ')}
            </div>
          )}

          {genError && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.3)', 
              color: '#ff4b60', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              marginBottom: 20
            }}>
              ⚠️ {genError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{
              background: 'rgba(93, 107, 130, 0.05)',
              border: '1px solid rgba(93, 107, 130, 0.1)',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              fontSize: '0.9rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', marginRight: '6px' }}>Language:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{language}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', marginRight: '6px' }}>CEFR Level:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{cefrLevel}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', marginRight: '6px' }}>Subject:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{subject}</strong>
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  Custom Prompt or Source Text (Optional)
                </label>
                <span style={{ fontSize: '0.8rem', color: genPrompt.length > 100000 ? '#ff4b60' : 'var(--text-secondary)' }}>
                  {genPrompt.length.toLocaleString()} / 100,000 chars
                </span>
              </div>
              <textarea
                className="form-input"
                placeholder="e.g. Paste a reading passage, specific grammar exercises, sample quiz, or custom prompts like 'make it holiday themed'..."
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                disabled={genLoading}
                rows={6}
                maxLength={100000}
                style={{
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  lineHeight: '1.5'
                }}
              />
            </div>

            <div>
              <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>
                Question Types & Counts
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Multiple Choice</span>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={genMcCount}
                    onChange={(e) => setGenMcCount(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={genLoading}
                    className="form-input"
                    style={{ textAlign: 'center' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Sorting</span>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={genSortingCount}
                    onChange={(e) => setGenSortingCount(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={genLoading}
                    className="form-input"
                    style={{ textAlign: 'center' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Categorization</span>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={genCategorizeCount}
                    onChange={(e) => setGenCategorizeCount(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={genLoading}
                    className="form-input"
                    style={{ textAlign: 'center' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Drag & Drop</span>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={genDragDropCount}
                    onChange={(e) => setGenDragDropCount(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={genLoading}
                    className="form-input"
                    style={{ textAlign: 'center' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Drop Down</span>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={genDropDownCount}
                    onChange={(e) => setGenDropDownCount(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={genLoading}
                    className="form-input"
                    style={{ textAlign: 'center' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  setIsGenModalOpen(false);
                  setGenError('');
                }} 
                disabled={genLoading} 
                style={{ width: 'auto', minWidth: 100 }}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="btn btn-primary" 
                onClick={handleGenerateQuestions}
                disabled={genLoading || isGenerateDisabled} 
                style={{ 
                  width: 'auto', 
                  minWidth: 150,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {genLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-200 border-l-rose-300 rounded-full animate-spin inline-block mr-2"></span>
                    Generating...
                  </>
                ) : (
                  <>
                    ✨ Generate Questions
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBulkImportBuilder = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ marginBottom: 4 }}>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
            Paste your Markdown-formatted questions below to import them in bulk when the Dahoot is created.
          </p>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <a 
              href="/import-instructions.html" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: 'var(--accent-light)', textDecoration: 'underline' }}
            >
              📖 View formatting guide & AI prompt template
            </a>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <a 
              href="https://gemini.google.com/gem/18ZESHdzKuk0XOKvr8MkQ-WxJn-u8B1RP?usp=sharing" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: 'var(--accent-light)', textDecoration: 'underline', fontWeight: '600' }}
            >
              💎 Use Dahoot Quiz Generator Gem
            </a>
          </p>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="form-label" style={{ margin: 0 }}>Markdown Text</label>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsGenModalOpen(true)}
              disabled={isGenerateDisabled}
              style={{
                padding: '6px 12px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: isGenerateDisabled ? 'not-allowed' : 'pointer'
              }}
              title={isGenerateDisabled ? `Required fields missing: ${getMissingFieldsForGenerate().join(', ')}` : "Autogenerate questions using AI"}
            >
              ✨ Autogenerate Questions
            </button>
          </div>
          <textarea 
            className="form-input" 
            placeholder={`# MULTIPLE_CHOICE
What is the capital of France?
- Berlin
- *Paris
- London
- Rome

# SORTING
Sort these numbers from lowest to highest.
1. Five
2. Ten
3. Fifteen
4. Twenty`}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            disabled={loading}
            rows={12}
            style={{ fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.5' }}
          />
        </div>
      </div>
    );
  };

  // Extract unique languages and creators from the games list for filter pills
  const uniqueLanguages = useMemo(() => {
    const langs = new Set();
    gamesList.forEach(g => {
      if (g.language) langs.add(g.language);
    });
    return Array.from(langs);
  }, [gamesList]);

  const uniqueCreators = useMemo(() => {
    const creators = new Set();
    gamesList.forEach(g => {
      if (g.creator) creators.add(g.creator);
    });
    return Array.from(creators);
  }, [gamesList]);

  // Filter handlers
  const toggleSubjectFilter = (sub) => {
    setFilterSubject(prev => prev.includes(sub) ? prev.filter(x => x !== sub) : [...prev, sub]);
  };
  const toggleCefrFilter = (level) => {
    setFilterCefr(prev => prev.includes(level) ? prev.filter(x => x !== level) : [...prev, level]);
  };
  const toggleLanguageFilter = (lang) => {
    setFilterLanguage(prev => prev.includes(lang) ? prev.filter(x => x !== lang) : [...prev, lang]);
  };
  const toggleCreatorFilter = (creator) => {
    setFilterCreator(prev => prev.includes(creator) ? prev.filter(x => x !== creator) : [...prev, creator]);
  };

  const clearAllFilters = () => {
    setFilterSubject([]);
    setFilterCefr([]);
    setFilterLanguage([]);
    setFilterCreator([]);
  };

  const hasActiveFilters = filterSubject.length > 0 || filterCefr.length > 0 || filterLanguage.length > 0 || filterCreator.length > 0;

  // Count of games created by the current teacher
  const myGamesCount = useMemo(() => {
    return gamesList.filter(game => {
      const creatorName = game.creator ? game.creator.toLowerCase().trim() : '';
      const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
      const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
      const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';
      
      return (myName && creatorName === myName) || 
             (myEmail && creatorName === myEmail) || 
             (myUsername && creatorName === myUsername) || 
             (currentUser?.id && creatorName === currentUser.id);
    }).length;
  }, [gamesList, currentUser]);

  // Filtered games array
  const filteredGamesList = useMemo(() => {
    return gamesList.filter(game => {
      // 1. Tab filtering (All vs My Games)
      if (libraryTab === 'my') {
        const creatorName = game.creator ? game.creator.toLowerCase().trim() : '';
        const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
        const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
        const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';
        
        const isMyGame = (myName && creatorName === myName) || 
                         (myEmail && creatorName === myEmail) || 
                         (myUsername && creatorName === myUsername) || 
                         (currentUser?.id && creatorName === currentUser.id);
        
        if (!isMyGame) return false;
      }

      // 2. Category/Pill filtering
      if (filterSubject.length > 0 && !filterSubject.includes(game.subject)) return false;
      if (filterCefr.length > 0 && !filterCefr.includes(game.cefr_level)) return false;
      if (filterLanguage.length > 0 && !filterLanguage.includes(game.language)) return false;
      if (filterCreator.length > 0 && !filterCreator.includes(game.creator)) return false;
      return true;
    });
  }, [gamesList, libraryTab, currentUser, filterSubject, filterCefr, filterLanguage, filterCreator]);
  
  // 1. GAME EDITING MODE
  if (!selectedGame && isEditingGame) {
    return (
      <div className="app-container">
        <div className="panel panel-large animate-join-focus" style={{ textAlign: 'left' }}>
          {renderUserStatusBar()}
          <div style={{ marginBottom: 24 }}>
            <h2>{selectedGameForEdit ? 'Edit Dahoot Details' : 'Create New Dahoot'}</h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Specify the details and metadata tags for your Dahoot.
            </p>
          </div>

          {error && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.3)', 
              color: '#ff4b60', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              marginBottom: 20
            }}>
              {error}
            </div>
          )}

          <form onSubmit={saveGame}>
            <div className="form-group">
              <label className="form-label">Game Title *</label>
              <input 
                type="text"
                className="form-input" 
                placeholder="e.g. World History Trivia"
                value={gameTitle}
                onChange={(e) => setGameTitle(e.target.value)}
                disabled={loading}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea 
                className="form-input" 
                placeholder="e.g. 10 questions covering major historical events of the 20th century."
                value={gameDescription}
                onChange={(e) => setGameDescription(e.target.value)}
                disabled={loading}
                rows={3}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Creator / Author *</label>
                <input 
                  type="text"
                  className="form-input" 
                  placeholder="e.g. Dahoot Team"
                  value={gameCreator}
                  onChange={(e) => setGameCreator(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Language *</label>
                <select
                  className="form-input"
                  value={gameLanguage}
                  onChange={(e) => setGameLanguage(e.target.value)}
                  disabled={loading}
                  style={{ cursor: 'pointer' }}
                  required
                >
                  <option value="">Select Language...</option>
                  {availableLanguages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">CEFR Language Level *</label>
                  <button
                    type="button"
                    onClick={() => setShowCefrTips(!showCefrTips)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '2px'
                    }}
                  >
                    💡 Quick Guide
                  </button>
                </div>
                <select
                  className="form-input"
                  value={gameCefrLevel}
                  onChange={(e) => setGameCefrLevel(e.target.value)}
                  disabled={loading}
                  style={{ cursor: 'pointer' }}
                  required
                >
                  <option value="">Select CEFR Level...</option>
                  {availableCefrLevels.map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
                
                {showCefrTips && (
                  <div className="animate-fade-in text-[11px] text-slate-500 bg-slate-50 border border-slate-200/50 rounded-xl p-3 mt-2 space-y-1.5 leading-normal">
                    <div><strong>A1 (Beginner)</strong> / <strong>A2 (Elementary)</strong>: Simple everyday sentences, basic questions.</div>
                    <div><strong>B1 (Intermediate)</strong> / <strong>B2 (Upper-Intermediate)</strong>: Spontaneous conversation, clear texts on familiar topics.</div>
                    <div><strong>C1 (Advanced)</strong> / <strong>C2 (Mastery)</strong>: Complex subjects, professional or academic level fluency.</div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Subject *</label>
                <select
                  className="form-input"
                  value={gameSubject}
                  onChange={(e) => setGameSubject(e.target.value)}
                  disabled={loading}
                  style={{ cursor: 'pointer' }}
                  required
                >
                  <option value="">Select Subject...</option>
                  {availableSubjects.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            </div>

            {!selectedGameForEdit && (
              <div style={{ 
                marginTop: '32px', 
                borderTop: '1px dashed rgba(93, 107, 130, 0.2)', 
                paddingTop: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Add Questions (Optional)
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                  Create questions now or skip and add them later. Use the tabs below to choose between adding questions individually or bulk importing via Markdown.
                </p>

                {/* Tabs selector */}
                <div style={{
                  display: 'flex',
                  background: 'rgba(93, 107, 130, 0.06)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px',
                  marginBottom: '24px',
                  border: '1px solid rgba(93, 107, 130, 0.1)'
                }}>
                  <button
                    type="button"
                    onClick={() => setCreationQuestionsTab('individual')}
                    style={{
                      flex: 1,
                      background: creationQuestionsTab === 'individual' ? 'var(--accent-gradient)' : 'transparent',
                      color: creationQuestionsTab === 'individual' ? '#5D6B82' : 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>✍️ Individual Questions</span>
                    {pendingQuestions.length > 0 && (
                      <span style={{
                        background: 'var(--accent-light)',
                        color: 'white',
                        borderRadius: '12px',
                        padding: '2px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        {pendingQuestions.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreationQuestionsTab('bulk')}
                    style={{
                      flex: 1,
                      background: creationQuestionsTab === 'bulk' ? 'var(--accent-gradient)' : 'transparent',
                      color: creationQuestionsTab === 'bulk' ? '#5D6B82' : 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>📥 Bulk Import (Markdown)</span>
                  </button>
                </div>

                {creationQuestionsTab === 'individual' ? (
                  <div>
                    {/* Render the Individual Question Fields */}
                    <div style={{
                      background: 'rgba(93, 107, 130, 0.02)',
                      border: '1px solid rgba(93, 107, 130, 0.08)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '20px',
                      marginBottom: '20px'
                    }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Create Question
                      </h4>
                      {renderQuestionFormFields()}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={addPendingQuestion}
                        style={{
                          marginTop: '16px',
                          backgroundColor: 'rgba(93, 107, 130, 0.05)',
                          color: 'var(--text-secondary)',
                          border: '1px solid rgba(93, 107, 130, 0.12)',
                          width: 'auto',
                          minWidth: '200px'
                        }}
                      >
                        ➕ Add Question to Dahoot
                      </button>
                    </div>
                    
                    {/* Render Pending Questions List */}
                    {renderPendingQuestionsList()}
                  </div>
                ) : (
                  <div>
                    {/* Render Bulk Import Textarea */}
                    {renderBulkImportBuilder()}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
              <button type="button" className="btn btn-secondary" onClick={cancelEditingGame} disabled={loading} style={{ width: 'auto', minWidth: 120 }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: 'auto', minWidth: 150 }}>
                {loading ? 'Saving...' : 'Save Game'}
              </button>
            </div>
          </form>
        </div>
        {renderGenerateModal()}
      </div>
    );
  }

  // 2. GAMES LIST VIEW (Default Screen)
  if (!selectedGame) {
    return (
      <div className="app-container">
        <div className="panel panel-large animate-join-focus">
          {renderUserStatusBar()}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            <div style={{ textAlign: 'left' }}>
              <h2 style={{ marginBottom: 4 }}>Dahoots</h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                Manage groups of quiz questions that can be played, copied, and edited.
              </p>
            </div>
            <button className="btn btn-primary" onClick={startCreatingGame} style={{ width: 'auto', minWidth: 180 }}>
              + Create Dahoot
            </button>
          </div>

          {/* Library Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '2px solid rgba(93, 107, 130, 0.1)',
            marginBottom: '24px',
            gap: '24px'
          }}>
            <button
              onClick={() => setLibraryTab('all')}
              style={{
                padding: '12px 8px',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: libraryTab === 'all' ? 'var(--accent-light)' : 'var(--text-secondary)',
                borderBottom: libraryTab === 'all' ? '3px solid var(--accent-light)' : '3px solid transparent',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '-2px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🌐 All Games ({gamesList.length})
            </button>
            <button
              onClick={() => setLibraryTab('my')}
              style={{
                padding: '12px 8px',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: libraryTab === 'my' ? 'var(--accent-light)' : 'var(--text-secondary)',
                borderBottom: libraryTab === 'my' ? '3px solid var(--accent-light)' : '3px solid transparent',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '-2px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              👤 My Games ({myGamesCount})
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
              textAlign: 'left'
            }}>
              {error}
            </div>
          )}

          {/* Filtering Panel */}
          <div className="filter-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                🔍 Filter Dahoots {hasActiveFilters && <span style={{ color: 'var(--accent-light)', fontSize: '0.85rem' }}>({filteredGamesList.length} matches)</span>}
              </span>
              {hasActiveFilters && (
                <button 
                  onClick={clearAllFilters}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ff4b60',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {/* Subject */}
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                  Subject
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {availableSubjects.map(sub => {
                    const active = filterSubject.includes(sub);
                    return (
                      <button
                        key={sub}
                        onClick={() => toggleSubjectFilter(sub)}
                        className={`filter-btn ${active ? 'active-subject' : ''}`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CEFR Level */}
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                  CEFR Level
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {availableCefrLevels.map(level => {
                    const active = filterCefr.includes(level);
                    return (
                      <button
                        key={level}
                        onClick={() => toggleCefrFilter(level)}
                        className={`filter-btn ${active ? 'active-cefr' : ''}`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language */}
              {uniqueLanguages.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                    Language
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {uniqueLanguages.map(lang => {
                      const active = filterLanguage.includes(lang);
                      return (
                        <button
                          key={lang}
                          onClick={() => toggleLanguageFilter(lang)}
                          className={`filter-btn ${active ? 'active-language' : ''}`}
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Creator */}
              {uniqueCreators.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                    Creator
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {uniqueCreators.map(creator => {
                      const active = filterCreator.includes(creator);
                      return (
                        <button
                          key={creator}
                          onClick={() => toggleCreatorFilter(creator)}
                          className={`filter-btn ${active ? 'active-creator' : ''}`}
                        >
                          {creator}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: 20,
            marginBottom: 32,
            textAlign: 'left'
          }}>
            {filteredGamesList.length === 0 ? (
              <div style={{ 
                gridColumn: '1 / -1',
                textAlign: 'center', 
                padding: '48px 16px', 
                color: 'var(--text-muted)',
                border: '1px dashed var(--panel-border)',
                borderRadius: 'var(--radius-md)'
              }}>
                No Dahoots match the selected filters. Clear filters or create a new Dahoot.
              </div>
            ) : (
              filteredGamesList.map((game) => (
                <div 
                  key={game.id} 
                  className="game-card animate-pop-in"
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                      <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 800 }}>
                        {game.title}
                      </h3>
                      <span className="game-tag">
                        {game.questionCount ?? 0} Qs
                      </span>
                    </div>

                    {/* Metadata tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0 12px 0' }}>
                      {game.subject && (
                        <span className="game-tag">
                          📚 {game.subject}
                        </span>
                      )}
                      {game.cefr_level && (
                        <span className="game-tag">
                          🎓 {game.cefr_level}
                        </span>
                      )}
                      {game.language && (
                        <span className="game-tag">
                          🗣️ {game.language}
                        </span>
                      )}
                      {game.creator && (
                        <span className="game-tag">
                          👤 {game.creator}
                        </span>
                      )}
                    </div>

                    <p style={{ 
                      color: 'var(--text-secondary)', 
                      fontSize: '0.9rem', 
                      margin: 0, 
                      lineHeight: '1.4',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {game.description || <em>No description provided.</em>}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 mt-3.5">
                    {startHosting && (
                      <button 
                        className="btn-card-action btn-card-action-primary py-2.5 text-sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          startHosting(game.id);
                        }}
                      >
                        🚀 Host Game
                      </button>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        className="btn-card-action btn-card-action-secondary py-2 text-xs" 
                        onClick={() => setSelectedGame(game)}
                      >
                        ✏️ Questions
                      </button>
                      <button 
                        className="btn-card-action btn-card-action-secondary py-2 text-xs" 
                        onClick={(e) => {
                          e.stopPropagation();
                          startPreviewGame(game);
                        }}
                      >
                        👁️ Preview
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-[1fr_1fr_40px] gap-2">
                      <button 
                        className="btn-card-action btn-card-action-secondary py-1.5 px-1 text-[11px] font-semibold" 
                        onClick={(e) => startEditingGame(game, e)}
                      >
                        Edit Details
                      </button>
                      <button 
                        className="btn-card-action btn-card-action-secondary py-1.5 px-1 text-[11px] font-semibold" 
                        onClick={(e) => handleCopyGame(game, e)}
                      >
                        Copy Game
                      </button>
                      <button 
                        className="btn-card-action btn-card-action-danger py-1.5 text-xs" 
                        onClick={(e) => handleDeleteGame(game.id, e)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setView('selection')}
              style={{ width: 'auto', minWidth: 200 }}
            >
              ← Back to Main Menu
            </button>
          </div>
        </div>
        {renderPreviewModal()}
      </div>
    );
  }

  // 3. QUESTIONS BULK IMPORT PANEL (Under Selected Game)
  if (isImporting) {
    return (
      <div className="app-container">
        <div className="panel panel-large animate-join-focus" style={{ textAlign: 'left' }}>
          {renderUserStatusBar()}
          <div style={{ marginBottom: 24 }}>
            <h2>Import Questions in Bulk</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
              Paste your Markdown-formatted questions below to load them into: <strong>{selectedGame.title}</strong>
            </p>
            <p style={{ margin: 0, fontSize: '0.9rem', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <a 
                href="/import-instructions.html" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ color: 'var(--accent-light)', textDecoration: 'underline' }}
              >
                📖 View formatting guide & AI prompt template
              </a>
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <a 
                href="https://gemini.google.com/gem/18ZESHdzKuk0XOKvr8MkQ-WxJn-u8B1RP?usp=sharing" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ color: 'var(--accent-light)', textDecoration: 'underline', fontWeight: '600' }}
              >
                💎 Use Dahoot Quiz Generator Gem
              </a>
            </p>
          </div>

          {error && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.3)', 
              color: '#ff4b60', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              marginBottom: 20
            }}>
              {error}
            </div>
          )}

          <form onSubmit={saveImportedQuestions}>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>Markdown Text</label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsGenModalOpen(true)}
                  disabled={isGenerateDisabled}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: isGenerateDisabled ? 'not-allowed' : 'pointer'
                  }}
                  title={isGenerateDisabled ? `Required fields missing: ${getMissingFieldsForGenerate().join(', ')}` : "Autogenerate questions using AI"}
                >
                  ✨ Autogenerate Questions
                </button>
              </div>
              <textarea 
                className="form-input" 
                placeholder={`# MULTIPLE_CHOICE
What is the capital of France?
- Berlin
- *Paris
- London
- Rome

# SORTING
Sort these numbers from lowest to highest.
1. Five
2. Ten
3. Fifteen
4. Twenty`}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                disabled={loading}
                rows={15}
                style={{ fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.5' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
              <button type="button" className="btn btn-secondary" onClick={cancelImporting} disabled={loading} style={{ width: 'auto', minWidth: 120 }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading || !importText.trim()} style={{ width: 'auto', minWidth: 150 }}>
                {loading ? 'Importing...' : 'Save & Import'}
              </button>
            </div>
          </form>
        </div>
        {renderGenerateModal()}
      </div>
    );
  }

  // 4. QUESTIONS EDITING / CREATING SCREEN (Under Selected Game)
  if (isEditing) {
    return (
      <div className="app-container">
        <div className="panel panel-large animate-join-focus" style={{ textAlign: 'left' }}>
          {renderUserStatusBar()}
          <div style={{ marginBottom: 24 }}>
            <h2>{selectedQuestion ? 'Edit Question' : 'Add Question'}</h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Create or edit a question for the Dahoot: <strong>{selectedGame.title}</strong>
            </p>
          </div>

          {error && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.3)', 
              color: '#ff4b60', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              marginBottom: 20
            }}>
              {error}
            </div>
          )}

          <form onSubmit={saveQuestion}>
            {renderQuestionFormFields()}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn btn-secondary" onClick={cancelEditing} disabled={loading} style={{ width: 'auto', minWidth: 120 }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: 'auto', minWidth: 150 }}>
                {loading ? 'Saving...' : 'Save Question'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 5. QUESTIONS LIST VIEW (For Selected Game)
  return (
    <div className="app-container">
      <div className="panel panel-large animate-join-focus">
        {renderUserStatusBar()}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <button 
                className="btn-link" 
                onClick={() => setSelectedGame(null)}
                style={{ fontSize: '1.2rem', padding: '0 4px', color: 'var(--accent-light)', cursor: 'pointer', background: 'none', border: 'none' }}
              >
                ←
              </button>
              <h2 style={{ margin: 0 }}>{selectedGame.title}</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', margin: 0, paddingLeft: 24 }}>
              Manage questions for this Dahoot
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => setSelectedGame(null)} style={{ width: 'auto', minWidth: 100 }}>
              Back to Games
            </button>
            <button className="btn btn-secondary" onClick={startImporting} style={{ width: 'auto', minWidth: 130 }}>
              📥 Import in Bulk
            </button>
            <button className="btn btn-primary" onClick={startCreating} style={{ width: 'auto', minWidth: 130 }}>
              + Add Question
            </button>
          </div>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.3)', 
            color: '#ff4b60', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            marginBottom: 20,
            textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        <div className="teacher-questions-list" style={{ 
          maxHeight: '520px', 
          overflowY: 'auto', 
          paddingRight: '8px',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          marginBottom: 32
        }}>
          {questionsList.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '48px 16px', 
              color: 'var(--text-muted)',
              border: '1px dashed var(--panel-border)',
              borderRadius: 'var(--radius-md)'
            }}>
              No questions in this Dahoot yet. Click "+ Add Question" or "📥 Import in Bulk" to get started.
            </div>
          ) : (
            questionsList.map((question, qIdx) => {
              const type = question.type || 'MULTIPLE_CHOICE';
              return (
                <div 
                  key={question.id} 
                  className="bg-white border border-slate-200/60 rounded-2xl p-5 flex justify-between items-center gap-5 flex-wrap transition-all hover:shadow-md shadow-sm mb-4"
                >
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span className="game-tag text-rose-500 border-rose-100 bg-rose-50/50 font-bold px-2 py-0.5">
                        Q{qIdx + 1}
                      </span>
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                        {type.replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
                      {question.text}
                    </div>
                    
                    {/* Summary details based on type */}
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {(type === 'MULTIPLE_CHOICE' || type === 'SORTING') && Array.isArray(question.options) && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                          {question.options.map((opt, oIdx) => {
                            const isCorrect = type === 'MULTIPLE_CHOICE' && question.correct_option_index === oIdx;
                            return (
                              <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: isCorrect ? 600 : 400, color: isCorrect ? '#10b981' : 'var(--text-secondary)' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '0.8rem', color: isCorrect ? '#10b981' : 'var(--text-muted)' }}>
                                  {['A', 'B', 'C', 'D'][oIdx]}.
                                </span>
                                <span>{opt}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {type === 'DRAG_DROP' && question.options && (
                        <div>
                          <p style={{ margin: '0 0 6px 0', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                            {question.options.sentence}
                          </p>
                          <p style={{ margin: 0 }}>
                            Blanks: <strong style={{ color: 'var(--accent-light)' }}>{question.options.correct?.join(', ')}</strong>
                          </p>
                        </div>
                      )}

                      {type === 'DROP_DOWN' && question.options && (
                        <div>
                          <p style={{ margin: '0 0 6px 0', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                            {question.options.sentence}
                          </p>
                          <p style={{ margin: 0 }}>
                            Dropdown Correct Answers: <strong style={{ color: 'var(--accent-light)' }}>{question.options.dropdowns?.map(d => d.correct).join(', ')}</strong>
                          </p>
                        </div>
                      )}

                      {type === 'CATEGORIZE' && question.options && (
                        <div>
                          <p style={{ margin: '0 0 6px 0' }}>
                            Categories: <strong style={{ color: 'var(--accent-light)' }}>{question.options.categories?.join(', ')}</strong>
                          </p>
                          <p style={{ margin: 0 }}>
                            Items: {question.options.items?.length || 0} items mapped.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignSelf: 'flex-start' }}>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => startEditing(question)}
                      style={{ width: 'auto', padding: '8px 12px', minWidth: 60 }}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => handleDeleteQuestion(question.id)}
                      style={{ 
                        width: 'auto', 
                        padding: '8px 12px', 
                        minWidth: 60,
                        borderColor: 'rgba(239, 68, 68, 0.2)',
                        color: '#ff4b60'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      {ConfirmDialog}
    </div>
  );
}
