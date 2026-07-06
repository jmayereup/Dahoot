import React, { useState, useMemo, useEffect } from 'react';
import { OPTION_CLASSES } from '../constants';
import { pb } from '../pb';
import { useConfirm } from '../hooks/useConfirm.jsx';
import { compileQuestionsToMarkdown, parseMarkdownQuestions } from '../utils/markdownParser';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  splitCurlyTokens,
  getCurlyIndex,
  getCurlyInner,
  splitBracketTokens,
  getBlankIndex,
  getBracketInner
} from '../utils/blankParsing';



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
  setError = () => {},
  isEditing,
  selectedQuestion,
  questionType,
  setQuestionType,
  questionText,
  setQuestionText,



  // Import State & Handlers
  isImporting,
  importText,
  setImportText,
  startImporting,
  cancelImporting,
  saveImportedQuestions,
  
  // Multiple Choice & Sorting
  options,
  setOptions,
  updateOptionValue,
  correctOptionIndex,
  setCorrectOptionIndex,

  // Drag & Drop
  dragSentence,
  setDragSentence,
  dragChoices,
  setDragChoices,
  updateDragChoice,

  // Drop Down
  dropdownSentence,
  setDropdownSentence,
  dropdownOptions,
  setDropdownOptions,
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
  userInfo = null,
  setUserInfo = null,
  onLogout = null,
  startHosting = null
}) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [copySuggestionGame, setCopySuggestionGame] = useState(null);

  const canEditGame = (game) => {
    if (!game) return false;
    if (userRole === 'TEACHER' || userRole === 'ADMIN') return true;

    const creatorName = game.creator ? game.creator.toLowerCase().trim() : '';
    const myDahootUsername = userInfo?.dahoot_username ? userInfo.dahoot_username.toLowerCase().trim() : '';
    const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
    const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
    const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';

    return (myDahootUsername && creatorName === myDahootUsername) ||
           (myName && creatorName === myName) || 
           (myEmail && creatorName === myEmail) || 
           (myUsername && creatorName === myUsername) || 
           (currentUser?.id && creatorName === currentUser.id);
  };

  const canDeleteGame = (game) => {
    if (!game) return false;
    if (userRole === 'ADMIN') return true;

    const creatorName = game.creator ? game.creator.toLowerCase().trim() : '';
    const myDahootUsername = userInfo?.dahoot_username ? userInfo.dahoot_username.toLowerCase().trim() : '';
    const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
    const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
    const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';

    return (myDahootUsername && creatorName === myDahootUsername) ||
           (myName && creatorName === myName) || 
           (myEmail && creatorName === myEmail) || 
           (myUsername && creatorName === myUsername) || 
           (currentUser?.id && creatorName === currentUser.id);
  };

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

  const handleCopyGame = (game, e) => {
    if (e) e.stopPropagation();
    setCopySuggestionGame(game);
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

  // Preview inline question editing state
  const [previewEditingQuestion, setPreviewEditingQuestion] = useState(null); // null | question object (for edit) | 'new' (for add)
  const [previewEditError, setPreviewEditError] = useState('');
  const [previewEditLoading, setPreviewEditLoading] = useState(false);

  const handleStartCreatingGame = () => {
    startCreatingGame();
    setPreviewGame({ id: 'temp', title: 'New Dahoot' });
    setPreviewQuestions([]);
  };

  const handleStartEditingGame = async (game, e) => {
    if (e) e.stopPropagation();
    await startEditingGame(game, e);
    setPreviewGame(game);
    setPreviewLoading(true);
    setPreviewError('');
    try {
      const qList = await pb.collection('dahoot_questions').getFullList({
        filter: pb.filter("game_id = {:gameId}", { gameId: game.id }),
        sort: 'created'
      });
      setPreviewQuestions(qList);
    } catch (err) {
      console.error(err);
      setPreviewError('Failed to load questions: ' + err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmitGame = async (e) => {
    e.preventDefault();
    const createdGame = await saveGame(e, previewQuestions);
    if (createdGame) {
      startPreviewGame(createdGame);
    } else {
      setPreviewGame(null);
      setPreviewQuestions([]);
    }
  };

  const handleCancelImporting = () => {
    const gameToPreview = selectedGame;
    cancelImporting();
    setSelectedGame(null);
    if (gameToPreview && gameToPreview.id !== 'temp') {
      startPreviewGame(gameToPreview);
    }
  };

  const handleSaveImportedQuestions = async (e) => {
    e.preventDefault();
    const gameToPreview = selectedGame;
    if (gameToPreview && gameToPreview.id === 'temp') {
      const parsed = parseMarkdownQuestions(importText);
      if (parsed.length === 0) {
        setError('Could not parse any valid questions. Check formatting.');
        return;
      }
      const newQs = parsed.map((q, idx) => ({
        id: 'local_' + (Date.now() + idx),
        text: q.text,
        options: q.options,
        correct_option_index: q.correct_option_index,
        type: q.type
      }));
      setPreviewQuestions(prev => [...prev, ...newQs]);
      setIsImporting(false);
      setImportText('');
      setSelectedGame(null);
    } else {
      await saveImportedQuestions(e);
      setSelectedGame(null);
      if (gameToPreview) {
        startPreviewGame(gameToPreview);
      }
    }
  };

  const renderInlineQuestionsSection = () => {
    return (
      <div style={{
        marginTop: '32px',
        borderTop: '1px dashed rgba(93, 107, 130, 0.2)',
        paddingTop: '24px'
      }}>
        <div className="flex justify-between items-center mb-4" style={{ textAlign: 'left' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>
              Questions ({previewQuestions.length})
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              Add, edit, or remove questions. Changes are saved immediately.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openPreviewAddQuestion}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              ➕ Add Question
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedGame(selectedGameForEdit || previewGame);
                startImporting();
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-violet-700 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              📥 Import or Generate
            </button>
          </div>
        </div>

        {previewLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading questions...</p>
          </div>
        ) : previewQuestions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '32px 16px',
            background: 'rgba(93, 107, 130, 0.02)',
            border: '1px dashed rgba(93, 107, 130, 0.15)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-muted)'
          }}>
            No questions yet. Click <strong>➕ Add Question</strong> to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {previewQuestions.map((question, qIdx) => (
              <div 
                key={question.id} 
                className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between"
              >
                <div className="flex flex-col h-full justify-between">
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-rose-50 text-rose-600 border border-rose-100 font-bold px-2.5 py-0.5 rounded-full text-xs">
                          Q{qIdx + 1}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {(question.type || 'MULTIPLE_CHOICE').replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openPreviewEditQuestion(question)}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit question"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePreviewQuestion(question.id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg transition-colors cursor-pointer"
                          title="Delete question"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Question text */}
                    <div className="text-sm font-semibold text-slate-800 mb-4 line-clamp-3" title={question.text}>
                      {question.text}
                    </div>
                  </div>

                  {/* Answers/Options highlight */}
                  <div className="text-xs text-slate-600 space-y-2 mt-auto">
                    {renderPreviewOptions(question)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

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
  // Profile settings states
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileSchool, setProfileSchool] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [copiedGameId, setCopiedGameId] = useState('');

  // Sync role when userInfo prop is available
  useEffect(() => {
    if (userInfo && userInfo.role) {
      setUserRole(userInfo.role);
    }
  }, [userInfo]);

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
                                <option value="DISABLED">DISABLED</option>
                              </select>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleToggleDisableUser(t)}
                                disabled={isSelf}
                                className={`px-2.5 py-1 border rounded font-bold text-[10px] transition-all cursor-pointer outline-none disabled:opacity-30 disabled:cursor-not-allowed ${
                                  role === 'DISABLED'
                                    ? 'border-indigo-200 hover:bg-indigo-50 text-indigo-500 hover:text-indigo-600'
                                    : 'border-rose-200 hover:bg-rose-50 text-rose-500 hover:text-rose-600'
                                }`}
                              >
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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (profileSaving) return;
    setProfileError('');
    setProfileSuccess('');
    setProfileSaving(true);
    try {
      if (!currentUser?.dahoot_info) {
        throw new Error("No linked user info record found.");
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
        setIsProfileModalOpen(false);
      }, 1000);
    } catch (err) {
      console.error("Error saving profile details:", err);
      setProfileError(err.message || "Failed to update profile details.");
    } finally {
      setProfileSaving(false);
    }
  };

  const renderProfileModal = () => {
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
                setIsProfileModalOpen(false);
                setProfileError('');
                setProfileSuccess('');
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
                  setIsProfileModalOpen(false);
                  setProfileError('');
                  setProfileSuccess('');
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
  };

  const startPreviewGame = async (game) => {
    setPreviewGame(game);
    setPreviewLoading(true);
    setPreviewError('');
    try {
      const qList = await pb.collection('dahoot_questions').getFullList({
        filter: pb.filter("game_id = {:gameId}", { gameId: game.id }),
        sort: 'created'
      });
      setPreviewQuestions(qList);
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
  };

  const handleShareQuiz = (game, e) => {
    if (e) e.stopPropagation();
    const shareUrl = `${window.location.origin}${window.location.pathname}?quiz=${game.id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopiedGameId(game.id);
        setTimeout(() => setCopiedGameId(''), 2000);
      })
      .catch(err => {
        console.error("Failed to copy share link:", err);
      });
  };



  const renderPreviewSentenceWithBlanks = (sentence, correct) => {
    if (!sentence) return '';
    const parts = splitBracketTokens(sentence);
    return parts.map((part, idx) => {
      const numericIdx = getBlankIndex(part);
      const inner = getBracketInner(part);
      if (numericIdx !== null) {
        const blankIdx = numericIdx;
        const correctWord = correct ? correct[blankIdx] : '';
        return (
          <span key={idx} className="mx-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-lg whitespace-nowrap">
            {correctWord || '_____'}
          </span>
        );
      }
      if (inner) {
        let mappedIdx = -1;
        if (correct) mappedIdx = correct.findIndex(c => c === inner);
        const blankIdx = mappedIdx !== -1 ? mappedIdx : 0;
        const correctWord = correct ? correct[blankIdx] : inner;
        return (
          <span key={idx} className="mx-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-lg whitespace-nowrap">
            {correctWord || inner}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const renderPreviewSentenceWithDropdowns = (sentence, dropdowns) => {
    if (!sentence || !Array.isArray(dropdowns)) return '';
    const parts = splitCurlyTokens(sentence);
    let sequentialDrop = 0;
    return parts.map((part, idx) => {
      const dropIdx = getCurlyIndex(part);
      const inner = getCurlyInner(part);
      if (dropIdx !== null) {
        const correctVal = dropdowns[dropIdx]?.correct || '';
        return (
          <span key={idx} className="mx-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-lg whitespace-nowrap">
            {correctVal || '_____'}
          </span>
        );
      }
      if (inner) {
        let mappedIdx = dropdowns.findIndex(d => d.correct === inner);
        const idxToUse = mappedIdx !== -1 ? mappedIdx : sequentialDrop;
        if (mappedIdx === -1) sequentialDrop += 1;
        const config = dropdowns[idxToUse] || { correct: inner };
        return (
          <span key={idx} className="mx-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-lg whitespace-nowrap">
            {config.correct || inner}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const renderPreviewCategorize = (options) => {
    if (!options) return null;
    const categories = options.categories || [];
    const items = options.items || [];
    return (
      <div className="grid grid-cols-2 gap-3 mt-2">
        {categories.map((cat, cIdx) => {
          const catItems = items.filter(item => item.category === cat);
          return (
            <div key={cIdx} className="bg-slate-50 border border-slate-200/60 rounded-xl p-3">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 border-b pb-1 truncate" title={cat}>
                Category: <span className="text-slate-800">{cat}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {catItems.map((item, iIdx) => (
                  <span key={iIdx} className="px-2 py-0.5 bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[10px] font-semibold rounded-lg truncate max-w-full">
                    {item.name}
                  </span>
                ))}
                {catItems.length === 0 && (
                  <span className="text-[10px] text-slate-400 italic">No items</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPreviewOptions = (question) => {
    const type = question.type || 'MULTIPLE_CHOICE';

    if (type === 'MULTIPLE_CHOICE') {
      const opts = Array.isArray(question.options) ? question.options : [];
      return (
        <div className="flex flex-col gap-2">
          {opts.map((opt, oIdx) => {
            const isCorrect = question.correct_option_index === oIdx;
            return (
              <div 
                key={oIdx} 
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs transition-colors ${
                  isCorrect 
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold shadow-xs' 
                    : 'border-slate-100 bg-slate-50/50 text-slate-500'
                }`}
              >
                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
                  isCorrect 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {isCorrect ? '✓' : ['A', 'B', 'C', 'D'][oIdx]}
                </span>
                <span className="truncate" title={opt}>{opt}</span>
              </div>
            );
          })}
        </div>
      );
    }

    if (type === 'SORTING') {
      const opts = Array.isArray(question.options) ? question.options : [];
      return (
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <span>✨ Correct Sorted Order:</span>
          </div>
          {opts.map((opt, oIdx) => (
            <div 
              key={oIdx} 
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-medium text-xs shadow-xs"
            >
              <span className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0 bg-emerald-500 text-white">
                {oIdx + 1}
              </span>
              <span className="truncate" title={opt}>{opt}</span>
            </div>
          ))}
        </div>
      );
    }

    if (type === 'DRAG_DROP' && question.options) {
      return (
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sentence:</div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
            {renderPreviewSentenceWithBlanks(question.options.sentence, question.options.correct)}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mr-1">Blanks:</span>
            {(question.options.correct || []).map((word, wIdx) => (
              <span key={wIdx} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-200">
                {word}
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (type === 'DROP_DOWN' && question.options) {
      return (
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sentence:</div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
            {renderPreviewSentenceWithDropdowns(question.options.sentence, question.options.dropdowns)}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mr-1">Dropdowns:</span>
            {(question.options.dropdowns || []).map((d, dIdx) => (
              <span key={dIdx} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-200">
                {d.correct}
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (type === 'CATEGORIZE' && question.options) {
      return renderPreviewCategorize(question.options);
    }

    return null;
  };

  // Refresh preview questions list
  const refreshPreviewQuestions = async () => {
    if (!previewGame) return;
    setPreviewLoading(true);
    try {
      const qList = await pb.collection('dahoot_questions').getFullList({
        filter: pb.filter("game_id = {:gameId}", { gameId: previewGame.id }),
        sort: 'created'
      });
      setPreviewQuestions(qList);
    } catch (err) {
      console.error(err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Open inline question editor within preview
  const openPreviewEditQuestion = (question) => {
    setPreviewEditError('');
    startEditing(question);
    setPreviewEditingQuestion(question);
  };

  const openPreviewAddQuestion = () => {
    setPreviewEditError('');
    startCreating();
    setPreviewEditingQuestion('new');
  };

  const closePreviewEditQuestion = () => {
    setPreviewEditingQuestion(null);
    setPreviewEditError('');
    cancelEditing();
  };

  // Save question from within the preview edit modal
  const savePreviewQuestion = async () => {
    setPreviewEditError('');
    if (!canEditGame(previewGame)) {
      setPreviewEditError('You do not have permission to edit this game.');
      return;
    }
    if (!questionText.trim()) {
      setPreviewEditError('Question text is required.');
      return;
    }
    let optionsPayload = null;
    if (questionType === 'MULTIPLE_CHOICE' || questionType === 'SORTING') {
      if (options.some(opt => !opt.trim())) { setPreviewEditError('All 4 option choices must be filled out.'); return; }
      optionsPayload = options.map(o => o.trim());
    } else if (questionType === 'DRAG_DROP') {
      if (!dragSentence.trim()) { setPreviewEditError('Sentence with blanks is required.'); return; }
      if (dragChoices.some(c => !c.trim())) { setPreviewEditError('All 4 choices must be filled out.'); return; }
      const numBlanks = (dragSentence.match(/\[[^\]]+\]/g) || []).length;
      if (numBlanks === 0) { setPreviewEditError('The sentence must contain at least one blank placeholder.'); return; }
      optionsPayload = { sentence: dragSentence.trim(), choices: dragChoices.map(c => c.trim()), correct: dragChoices.slice(0, numBlanks).map(c => c.trim()) };
    } else if (questionType === 'DROP_DOWN') {
      if (!dropdownSentence.trim()) { setPreviewEditError('Sentence with dropdowns is required.'); return; }
      const numDropdowns = (dropdownSentence.match(/\{\{\d+\}\}/g) || []).length;
      if (numDropdowns === 0) { setPreviewEditError('The sentence must contain at least one dropdown placeholder (e.g. {{0}}).'); return; }
      const activeLines = dropdownOptions.slice(0, numDropdowns);
      if (activeLines.some(l => !l.trim())) { setPreviewEditError(`Please define choices for all ${numDropdowns} dropdowns.`); return; }
      const dropdownsConfig = activeLines.map(line => { const choices = line.split(',').map(c => c.trim()).filter(Boolean); return { choices, correct: choices[0] || '' }; });
      if (dropdownsConfig.some(d => d.choices.length < 2)) { setPreviewEditError('Each dropdown must have at least 2 comma-separated options.'); return; }
      optionsPayload = { sentence: dropdownSentence.trim(), dropdowns: dropdownsConfig };
    } else if (questionType === 'CATEGORIZE') {
      if (!categorizeCategories.trim()) { setPreviewEditError('Categories list is required.'); return; }
      if (!categorizeItemsText.trim()) { setPreviewEditError('Items list is required.'); return; }
      const categoriesList = categorizeCategories.split(',').map(c => c.trim()).filter(Boolean);
      if (categoriesList.length < 2) { setPreviewEditError('Please enter at least 2 categories, separated by commas.'); return; }
      try {
        const itemsList = categorizeItemsText.split('\n').map(line => {
          const parts = line.split(':');
          if (parts.length >= 2) {
            const cat = parts[1].trim();
            if (!categoriesList.includes(cat)) throw new Error(`Category "${cat}" does not match defined categories.`);
            return { name: parts[0].trim(), category: cat };
          }
          if (line.trim()) throw new Error(`Invalid line: "${line}". Must be "ItemName: CategoryName".`);
          return null;
        }).filter(Boolean);
        if (itemsList.length === 0) { setPreviewEditError('Please enter at least one item.'); return; }
        optionsPayload = { categories: categoriesList, items: itemsList };
      } catch (err) { setPreviewEditError(err.message); return; }
    }

    setPreviewEditLoading(true);
    const questionData = {
      game_id: previewGame.id,
      text: questionText.trim(),
      options: optionsPayload,
      correct_option_index: questionType === 'MULTIPLE_CHOICE' ? correctOptionIndex : 0,
      type: questionType
    };
    try {
      if (previewGame.id === 'temp') {
        if (previewEditingQuestion && previewEditingQuestion !== 'new') {
          setPreviewQuestions(prev => prev.map(q => q.id === previewEditingQuestion.id ? { ...q, ...questionData } : q));
        } else {
          const newQ = {
            id: 'local_' + Date.now(),
            ...questionData
          };
          setPreviewQuestions(prev => [...prev, newQ]);
        }
        closePreviewEditQuestion();
      } else {
        if (previewEditingQuestion && previewEditingQuestion !== 'new') {
          await pb.collection('dahoot_questions').update(previewEditingQuestion.id, questionData);
        } else {
          await pb.collection('dahoot_questions').create(questionData);
        }
        closePreviewEditQuestion();
        await refreshPreviewQuestions();
      }
    } catch (err) {
      console.error('Error saving question:', err);
      setPreviewEditError('Failed to save question: ' + err.message);
    } finally {
      setPreviewEditLoading(false);
    }
  };

  // Delete a question from within preview
  const deletePreviewQuestion = async (questionId) => {
    if (!canEditGame(previewGame)) {
      setPreviewError('You do not have permission to delete questions from this game.');
      return;
    }
    const ok = await confirm({
      title: 'Delete this question?',
      message: 'This action cannot be undone.',
      confirmText: 'Delete Question',
      cancelText: 'Keep Question',
      variant: 'danger',
      icon: '🗑️'
    });
    if (!ok) return;
    try {
      if (previewGame.id === 'temp') {
        setPreviewQuestions(prev => prev.filter(q => q.id !== questionId));
      } else {
        await pb.collection('dahoot_questions').delete(questionId);
        await refreshPreviewQuestions();
      }
    } catch (err) {
      console.error('Error deleting question:', err);
    }
  };

  const renderPreviewQuestionEditModal = () => {
    if (!previewEditingQuestion) return null;
    const isNew = previewEditingQuestion === 'new';
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(9, 10, 15, 0.7)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
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
            maxWidth: '750px',
            maxHeight: '94vh',
            overflowY: 'auto',
            textAlign: 'left',
            border: '1px solid var(--panel-border-focus)',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '15px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Question Editor</span>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>{isNew ? 'Add New Question' : 'Edit Question'}</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{previewGame?.title}</p>
            </div>
            <button
              type="button"
              onClick={closePreviewEditQuestion}
              style={{ background: 'rgba(93,107,130,0.08)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '1rem' }}
            >✕</button>
          </div>

          {previewEditError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ff4b60', padding: '12px 16px', borderRadius: '8px', marginBottom: 20 }}>
              {previewEditError}
            </div>
          )}

          <div>
            {renderQuestionFormFields()}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: '24px', justifyContent: 'flex-end', borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={closePreviewEditQuestion} style={{ width: 'auto', minWidth: '100px' }} disabled={previewEditLoading}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={savePreviewQuestion} style={{ width: 'auto', minWidth: '150px' }} disabled={previewEditLoading}>
              {previewEditLoading ? 'Saving...' : (isNew ? '✓ Add Question' : '✓ Save Changes')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCopySuggestionModal = () => {
    if (!copySuggestionGame) return null;

    const hasEditPermission = canEditGame(copySuggestionGame);

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(9, 10, 15, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 1200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          animation: 'fade-in 0.2s ease-out'
        }}
        role="dialog"
        aria-modal="true"
        onClick={() => setCopySuggestionGame(null)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="panel animate-pop-in"
          style={{
            width: '100%',
            maxWidth: '460px',
            padding: '28px 24px',
            textAlign: 'center',
            position: 'relative',
            border: '1px solid var(--panel-border)'
          }}
        >
          <button
            type="button"
            onClick={() => setCopySuggestionGame(null)}
            className="bg-black/[0.04] hover:bg-black/[0.08]"
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '1rem',
              cursor: 'pointer',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            aria-label="Close"
          >
            ✕
          </button>

          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(139, 92, 246, 0.12)',
              color: '#8B5CF6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              margin: '0 auto 16px',
              fontWeight: '700'
            }}
          >
            📋
          </div>

          <h2
            style={{
              fontSize: '1.35rem',
              fontWeight: '800',
              color: 'var(--text-primary)',
              marginBottom: '8px'
            }}
          >
            Copy this game?
          </h2>

          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.95rem',
              lineHeight: 1.5,
              marginBottom: '24px'
            }}
          >
            {hasEditPermission ? (
              <>
                Are you copying <strong>"{copySuggestionGame.title}"</strong> to fix mistakes or improve it? If so, please consider editing the original directly so everyone benefits from the corrections!
              </>
            ) : (
              <>
                A duplicate of <strong>"{copySuggestionGame.title}"</strong> will be created with "(Copy)" appended to its title. If you notice any mistakes, you can edit your copy or let the creator know.
              </>
            )}
          </p>

          <div className="flex flex-col gap-2.5 w-full">
            {hasEditPermission && (
              <button
                type="button"
                onClick={async () => {
                  const game = copySuggestionGame;
                  setCopySuggestionGame(null);
                  await handleStartEditingGame(game);
                }}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-500/20 active:scale-95 border-none"
              >
                ✏️ Edit Original (Fix Mistakes)
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const game = copySuggestionGame;
                setCopySuggestionGame(null);
                copyGame(game);
              }}
              className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white border border-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer"
            >
              📋 Copy Game Anyway
            </button>
            <button
              type="button"
              onClick={() => setCopySuggestionGame(null)}
              className="w-full py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold bg-transparent border-none cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPreviewModal = () => {
    if (!previewGame || isEditingGame) return null;

    const canEdit = canEditGame(previewGame);

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
            width: '95%', 
            maxWidth: '1200px', 
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
            paddingBottom: '15px',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Questions ({previewQuestions.length})
              </span>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>{previewGame.title}</h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {canEdit && (
                <button
                  onClick={openPreviewAddQuestion}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                >
                  ➕ Add Question
                </button>
              )}
              {canEdit && startImporting && (
                <button
                  onClick={() => {
                    setSelectedGame(previewGame);
                    closePreviewGame();
                    startImporting();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors cursor-pointer"
                >
                  📥 Import or Generate
                </button>
              )}
              <button 
                onClick={closePreviewGame}
                className="bg-white/5 hover:bg-white/10"
                style={{
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
              >
                ✕
              </button>
            </div>
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
              <div className="flex gap-3 justify-center flex-wrap">
                {canEdit && (
                  <button className="btn btn-primary" onClick={openPreviewAddQuestion} style={{ width: 'auto' }}>➕ Add Question</button>
                )}
                <button className="btn btn-secondary" onClick={closePreviewGame} style={{ width: 'auto' }}>Close</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {previewQuestions.map((question, qIdx) => (
                <div 
                  key={question.id} 
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between"
                >
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      {/* Header */}
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-rose-50 text-rose-600 border border-rose-100 font-bold px-2.5 py-0.5 rounded-full text-xs">
                            Q{qIdx + 1}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {(question.type || 'MULTIPLE_CHOICE').replace('_', ' ')}
                          </span>
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openPreviewEditQuestion(question)}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit question"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => deletePreviewQuestion(question.id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg transition-colors cursor-pointer"
                              title="Delete question"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Question text */}
                      <div className="text-sm font-semibold text-slate-800 mb-4 line-clamp-3" title={question.text}>
                        {question.text}
                      </div>
                    </div>

                    {/* Answers/Options highlight */}
                    <div className="text-xs text-slate-600 space-y-2 mt-auto">
                      {renderPreviewOptions(question)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {renderPreviewQuestionEditModal()}
      </div>
    );
  };

  const renderUserStatusBar = () => {
    if (!currentUser) return null;
    const displayName = userInfo?.dahoot_username || currentUser.name || currentUser.email;
    const displaySchool = userInfo?.school || '';
    return (
      <div className="flex justify-between items-center bg-slate-50 border-b border-slate-200/80 px-6 py-3 -mx-10 -mt-10 mb-6 text-xs text-slate-500 rounded-t-2xl shadow-inner w-[calc(100%+80px)]">
        <span className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap min-w-0 mr-4 scrollbar-none">
          👤 <strong className="text-slate-700 font-bold shrink-0">
            {displayName === currentUser.email ? displayName : `${displayName} (${currentUser.email})`}
          </strong>
          {displaySchool && (
            <span className="text-slate-400 font-medium shrink-0 ml-1">
              • {displaySchool}
            </span>
          )}
          {userRole === 'ADMIN' && (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border border-amber-200/60 shrink-0">
              Admin
            </span>
          )}
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setProfileSchool(userInfo?.school || '');
              setProfileUsername(userInfo?.dahoot_username || '');
              setProfileError('');
              setProfileSuccess('');
              setIsProfileModalOpen(true);
            }}
            className="p-1 text-slate-400 hover:text-slate-600 transition-all cursor-pointer hover:bg-slate-100 rounded-full active:scale-95 flex items-center justify-center border-none outline-none bg-transparent"
            title="Edit Profile"
          >
            ⚙️
          </button>
          {userRole === 'ADMIN' && (
            <button
              type="button"
              onClick={() => setIsAdminPanelOpen(true)}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-full transition-all cursor-pointer shadow-xs active:scale-95 inline-flex items-center justify-center border-none outline-none whitespace-nowrap"
            >
              🛠 Manage
            </button>
          )}
          <button 
            type="button"
            onClick={onLogout} 
            className="px-3 py-1 bg-white hover:bg-rose-50 border border-slate-200/80 text-rose-500 hover:text-rose-600 font-bold text-xs rounded-full transition-all cursor-pointer shadow-xs active:scale-95 inline-flex items-center justify-center outline-none whitespace-nowrap"
          >
            Log Out
          </button>
        </div>
        {isAdminPanelOpen && renderAdminPanel()}
        {isProfileModalOpen && renderProfileModal()}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7 max-w-[600px]">
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
    if (!genPrompt.trim()) {
      setGenError('Custom Prompt or Source Text is required.');
      return;
    }

    setGenLoading(true);
    setGenError('');

    const language = isEditingGame ? gameLanguage : selectedGame?.language;
    const cefrLevel = isEditingGame ? gameCefrLevel : selectedGame?.cefr_level;
    const subject = isEditingGame ? gameSubject : selectedGame?.subject;

    const systemPrompt = `You are an expert curriculum designer and language/subject assessment expert.
Generate educational questions. You MUST respond with a single, valid JSON object matching the JSON schema below. Do not wrap the JSON output in markdown codeblocks (e.g. do not use \`\`\`json).

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

JSON Response Schema:
{
  "description": "An engaging 1-2 sentence description for this game based on the subject and questions generated",
  "questions": [
    // Array of generated question objects matching the schemas below
  ]
}

Question Schemas by Type:

1. MULTIPLE_CHOICE
{
  "type": "MULTIPLE_CHOICE",
  "text": "Question text asking the student to choose the correct option.",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "correct_option_index": 1 // 0-based index of the correct answer. Distractors must be clearly incorrect and unambiguous.
}

2. SORTING
{
  "type": "SORTING",
  "text": "Instruction text (e.g., 'Sort these historical events in chronological order.')",
  "options": ["Item 1", "Item 2", "Item 3", "Item 4"], // Exactly 4 items, sorted in the CORRECT order from first to last.
  "correct_option_index": 0 // Always 0 for sorting questions
}

3. DRAG_DROP
{
  "type": "DRAG_DROP",
  "text": "Instruction text (e.g., 'Fill in the blanks by dragging the correct words.')",
  "options": {
    "sentence": "The quick brown [blank0] jumps over the lazy [blank1].", // Sentence text with correct answers inside zero-indexed bracket placeholders like [blank0] and [blank1] (corresponding to the index in the 'correct' list).
    "choices": ["fox", "dog", "cat", "horse"], // Exactly 4 choices, including the correct answers and distractors.
    "correct": ["fox", "dog"] // The correct answers in the order they appear in the sentence placeholders.
  },
  "correct_option_index": 0 // Always 0
}

4. DROP_DOWN
{
  "type": "DROP_DOWN",
  "text": "Instruction text (e.g., 'Choose the correct verb conjugations.')",
  "options": {
    "sentence": "Yesterday I {{0}} to school and {{1}} my friend.", // Sentence text with zero-indexed double-curly placeholders like {{0}} and {{1}} corresponding to the index in the dropdowns array.
    "dropdowns": [
      {
        "choices": ["went", "go", "gone", "goes"], // Exactly 4 choices for the first placeholder.
        "correct": "went" // The correct answer for this dropdown.
      },
      {
        "choices": ["saw", "see", "seen", "sees"], // Exactly 4 choices for the second placeholder.
        "correct": "saw" // The correct answer for this dropdown.
      }
    ]
  },
  "correct_option_index": 0 // Always 0
}

5. CATEGORIZE
{
  "type": "CATEGORIZE",
  "text": "Instruction text (e.g., 'Group the items into the correct categories.')",
  "options": {
    "categories": ["Fruits", "Vegetables"], // Exactly 2 categories.
    "items": [
      { "name": "Apple", "category": "Fruits" },
      { "name": "Broccoli", "category": "Vegetables" },
      { "name": "Banana", "category": "Fruits" },
      { "name": "Carrot", "category": "Vegetables" }
    ] // Exactly 4 items, each mapped to one of the categories.
  },
  "correct_option_index": 0 // Always 0
}
`;

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

      let choiceText = choice.trim();
      // Strip any markdown codeblock wrapper if present
      if (choiceText.startsWith("```json")) {
        choiceText = choiceText.substring(7);
      } else if (choiceText.startsWith("```")) {
        choiceText = choiceText.substring(3);
      }
      if (choiceText.endsWith("```")) {
        choiceText = choiceText.substring(0, choiceText.length - 3);
      }
      choiceText = choiceText.trim();

      let parsedData;
      try {
        parsedData = JSON.parse(choiceText);
      } catch (parseErr) {
        console.error("JSON parse error on raw content, attempting regex fallback:", parseErr, choice);
        const jsonMatch = choice.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedData = JSON.parse(jsonMatch[0]);
          } catch (regexParseErr) {
            throw new Error('Failed to parse JSON from AI response: ' + regexParseErr.message);
          }
        } else {
          throw new Error('AI response did not contain a valid JSON object.');
        }
      }

      const questions = parsedData.questions || [];
      const aiDescription = parsedData.description || '';

      const markdownText = compileQuestionsToMarkdown(questions);
      if (!markdownText) {
        throw new Error('No valid questions could be generated.');
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
              className="bg-white/5 hover:bg-white/10"
              style={{
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
                  Prompt
                </label>
                <span style={{ fontSize: '0.8rem', color: genPrompt.length > 100000 ? '#ff4b60' : 'var(--text-secondary)' }}>
                  {genPrompt.length.toLocaleString()} / 10,000 chars
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
                required
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
                disabled={genLoading || isGenerateDisabled || !genPrompt.trim()} 
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
                    ✨ Generate
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
      if (g.creator) {
        const creatorName = g.creator.toLowerCase().trim();
        const myDahootUsername = userInfo?.dahoot_username ? userInfo.dahoot_username.toLowerCase().trim() : '';
        const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
        const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
        const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';
        
        const isMyGame = (myDahootUsername && creatorName === myDahootUsername) ||
                         (myName && creatorName === myName) || 
                         (myEmail && creatorName === myEmail) || 
                         (myUsername && creatorName === myUsername) || 
                         (currentUser?.id && creatorName === currentUser.id);
        
        if (isMyGame && userInfo?.dahoot_username) {
          creators.add(userInfo.dahoot_username);
        } else {
          creators.add(g.creator);
        }
      }
    });
    return Array.from(creators);
  }, [gamesList, currentUser, userInfo]);

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
      const myDahootUsername = userInfo?.dahoot_username ? userInfo.dahoot_username.toLowerCase().trim() : '';
      const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
      const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
      const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';
      
      return (myDahootUsername && creatorName === myDahootUsername) ||
             (myName && creatorName === myName) || 
             (myEmail && creatorName === myEmail) || 
             (myUsername && creatorName === myUsername) || 
             (currentUser?.id && creatorName === currentUser.id);
    }).length;
  }, [gamesList, currentUser, userInfo]);

  // Filtered games array
  const filteredGamesList = useMemo(() => {
    return gamesList.filter(game => {
      // 1. Tab filtering (All vs My Games)
      if (libraryTab === 'my') {
        const creatorName = game.creator ? game.creator.toLowerCase().trim() : '';
        const myDahootUsername = userInfo?.dahoot_username ? userInfo.dahoot_username.toLowerCase().trim() : '';
        const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
        const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
        const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';
        
        const isMyGame = (myDahootUsername && creatorName === myDahootUsername) ||
                         (myName && creatorName === myName) || 
                         (myEmail && creatorName === myEmail) || 
                         (myUsername && creatorName === myUsername) || 
                         (currentUser?.id && creatorName === currentUser.id);
        
        if (!isMyGame) return false;
      }

      // 2. Category/Pill filtering
      if (filterSubject.length > 0 && !filterSubject.includes(game.subject)) return false;
      if (filterCefr.length > 0 && !filterCefr.includes(game.cefr_level)) return false;
      if (filterLanguage.length > 0 && !filterLanguage.includes(game.language)) return false;
      if (filterCreator.length > 0) {
        const creatorName = game.creator ? game.creator.toLowerCase().trim() : '';
        const myDahootUsername = userInfo?.dahoot_username ? userInfo.dahoot_username.toLowerCase().trim() : '';
        const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
        const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
        const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';
        
        const isMyGame = (myDahootUsername && creatorName === myDahootUsername) ||
                         (myName && creatorName === myName) || 
                         (myEmail && creatorName === myEmail) || 
                         (myUsername && creatorName === myUsername) || 
                         (currentUser?.id && creatorName === currentUser.id);
                         
        const effectiveCreator = (isMyGame && userInfo?.dahoot_username) ? userInfo.dahoot_username : game.creator;
        if (!filterCreator.includes(effectiveCreator)) return false;
      }
      return true;
    });
  }, [gamesList, libraryTab, currentUser, userInfo, filterSubject, filterCefr, filterLanguage, filterCreator]);

  const ITEMS_PER_PAGE = 9;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset pagination to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterSubject, filterCefr, filterLanguage, filterCreator, libraryTab]);

  const totalPages = Math.ceil(filteredGamesList.length / ITEMS_PER_PAGE);
  const effectivePage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const paginatedGamesList = useMemo(() => {
    const startIndex = (effectivePage - 1) * ITEMS_PER_PAGE;
    return filteredGamesList.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredGamesList, effectivePage]);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (effectivePage > 3) pages.push('...');
      
      const start = Math.max(2, effectivePage - 1);
      const end = Math.min(totalPages - 1, effectivePage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (effectivePage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };
  
  // 0. DISABLED USER ACCESS BLOCK
  if (userRole === 'DISABLED') {
    return (
      <div className="app-container">
        <div className="panel animate-join-focus" style={{ maxWidth: '440px', margin: '40px auto', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            margin: '0 auto 16px',
            fontWeight: '700'
          }}>
            ⚠️
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Account Disabled
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '24px' }}>
            Your account has been disabled by an administrator. You do not have permission to create, edit, or manage games.
          </p>
          <button
            onClick={onLogout}
            className="btn btn-danger"
            style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)' }}
          >
            Log Out
          </button>
        </div>
        {ConfirmDialog}
      </div>
    );
  }

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

          <form onSubmit={handleSubmitGame}>
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
              <label className="form-label">Description (optional / autogenerated)</label>
              <textarea 
                className="form-input" 
                placeholder="e.g. 10 questions covering major historical events of the 20th century. (Or leave blank to autogenerate from questions!)"
                value={gameDescription}
                onChange={(e) => setGameDescription(e.target.value)}
                disabled={loading}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="form-group">
                <label className="form-label">Creator / Author *</label>
                <select 
                  className="form-input" 
                  value={gameCreator}
                  onChange={(e) => setGameCreator(e.target.value)}
                  disabled={loading}
                  style={{ cursor: 'pointer' }}
                  required
                >
                  {Array.from(new Set([
                    gameCreator,
                    userInfo?.dahoot_username,
                    currentUser?.name,
                    currentUser?.email
                  ].filter(Boolean))).map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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

            {/* ── Questions Section ── */}
            {renderInlineQuestionsSection()}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
              <button type="button" className="btn btn-secondary" onClick={() => {
                cancelEditingGame();
                setPreviewGame(null);
                setPreviewQuestions([]);
              }} disabled={loading} style={{ width: 'auto', minWidth: 120 }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: 'auto', minWidth: 150 }}>
                {loading ? 'Saving...' : 'Save Game'}
              </button>
            </div>
          </form>
        </div>
        {renderPreviewQuestionEditModal()}
        {renderGenerateModal()}
        {ConfirmDialog}
      </div>
    );
  }

  // 2. QUESTIONS BULK IMPORT PANEL (Under Selected Game)
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

          <form onSubmit={handleSaveImportedQuestions}>
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
              <button type="button" className="btn btn-secondary" onClick={handleCancelImporting} disabled={loading} style={{ width: 'auto', minWidth: 120 }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading || !importText.trim()} style={{ width: 'auto', minWidth: 150 }}>
                {loading ? 'Importing...' : 'Save & Import'}
              </button>
            </div>
          </form>
        </div>
        {renderGenerateModal()}
        {ConfirmDialog}
      </div>
    );
  }

  // 3. GAMES LIST VIEW (Default Screen)
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
          <button className="btn btn-primary" onClick={handleStartCreatingGame} style={{ width: 'auto', minWidth: 180 }}>
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
              paginatedGamesList.map((game) => {
                const canEdit = canEditGame(game);
                return (
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
                      {game.creator && (() => {
                        const creatorName = game.creator.toLowerCase().trim();
                        const myDahootUsername = userInfo?.dahoot_username ? userInfo.dahoot_username.toLowerCase().trim() : '';
                        const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
                        const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
                        const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';
                        
                        const isMyGame = (myDahootUsername && creatorName === myDahootUsername) ||
                                         (myName && creatorName === myName) || 
                                         (myEmail && creatorName === myEmail) || 
                                         (myUsername && creatorName === myUsername) || 
                                         (currentUser?.id && creatorName === currentUser.id);
                        
                        const displayCreator = (isMyGame && userInfo?.dahoot_username) ? userInfo.dahoot_username : game.creator;
                        return (
                          <span className="game-tag">
                            👤 {displayCreator}
                          </span>
                        );
                      })()}
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
                    <div className="grid grid-cols-2 gap-2">
                      {startHosting ? (
                        <>
                          <button 
                            className="btn-card-action btn-card-action-primary py-2 text-xs font-semibold" 
                            onClick={(e) => {
                              e.stopPropagation();
                              startHosting(game.id);
                            }}
                          >
                            🚀 Host Game
                          </button>
                          <button 
                            className="btn-card-action btn-card-action-secondary py-2 text-xs font-semibold" 
                            onClick={(e) => {
                              e.stopPropagation();
                              startPreviewGame(game);
                            }}
                          >
                            📋 Preview
                          </button>
                        </>
                      ) : (
                        <button 
                          className="btn-card-action btn-card-action-secondary py-2 text-xs font-semibold col-span-2" 
                          onClick={(e) => {
                            e.stopPropagation();
                            startPreviewGame(game);
                          }}
                        >
                          {canEdit ? '📋 View / Edit Questions' : '📋 View Questions'}
                        </button>
                      )}
                    </div>
                    
                    <div className={
                      canEdit 
                        ? (canDeleteGame(game) ? "grid grid-cols-[1fr_1fr_1fr_40px] gap-1.5" : "grid grid-cols-[1fr_1fr_1fr] gap-1.5") 
                        : "grid grid-cols-[1fr_1fr] gap-1.5"
                    }>
                      {canEdit && (
                        <button 
                          className="btn-card-action btn-card-action-secondary py-1.5 px-1 text-[11px] font-semibold" 
                          onClick={(e) => handleStartEditingGame(game, e)}
                          title="Edit lesson title, description, and metadata"
                        >
                          ✏️ Edit
                        </button>
                      )}
                      <button 
                        className="btn-card-action btn-card-action-secondary py-1.5 px-1 text-[11px] font-semibold" 
                        onClick={(e) => handleCopyGame(game, e)}
                      >
                        📋 Copy
                      </button>
                      <button 
                        className="btn-card-action btn-card-action-secondary py-1.5 px-1 text-[11px] font-semibold" 
                        onClick={(e) => handleShareQuiz(game, e)}
                        title="Copy share link for other teachers"
                      >
                        {copiedGameId === game.id ? '✅ Copied' : '🔗 Share'}
                      </button>
                      {canDeleteGame(game) && (
                        <button 
                          className="btn-card-action btn-card-action-danger py-1.5 text-xs" 
                          onClick={(e) => handleDeleteGame(game.id, e)}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 bg-white/50 px-4 py-3 sm:px-6 mb-6 rounded-xl shadow-xs">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={effectivePage === 1}
                  className="relative inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={effectivePage === totalPages}
                  className="relative ml-3 inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500">
                    Showing <span className="font-semibold text-slate-700">{(effectivePage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                    <span className="font-semibold text-slate-700">
                      {Math.min(effectivePage * ITEMS_PER_PAGE, filteredGamesList.length)}
                    </span>{' '}
                    of <span className="font-semibold text-slate-700">{filteredGamesList.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-lg border border-slate-200 bg-white shadow-xs" aria-label="Pagination">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={effectivePage === 1}
                      className="relative inline-flex items-center rounded-l-lg px-2.5 py-1.5 text-slate-400 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    {getPageNumbers().map((page, idx) => {
                      if (page === '...') {
                        return (
                          <span
                            key={`ellipsis-${idx}`}
                            className="relative inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-400 border-l border-slate-200 select-none"
                          >
                            ...
                          </span>
                        );
                      }
                      const isCurrent = page === effectivePage;
                      return (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            isCurrent
                              ? 'z-10 bg-rose-500 text-white hover:bg-rose-600'
                              : 'text-slate-600 hover:bg-slate-50 border-l border-slate-200'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={effectivePage === totalPages}
                      className="relative inline-flex items-center rounded-r-lg px-2.5 py-1.5 text-slate-400 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed border-l border-slate-200 transition-all cursor-pointer"
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}

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
        {renderCopySuggestionModal()}
        {ConfirmDialog}
      </div>
    );
}
