import React, { useState, useMemo, useEffect } from 'react';
import { OPTION_CLASSES, OPTION_SHAPES } from '../constants';
import { pb } from '../pb';

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
  currentUser = null,
  onLogout = null,
  startHosting = null
}) {
  // Client-side filtering state
  const [filterSubject, setFilterSubject] = useState([]);
  const [filterCefr, setFilterCefr] = useState([]);
  const [filterLanguage, setFilterLanguage] = useState([]);
  const [filterCreator, setFilterCreator] = useState([]);

  // Preview Game state
  const [previewGame, setPreviewGame] = useState(null);
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewCurrentIdx, setPreviewCurrentIdx] = useState(0);
  
  // Interactive preview answering states
  const [previewAnswered, setPreviewAnswered] = useState(false);
  const [previewIsCorrect, setPreviewIsCorrect] = useState(false);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(null);
  const [sortingItems, setSortingItems] = useState([]);
  const [placedWords, setPlacedWords] = useState([]);
  const [activeBlankIdx, setActiveBlankIdx] = useState(0);
  const [dropdownSelections, setDropdownSelections] = useState([]);
  const [categorizeIdx, setCategorizeIdx] = useState(0);
  const [categoryAssignments, setCategoryAssignments] = useState({});

  // Admin Panel states
  const [userRole, setUserRole] = useState('TEACHER');
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminPanelTab, setAdminPanelTab] = useState('invite'); // 'invite' | 'teachers'
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

  // Fetch current user's role from dahoot_user_info
  useEffect(() => {
    if (currentUser && currentUser.dahoot_info) {
      pb.collection('dahoot_user_info').getOne(currentUser.dahoot_info)
        .then(record => {
          if (record && record.role) {
            setUserRole(record.role);
          }
        })
        .catch(err => {
          console.error("Error fetching user role:", err);
        });
    }
  }, [currentUser]);

  // Load Admin Data when Admin Panel opens or tab changes
  useEffect(() => {
    if (isAdminPanelOpen) {
      if (adminPanelTab === 'invite') {
        pb.collection('dahoot_settings').getFirstListItem('key = "invite_code"')
          .then(record => {
            setInviteCodeSettingRecord(record);
            setInviteCodeValue(record.value);
            setInviteError('');
          })
          .catch(err => {
            console.error("Error fetching invite code:", err);
            setInviteError("Failed to load invite code.");
          });
      } else if (adminPanelTab === 'teachers') {
        setIsLoadingTeachers(true);
        setTeachersError('');
        pb.collection('users').getFullList({
          expand: 'dahoot_info',
          sort: 'created'
        })
          .then(list => {
            setTeachers(list);
            setIsLoadingTeachers(false);
          })
          .catch(err => {
            console.error("Error fetching users:", err);
            setTeachersError("Failed to load teachers list.");
            setIsLoadingTeachers(false);
          });
      }
    }
  }, [isAdminPanelOpen, adminPanelTab]);

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
    if (!confirm(`Are you sure you want to delete user ${user.email || user.username}?`)) {
      return;
    }
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
      
      await pb.collection('users').create({
        email: newTeacherEmail.trim(),
        password: newTeacherPassword,
        passwordConfirm: newTeacherPassword,
        username: newTeacherEmail.trim().split('@')[0] + Math.floor(Math.random() * 10000),
        name: newTeacherName.trim() || undefined,
        dahoot_info: info.id
      });
      
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
            maxWidth: '850px', 
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
        </div>
      </div>
    );
  };

  const initPreviewQuestionStates = (question) => {
    setPreviewAnswered(false);
    setPreviewIsCorrect(false);
    setSelectedOptionIdx(null);
    
    const type = question.type || 'MULTIPLE_CHOICE';
    if (type === 'SORTING' && Array.isArray(question.options)) {
      setSortingItems([...question.options].sort(() => 0.5 - Math.random()));
    } else {
      setSortingItems([]);
    }

    if (type === 'DRAG_DROP') {
      const totalBlanks = typeof question.options === 'object' && question.options.correct
        ? question.options.correct.length
        : 0;
      setPlacedWords(Array(totalBlanks).fill(null));
      setActiveBlankIdx(0);
    } else {
      setPlacedWords([]);
    }

    if (type === 'DROP_DOWN') {
      const totalDropdowns = typeof question.options === 'object' && question.options.dropdowns
        ? question.options.dropdowns.length
        : 0;
      setDropdownSelections(Array(totalDropdowns).fill(''));
    } else {
      setDropdownSelections([]);
    }

    if (type === 'CATEGORIZE') {
      setCategorizeIdx(0);
      setCategoryAssignments({});
    } else {
      setCategoryAssignments({});
    }
  };

  const startPreviewGame = async (game) => {
    setPreviewGame(game);
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewCurrentIdx(0);
    setPreviewAnswered(false);
    setPreviewIsCorrect(false);
    setSelectedOptionIdx(null);
    try {
      const qList = await pb.collection('dahoot_questions').getFullList({
        filter: `game_id = "${game.id}"`,
        sort: 'created'
      });
      setPreviewQuestions(qList);
      if (qList.length > 0) {
        initPreviewQuestionStates(qList[0]);
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
    setSelectedOptionIdx(null);
  };

  const submitPreviewAnswer = (userAnswer) => {
    if (previewAnswered) return;

    const activeQuestion = previewQuestions[previewCurrentIdx];
    let isCorrect = false;
    const type = activeQuestion.type || 'MULTIPLE_CHOICE';

    if (type === 'MULTIPLE_CHOICE') {
      setSelectedOptionIdx(userAnswer);
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

    setPreviewIsCorrect(isCorrect);
    setPreviewAnswered(true);
  };

  const nextPreviewQuestion = () => {
    if (previewCurrentIdx + 1 < previewQuestions.length) {
      const nextIdx = previewCurrentIdx + 1;
      setPreviewCurrentIdx(nextIdx);
      initPreviewQuestionStates(previewQuestions[nextIdx]);
    } else {
      alert("You have previewed all questions in this collection!");
      closePreviewGame();
    }
  };

  const renderMcInteraction = (activeQuestion) => {
    if (!Array.isArray(activeQuestion.options)) return null;

    const letters = ['A', 'B', 'C', 'D'];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
        {activeQuestion.options.map((opt, idx) => {
          const isCorrect = idx === activeQuestion.correct_option_index;
          const isSelected = idx === selectedOptionIdx;
          
          let buttonStyle = {
            padding: '14px 16px',
            fontSize: '0.95rem',
            fontWeight: '600',
            width: '100%',
            transition: 'all 0.2s ease',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderRadius: '12px',
            color: 'var(--text-primary)',
            textAlign: 'left',
            cursor: previewAnswered ? 'default' : 'pointer',
            boxShadow: 'var(--shadow-sm)'
          };

          let badgeStyle = {
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '0.8rem',
            transition: 'all 0.2s ease',
            flexShrink: 0
          };

          if (previewAnswered) {
            if (isCorrect) {
              buttonStyle.background = 'rgba(16, 185, 129, 0.1)';
              buttonStyle.borderColor = '#10b981';
              buttonStyle.boxShadow = '0 0 20px rgba(16, 185, 129, 0.2)';
              
              badgeStyle.background = '#10b981';
              badgeStyle.borderColor = '#10b981';
              badgeStyle.color = '#ffffff';
            } else if (isSelected) {
              buttonStyle.background = 'rgba(239, 68, 68, 0.1)';
              buttonStyle.borderColor = '#ff4b60';
              buttonStyle.boxShadow = '0 0 20px rgba(255, 75, 96, 0.2)';
              
              badgeStyle.background = '#ff4b60';
              badgeStyle.borderColor = '#ff4b60';
              badgeStyle.color = '#ffffff';
            } else {
              buttonStyle.opacity = 0.45;
              buttonStyle.background = 'rgba(255, 255, 255, 0.01)';
            }
          }

          return (
            <button
              key={idx}
              type="button"
              className={previewAnswered ? '' : 'preview-mc-option'}
              style={buttonStyle}
              onClick={() => submitPreviewAnswer(idx)}
              disabled={previewAnswered}
            >
              <div className="preview-mc-badge" style={badgeStyle}>
                {letters[idx]}
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'space-between' }}>
                <span>{opt}</span>
                {previewAnswered && isCorrect && (
                  <span style={{ 
                    background: '#10b981', 
                    borderRadius: '50%', 
                    width: 22, 
                    height: 22, 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '0.85rem',
                    color: '#ffffff',
                    boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
                    flexShrink: 0
                  }}>
                    ✓
                  </span>
                )}
                {previewAnswered && isSelected && !isCorrect && (
                  <span style={{ 
                    background: '#ff4b60', 
                    borderRadius: '50%', 
                    width: 22, 
                    height: 22, 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '0.85rem',
                    color: '#ffffff',
                    boxShadow: '0 0 10px rgba(255, 75, 96, 0.5)',
                    flexShrink: 0
                  }}>
                    ✗
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderSortingInteraction = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
        {sortingItems.map((item, idx) => (
          <div 
            key={idx} 
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--panel-border)',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ 
                background: 'var(--accent-glow)', 
                color: 'var(--accent-light)', 
                fontWeight: 700, 
                width: 24, 
                height: 24, 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '0.8rem' 
              }}>
                {idx + 1}
              </span>
              <span style={{ color: 'var(--text-primary)' }}>{item}</span>
            </div>
            {!previewAnswered && (
              <div style={{ display: 'flex', gap: 4 }}>
                <button 
                  type="button"
                  onClick={() => {
                    if (idx === 0) return;
                    const updated = [...sortingItems];
                    const temp = updated[idx];
                    updated[idx] = updated[idx - 1];
                    updated[idx - 1] = temp;
                    setSortingItems(updated);
                  }}
                  disabled={idx === 0}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    color: 'var(--text-primary)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  ▲
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (idx === sortingItems.length - 1) return;
                    const updated = [...sortingItems];
                    const temp = updated[idx];
                    updated[idx] = updated[idx + 1];
                    updated[idx + 1] = temp;
                    setSortingItems(updated);
                  }}
                  disabled={idx === sortingItems.length - 1}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    color: 'var(--text-primary)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  ▼
                </button>
              </div>
            )}
          </div>
        ))}
        
        {!previewAnswered && (
          <button
            onClick={() => submitPreviewAnswer(sortingItems)}
            className="btn btn-primary"
            style={{ marginTop: 16 }}
          >
            Submit Order
          </button>
        )}
      </div>
    );
  };

  const renderDragDropInteraction = (activeQuestion) => {
    if (!activeQuestion.options) return null;

    const renderBlanks = (sentence) => {
      const parts = sentence.split(/(\[blank\d+\])/g);
      return parts.map((part, idx) => {
        const match = part.match(/\[blank(\d+)\]/);
        if (match) {
          const blankIdx = parseInt(match[1]);
          const word = placedWords[blankIdx];
          const isActive = blankIdx === activeBlankIdx;
          
          let blankStyle = {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '90px',
            height: '32px',
            borderBottom: '2px solid var(--accent-light)',
            margin: '0 6px',
            padding: '0 8px',
            cursor: previewAnswered ? 'default' : 'pointer',
            color: word ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: word ? '700' : 'normal',
            transition: 'all 0.15s ease',
            backgroundColor: isActive ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
            borderRadius: '4px'
          };

          return (
            <span 
              key={idx} 
              onClick={() => {
                if (previewAnswered) return;
                if (word) {
                  const updated = [...placedWords];
                  updated[blankIdx] = null;
                  setPlacedWords(updated);
                  setActiveBlankIdx(blankIdx);
                } else {
                  setActiveBlankIdx(blankIdx);
                }
              }}
              style={blankStyle}
            >
              {word || '_____'}
            </span>
          );
        }
        return <span key={idx}>{part}</span>;
      });
    };

    return (
      <div style={{ width: '100%' }}>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 relative shadow-sm text-slate-800" style={{
          lineHeight: '2.5rem',
          fontSize: '1.1rem',
          marginBottom: 20
        }}>
          {renderBlanks(activeQuestion.options.sentence)}
        </div>

        {!previewAnswered && (
          <>
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex gap-2 flex-wrap justify-center min-h-[80px] mb-5">
              {activeQuestion.options.choices?.map((choice, idx) => {
                const isPlaced = placedWords.includes(choice);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (isPlaced) return;
                      let fillIdx = activeBlankIdx;
                      if (placedWords[fillIdx] !== null) {
                        fillIdx = placedWords.indexOf(null);
                      }
                      if (fillIdx !== -1) {
                        const updated = [...placedWords];
                        updated[fillIdx] = choice;
                        setPlacedWords(updated);
                        const nextEmpty = updated.indexOf(null);
                        if (nextEmpty !== -1) {
                          setActiveBlankIdx(nextEmpty);
                        }
                      }
                    }}
                    className={`player-pool-chip ${isPlaced ? 'placed' : ''}`}
                    disabled={isPlaced}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => submitPreviewAnswer(placedWords)}
              className="btn btn-primary"
              disabled={placedWords.includes(null)}
            >
              Submit Blanks
            </button>
          </>
        )}
      </div>
    );
  };

  const renderDropDownInteraction = (activeQuestion) => {
    if (!activeQuestion.options || !Array.isArray(activeQuestion.options.dropdowns)) return null;

    const renderDropdowns = (sentence, dropdowns) => {
      const parts = sentence.split(/(\{\{\d+\}\})/g);
      return parts.map((part, idx) => {
        const match = part.match(/\{\{(\d+)\}\}/);
        if (match) {
          const dropIdx = parseInt(match[1]);
          const config = dropdowns[dropIdx];
          return (
            <select
              key={idx}
              value={dropdownSelections[dropIdx] || ''}
              onChange={(e) => {
                const updated = [...dropdownSelections];
                updated[dropIdx] = e.target.value;
                setDropdownSelections(updated);
              }}
              disabled={previewAnswered}
              className="player-sentence-select"
            >
              <option value="">-- Choose --</option>
              {config.choices.map((choice, cIdx) => (
                <option key={cIdx} value={choice}>{choice}</option>
              ))}
            </select>
          );
        }
        return <span key={idx}>{part}</span>;
      });
    };

    return (
      <div style={{ width: '100%' }}>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 relative shadow-sm text-slate-800" style={{
          lineHeight: '2.8rem',
          fontSize: '1.1rem',
          marginBottom: 20
        }}>
          {renderDropdowns(activeQuestion.options.sentence, activeQuestion.options.dropdowns)}
        </div>

        {!previewAnswered && (
          <button
            onClick={() => submitPreviewAnswer(dropdownSelections)}
            className="btn btn-primary"
            disabled={dropdownSelections.includes('')}
          >
            Submit Answers
          </button>
        )}
      </div>
    );
  };

  const renderCategorizeInteraction = (activeQuestion) => {
    if (!activeQuestion.options) return null;
    const totalItems = activeQuestion.options.items?.length || 0;
    const allCategorized = categorizeIdx >= totalItems;

    return (
      <div style={{ width: '100%' }}>
        {!allCategorized ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div 
              style={{
                background: 'var(--accent-glow)',
                border: '1px solid var(--panel-border-focus)',
                boxShadow: 'var(--shadow-glow)',
                borderRadius: '12px',
                padding: '32px 16px',
                width: '100%',
                maxWidth: '340px',
                textAlign: 'center',
                fontSize: '1.4rem',
                fontWeight: 700
              }}
            >
              {activeQuestion.options.items[categorizeIdx]?.name}
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: activeQuestion.options.categories?.length > 2 ? '1fr 1fr' : '1fr',
              gap: 12,
              width: '100%',
              maxWidth: '340px',
              marginTop: 12
            }}>
              {activeQuestion.options.categories?.map((cat, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`btn ${idx === 0 ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    const itemName = activeQuestion.options.items[categorizeIdx].name;
                    const updated = { ...categoryAssignments };
                    updated[itemName] = cat;
                    setCategoryAssignments(updated);
                    setCategorizeIdx(prev => prev + 1);
                  }}
                  style={{ padding: '12px 16px', fontSize: '0.95rem' }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: 12, textAlign: 'center' }}>
              Review Categorizations
            </h3>
            <div style={{ 
              maxHeight: '180px', 
              overflowY: 'auto', 
              background: 'rgba(0, 0, 0, 0.2)', 
              borderRadius: '8px', 
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginBottom: 20
            }}>
              {Object.keys(categoryAssignments).map((item, idx) => (
                <div 
                  key={idx}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: '0.9rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                    paddingBottom: 4
                  }}
                >
                  <span style={{ color: 'var(--text-primary)' }}>{item}</span>
                  <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>{categoryAssignments[item]}</span>
                </div>
              ))}
            </div>

            {!previewAnswered && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setCategorizeIdx(0);
                    setCategoryAssignments({});
                  }}
                  style={{ flex: 1 }}
                >
                  Reset
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => submitPreviewAnswer(categoryAssignments)}
                  style={{ flex: 2 }}
                >
                  Submit
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPreviewFeedbackArea = (activeQuestion) => {
    if (!previewAnswered) return null;

    const type = activeQuestion.type || 'MULTIPLE_CHOICE';

    let correctAnswerExplanation = '';
    if (type === 'MULTIPLE_CHOICE') {
      correctAnswerExplanation = `Correct option is Option ${activeQuestion.correct_option_index + 1}: "${activeQuestion.options[activeQuestion.correct_option_index]}"`;
    } else if (type === 'SORTING') {
      correctAnswerExplanation = `Correct sequence: ${activeQuestion.options.join(' ➔ ')}`;
    } else if (type === 'DRAG_DROP') {
      correctAnswerExplanation = `Correct words: ${activeQuestion.options.correct?.join(', ')}`;
    } else if (type === 'DROP_DOWN') {
      correctAnswerExplanation = `Correct selections: ${activeQuestion.options.dropdowns?.map((d, i) => `[${i+1}] ${d.correct}`).join(', ')}`;
    } else if (type === 'CATEGORIZE') {
      correctAnswerExplanation = `Correct classifications: ${activeQuestion.options.items?.map(item => `${item.name} ➔ ${item.category}`).join(', ')}`;
    }

    return (
      <div style={{
        marginTop: '20px',
        borderTop: '1px solid var(--panel-border)',
        paddingTop: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
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
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            {correctAnswerExplanation}
          </p>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={nextPreviewQuestion}
          style={{ width: '100%' }}
        >
          {previewCurrentIdx + 1 < previewQuestions.length ? 'Next Question ➔' : 'Finish Preview'}
        </button>
      </div>
    );
  };

  const renderPreviewQuestionBody = () => {
    const activeQuestion = previewQuestions[previewCurrentIdx];
    if (!activeQuestion) return null;
    const type = activeQuestion.type || 'MULTIPLE_CHOICE';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 relative shadow-sm">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '10px',
            fontSize: '0.85rem'
          }}>
            <span className="game-tag text-rose-500 border-rose-100 bg-rose-50/50 font-bold px-2.5 py-0.5">
              Question {previewCurrentIdx + 1} of {previewQuestions.length}
            </span>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              {type.replace('_', ' ')}
            </span>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.6' }}>
            {activeQuestion.text}
          </div>
        </div>

        <div style={{ minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'center', margin: '10px 0' }}>
          {type === 'MULTIPLE_CHOICE' && renderMcInteraction(activeQuestion)}
          {type === 'SORTING' && renderSortingInteraction()}
          {type === 'DRAG_DROP' && renderDragDropInteraction(activeQuestion)}
          {type === 'DROP_DOWN' && renderDropDownInteraction(activeQuestion)}
          {type === 'CATEGORIZE' && renderCategorizeInteraction(activeQuestion)}
        </div>

        {renderPreviewFeedbackArea(activeQuestion)}
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
              <p style={{ fontSize: '1.1rem', marginBottom: '20px' }}>This game collection has no questions yet.</p>
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
              🛠 Manage Teachers
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
          No questions added to this collection yet. Fill out the form above and click "+ Add Question to Collection".
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

  const renderBulkImportBuilder = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ marginBottom: 4 }}>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
            Paste your Markdown-formatted questions below to import them in bulk when the collection is created.
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
          <label className="form-label">Markdown Text</label>
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

  // Filtered games array
  const filteredGamesList = useMemo(() => {
    return gamesList.filter(game => {
      if (filterSubject.length > 0 && !filterSubject.includes(game.subject)) return false;
      if (filterCefr.length > 0 && !filterCefr.includes(game.cefr_level)) return false;
      if (filterLanguage.length > 0 && !filterLanguage.includes(game.language)) return false;
      if (filterCreator.length > 0 && !filterCreator.includes(game.creator)) return false;
      return true;
    });
  }, [gamesList, filterSubject, filterCefr, filterLanguage, filterCreator]);
  
  // 1. GAME EDITING MODE
  if (!selectedGame && isEditingGame) {
    return (
      <div className="app-container">
        <div className="panel panel-large animate-join-focus" style={{ textAlign: 'left' }}>
          {renderUserStatusBar()}
          <div style={{ marginBottom: 24 }}>
            <h2>{selectedGameForEdit ? 'Edit Game Details' : 'Create New Game Collection'}</h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Specify the details and metadata tags for your quiz game collection.
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
              <label className="form-label">Game Title</label>
              <input 
                type="text"
                className="form-input" 
                placeholder="e.g. World History Trivia"
                value={gameTitle}
                onChange={(e) => setGameTitle(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description (Optional)</label>
              <textarea 
                className="form-input" 
                placeholder="e.g. 10 questions covering major historical events of the 20th century."
                value={gameDescription}
                onChange={(e) => setGameDescription(e.target.value)}
                disabled={loading}
                rows={3}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Creator / Author (Optional)</label>
                <input 
                  type="text"
                  className="form-input" 
                  placeholder="e.g. Dahoot Team"
                  value={gameCreator}
                  onChange={(e) => setGameCreator(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Language (Optional)</label>
                <input 
                  type="text"
                  className="form-input" 
                  placeholder="e.g. English"
                  value={gameLanguage}
                  onChange={(e) => setGameLanguage(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">CEFR Language Level (Optional)</label>
                <select
                  className="form-input"
                  value={gameCefrLevel}
                  onChange={(e) => setGameCefrLevel(e.target.value)}
                  disabled={loading}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">None / Not Applicable</option>
                  {availableCefrLevels.map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Subject</label>
                <select
                  className="form-input"
                  value={gameSubject}
                  onChange={(e) => setGameSubject(e.target.value)}
                  disabled={loading}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">None / General</option>
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
                        ➕ Add Question to Collection
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
              <h2 style={{ marginBottom: 4 }}>Game Collections</h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                Manage groups of quiz questions that can be played, copied, and edited.
              </p>
            </div>
            <button className="btn btn-primary" onClick={startCreatingGame} style={{ width: 'auto', minWidth: 180 }}>
              + Create Game Collection
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
                🔍 Filter Collections {hasActiveFilters && <span style={{ color: 'var(--accent-light)', fontSize: '0.85rem' }}>({filteredGamesList.length} matches)</span>}
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
                No game collections match the selected filters. Clear filters or create a new collection.
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
                        onClick={(e) => copyGame(game, e)}
                      >
                        Copy Game
                      </button>
                      <button 
                        className="btn-card-action btn-card-action-danger py-1.5 text-xs" 
                        onClick={(e) => deleteGame(game.id, e)}
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
              <label className="form-label">Markdown Text</label>
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
              Create or edit a question for the collection: <strong>{selectedGame.title}</strong>
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
              Manage questions for this game collection
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
              No questions in this collection yet. Click "+ Add Question" or "📥 Import in Bulk" to get started.
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
                      onClick={() => deleteQuestion(question.id)}
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
    </div>
  );
}
