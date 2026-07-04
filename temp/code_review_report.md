# Dahoot — Comprehensive Code Review Report

> [!NOTE]
> This review covers the **entire codebase**: 24 components, 9 hooks, 3 utilities, PocketBase hooks, 7 scripts, and all configuration files. Findings are from 4 parallel review passes.

---

## Executive Summary

| Severity | Count | Status | Key Themes |
|----------|-------|--------|------------|
| 🔴 Critical | 7 | ✅ Addressed | Open DB rules, no server-side validation, unauthenticated AI endpoint, XSS, confirm bypass |
| 🟠 High | 12 | ✅ Addressed | Answers exposed, subscription leaks, missing imports → crashes, auth bugs |
| 🟡 Medium | 27 | ✅ Addressed | Filter injection, timer drift, a11y gaps, double-submits, biased shuffle |
| 🟢 Low | 20 | ⏳ Open | Code organization, minor a11y, dead code, informational |

---

## 🔴 Critical Issues (✅ Addressed)

### C1 — Completely Open PocketBase Collection Rules
**File:** [db-setup.js:337–503](file:///var/home/jmayer/Dev/Dahoot/scripts/db-setup.js#L337-L503)
**Category:** Security

All collections (`dahoot_games`, `dahoot_rooms`, `dahoot_players`, `dahoot_questions`, `dahoot_user_info`, `dahoot_settings`, `dahoot_options`) have `listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: ''`. **Empty strings in PocketBase mean completely open** — anyone can read, create, update, and delete any record without authentication. This means:
- Any user can delete all games, questions, and rooms
- Any user can modify other players' scores
- The invite code in `dahoot_settings` is readable by anyone
- Admin-only data in `dahoot_user_info` is writable by anyone

**Fix:** Define proper access rules per collection. For example:
```js
listRule: '@request.auth.id != ""',  // authenticated users only
createRule: '@request.auth.id != "" && @request.auth.dahoot_info.role = "TEACHER"',
deleteRule: '@request.auth.dahoot_info.role = "ADMIN"',
```

---

### C2 — No Server-Side Answer Validation
**Files:** [usePlayerGame.js:211–283](file:///var/home/jmayer/Dev/Dahoot/src/hooks/usePlayerGame.js#L211-L283), [useMarathonPlayer.js:121–206](file:///var/home/jmayer/Dev/Dahoot/src/hooks/useMarathonPlayer.js#L121-L206), [pb_hooks/](file:///var/home/jmayer/Dev/Dahoot/pocketbase/pb_hooks)
**Category:** Security

The client calculates `is_correct`, `points`, and `time_bonus` and submits them to PocketBase. Combined with the open collection rules (C1), a player can open DevTools, call `pb.collection('dahoot_players').update()` directly, and set any score they want. There are no server-side hooks validating answers.

**Fix:** Implement PocketBase `onRecordCreate`/`onRecordUpdate` hooks that:
1. Look up the correct answer from the quiz data
2. Compare with the submitted answer
3. Calculate the score server-side
4. Reject or overwrite client-supplied `is_correct`/`points`/`time_bonus`

---

### C3 — Unauthenticated AI Generation Endpoint
**File:** [generate.pb.js:3](file:///var/home/jmayer/Dev/Dahoot/pocketbase/pb_hooks/generate.pb.js#L3)
**Category:** Security

The `/api/generate-questions` POST endpoint has **no authentication check**. Anyone who discovers this endpoint can proxy arbitrary requests through your OpenRouter API key, potentially running up significant costs. The prompt content is passed through without sanitization or rate limiting.

**Fix:**
```js
routerAdd("POST", "/api/generate-questions", (e) => {
    const authRecord = e.auth;
    if (!authRecord) {
        return e.json(401, { error: "Authentication required" });
    }
    // Add rate limiting per user
    // Validate/limit prompt length
}, $apis.requireAuth());
```

---

### C4 — XSS via Unsanitized HTML Rendering
**Files:** [markdownParser.js:30–78](file:///var/home/jmayer/Dev/Dahoot/src/utils/markdownParser.js#L30-L78), [QuestionInteraction.jsx:250–290](file:///var/home/jmayer/Dev/Dahoot/src/components/QuestionInteraction.jsx#L250-L290), [TeacherDashboard.jsx:850–920](file:///var/home/jmayer/Dev/Dahoot/src/components/TeacherDashboard.jsx#L850-L920), [MarathonPlayerView.jsx:245](file:///var/home/jmayer/Dev/Dahoot/src/components/MarathonPlayerView.jsx#L245), [HostQuestion.jsx:130](file:///var/home/jmayer/Dev/Dahoot/src/components/HostQuestion.jsx#L130)
**Category:** Security

`parseMarkdown()` converts user-authored text to raw HTML via string concatenation. This output is rendered with `dangerouslySetInnerHTML` in **5+ components**. A teacher could embed `<img src=x onerror=alert(document.cookie)>` in a question that executes in every student's browser. In a school setting, this is especially dangerous.

**Fix:**
```bash
npm install dompurify
```
```js
import DOMPurify from 'dompurify';
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parseMarkdown(text)) }}
```

---

### C5 — `confirm()` Shadowed — Delete Confirmations Bypassed
**File:** [TeacherDashboard.jsx:307](file:///var/home/jmayer/Dev/Dahoot/src/components/TeacherDashboard.jsx#L307), [TeacherDashboard.jsx:395](file:///var/home/jmayer/Dev/Dahoot/src/components/TeacherDashboard.jsx#L395)
**Category:** Bug

`useConfirm()` destructures a custom async `confirm` function (line 99), which shadows `window.confirm`. However, `handleDeleteOption` (line 307) and `handleDeleteUser` (line 395) call `confirm(...)` with a string argument — expecting `window.confirm`'s synchronous boolean return. Since `confirm` is now the async hook, it returns a **Promise** (always truthy), meaning **the confirmation is always bypassed** and deletes proceed without user consent.

**Fix:** Convert these handlers to use the async confirm pattern:
```js
const confirmed = await confirm({ title: 'Delete?', message: 'Are you sure?' });
if (!confirmed) return;
```

---

### C6 — Orphaned Database Records on Registration Failure
**Files:** [AuthView.jsx:95–108](file:///var/home/jmayer/Dev/Dahoot/src/components/AuthView.jsx#L95-L108), [TeacherDashboard.jsx:428–440](file:///var/home/jmayer/Dev/Dahoot/src/components/TeacherDashboard.jsx#L428-L440)
**Category:** Bug

Registration creates a `dahoot_user_info` record **first**, then creates the `users` record. If user creation fails (e.g., duplicate email), the `dahoot_user_info` record is orphaned with no cleanup.

**Fix:** Reverse the order (create user first, then info record), or wrap in try/catch and delete the orphaned record on failure.

---

### C7 — Invite Code Validation Logic Bug
**File:** [AuthView.jsx:69](file:///var/home/jmayer/Dev/Dahoot/src/components/AuthView.jsx#L69)
**Category:** Bug

The check `!inviteCode.trim().toLocaleUpperCase()` is intended to reject empty invite codes. But `toLocaleUpperCase()` returns a string which is always truthy for non-empty input, so the negation `!` is `false` and the error never triggers — **or** if the logic is inverted, the error always triggers even with valid input.

**Fix:** Change to `if (!inviteCode.trim())`.

---

## 🟠 High Issues (✅ Addressed)

### H1 — Correct Answers Exposed to Players
**File:** [SelectionView.jsx:180–220](file:///var/home/jmayer/Dev/Dahoot/src/components/SelectionView.jsx#L180-L220)
**Category:** Security

When a host starts a game, the **entire quiz including correct answers** is embedded in the `quiz_data` field of the `game_sessions` record. Players can read this record via the PocketBase API (especially with open collection rules) or inspect network requests.

**Fix:** Strip correct answers from `quiz_data` before saving to the game session, or store questions server-side and expose only the current question (without the answer) via a PocketBase hook.

---

### H2 — Missing Imports Cause Runtime Crashes
**Files:** [HostFinished.jsx:3](file:///var/home/jmayer/Dev/Dahoot/src/components/HostFinished.jsx#L3) (missing `splitBracketTokens`, `getBracketInner`), [HostQuestion.jsx:4](file:///var/home/jmayer/Dev/Dahoot/src/components/HostQuestion.jsx#L4) (missing `getCurlyInner`)
**Category:** Bug

- `HostFinished.jsx` uses `splitBracketTokens` and `getBracketInner` (line 114, 122) but doesn't import them → **crash when rendering DRAG_DROP questions on the finished screen**
- `HostQuestion.jsx` uses `getCurlyInner` (line 62) but doesn't import it → **crash when rendering DROP_DOWN questions on the host screen**

**Fix:** Add the missing imports from `'../utils/blankParsing'`.

---

### H3 — Realtime Subscription Memory Leaks
**Files:** [useHostGame.js:55–95](file:///var/home/jmayer/Dev/Dahoot/src/hooks/useHostGame.js#L55-L95), [usePlayerGame.js:60–100](file:///var/home/jmayer/Dev/Dahoot/src/hooks/usePlayerGame.js#L60-L100), [useMarathonHost.js:279–299](file:///var/home/jmayer/Dev/Dahoot/src/hooks/useMarathonHost.js#L279-L299), [useMarathonPlayer.js:263–288](file:///var/home/jmayer/Dev/Dahoot/src/hooks/useMarathonPlayer.js#L263-L288)
**Category:** Bug

PocketBase's `.subscribe()` returns a Promise. If the component unmounts before it resolves, the cleanup runs with `unsubscribeFn` still `undefined`, leaking the subscription. Additionally, `useMarathonHost` and `useMarathonPlayer` use a `.then(unsub => ...)` pattern that has the same race condition.

**Fix:** Use `pb.collection().unsubscribe()` consistently, or use a cancellation flag:
```js
useEffect(() => {
  let cancelled = false;
  let unsub;
  pb.collection('...').subscribe('*', callback).then(fn => {
    if (cancelled) { fn(); return; }
    unsub = fn;
  });
  return () => { cancelled = true; unsub?.(); };
}, []);
```

---

### H4 — Auth Cleared on Transient Network Errors
**File:** [App.jsx:82–98](file:///var/home/jmayer/Dev/Dahoot/src/App.jsx#L82-L98)
**Category:** Bug

`checkAuth` calls `pb.collection('users').authRefresh()`. On failure it clears auth state — but this catches **all** errors including network timeouts and DNS failures. A momentary network blip logs the user out.

**Fix:** Differentiate between auth errors (401/403 → clear) and network errors (preserve session):
```js
catch (err) {
  if (err?.status === 401 || err?.status === 403) {
    pb.authStore.clear();
    setUser(null);
  }
}
```

---

### H5 — Audio Memory Leak
**File:** [GameMusicController.jsx:25–85](file:///var/home/jmayer/Dev/Dahoot/src/components/GameMusicController.jsx#L25-L85)
**Category:** Bug

`new Audio(url)` objects are created inside the component body, so they are re-created on every render. Each instance downloads the audio file, leaking `HTMLAudioElement` objects.

**Fix:** Create Audio objects inside `useRef` and clean up on unmount.

---

### H6 — Stale Closure in Player Subscription
**File:** [usePlayerGame.js:83](file:///var/home/jmayer/Dev/Dahoot/src/hooks/usePlayerGame.js#L83)
**Category:** Bug

The subscription callback references `playerRoom.status` to detect state transitions. This closure captures the value from the initial subscription setup, so it becomes stale as the room status changes. This can fail to reset player choices on new questions.

**Fix:** Use a ref to track previous status:
```js
const prevStatusRef = useRef(playerRoom?.status);
// In callback:
if (updatedRoom.status === 'QUESTION' && prevStatusRef.current !== 'QUESTION') { ... }
prevStatusRef.current = updatedRoom.status;
```

---

### H7 — `hostShowLeaderboard` Race Condition
**Files:** [useHostGame.js:114–117](file:///var/home/jmayer/Dev/Dahoot/src/hooks/useHostGame.js#L114-L117), [useHostGame.js:124–135](file:///var/home/jmayer/Dev/Dahoot/src/hooks/useHostGame.js#L124-L135)
**Category:** Bug

Both the timer-expiry effect and the all-players-answered effect can call `hostShowLeaderboard()` simultaneously, causing double PocketBase updates and UI flicker.

**Fix:** Add a `isTransitioning` ref guard to prevent duplicate calls.

---

### H8 — CSV Injection in Results Export
**File:** [HostFinished.jsx:150–200](file:///var/home/jmayer/Dev/Dahoot/src/components/HostFinished.jsx#L150-L200)
**Category:** Security

CSV values are not escaped. A player name like `=HYPERLINK("http://evil.com","Click")` could inject spreadsheet formulas when a teacher opens the CSV in Excel/Google Sheets.

**Fix:** Escape CSV values — prefix formula-trigger characters (`=`, `+`, `-`, `@`) with a single quote, wrap values containing commas/quotes in double-quotes.

---

### H9 — Invite Code Checked Client-Side
**File:** [AuthView.jsx:83–92](file:///var/home/jmayer/Dev/Dahoot/src/components/AuthView.jsx#L83-L92)
**Category:** Security

The invite code is fetched from PocketBase and compared client-side. An attacker can inspect the network response to see the correct code, or bypass the check entirely by calling the PocketBase user creation API directly (especially with open collection rules).

**Fix:** Move invite code verification to a server-side PocketBase hook.

---

### H10 — `vite.config.js` Loads ALL Env Vars
**File:** [vite.config.js:6](file:///var/home/jmayer/Dev/Dahoot/vite.config.js#L6)
**Category:** Security

`loadEnv(mode, process.cwd(), '')` uses an empty prefix, loading **all** env vars (including `POCKETBASE_ADMIN_PASSWORD`, `DEPLOY_SERVER_IP`, etc.) into scope. The `env` variable is then **never used**, so this is dead code that increases risk for zero benefit. Any accidental use in a `define` block would leak secrets into the client bundle.

**Fix:** Remove the unused `loadEnv` import and the `env` variable entirely.

---

### H11 — Null Dereference in Marathon Create
**File:** [MarathonView.jsx:95–145](file:///var/home/jmayer/Dev/Dahoot/src/components/MarathonView.jsx#L95-L145)
**Category:** Bug

`handleCreateMarathon` accesses `selectedQuiz.id` without null-checking. If no quiz is selected, it throws `TypeError`.

**Fix:** `if (!selectedQuiz) return;` at the top.

---

### H12 — Index-Based Keys for Reorderable List
**File:** [TeacherDashboard.jsx:600–650](file:///var/home/jmayer/Dev/Dahoot/src/components/TeacherDashboard.jsx#L600-L650)
**Category:** Bug

Drag-and-drop question reordering uses `key={index}`. React incorrectly reconciles components on reorder, causing inputs to show values from the wrong question.

**Fix:** Use `key={question.id}`.

---

## 🟡 Medium Issues (✅ Addressed)

| # | File | Cat | Issue | Fix |
|---|------|-----|-------|-----|
| M1 | [All hooks](file:///var/home/jmayer/Dev/Dahoot/src/hooks/useHostGame.js#L61) | Security | **PocketBase filter injection** — All filter queries use string interpolation (`` `game_id = "${gameId}"` ``). User-controlled values like `playerName`, `joinPin` could break out of filters. Found in **16+ locations** across all hooks and SelectionView/TeacherDashboard. | Use `pb.filter('field = {:val}', { val })` parameterized syntax |
| M2 | [useHostGame.js:193](file:///var/home/jmayer/Dev/Dahoot/src/hooks/useHostGame.js#L193) | Security | **Weak PIN generation** — `Math.floor(1000 + Math.random() * 9000)` gives only 9000 possible values. No uniqueness check. | Use `crypto.getRandomValues()`, 6+ digit PINs, uniqueness check |
| M3 | [App.jsx:130](file:///var/home/jmayer/Dev/Dahoot/src/App.jsx#L130) | Bug | `pb.authStore.record` can be `null` even with a token — downstream `user.id` will crash | Guard with `pb.authStore.isValid` |
| M4 | [useHostGame.js:180–200](file:///var/home/jmayer/Dev/Dahoot/src/hooks/useHostGame.js#L180-L200) | Bug | `parseFloat(participant.score)` returns `NaN` if score is `null` — score becomes `NaN` permanently | Default: `(parseFloat(score) \|\| 0) + points` |
| M5 | [usePlayerGame.js:195–220](file:///var/home/jmayer/Dev/Dahoot/src/hooks/usePlayerGame.js#L195-L220) | Bug | `responded_at` timestamp generated client-side — can be backdated for time bonus cheating | Generate server-side |
| M6 | [MarathonView.jsx:317](file:///var/home/jmayer/Dev/Dahoot/src/components/MarathonView.jsx#L317) | Bug | **CSS typo** — `rgba(16, 185, 129129, 0.08)` — invalid color value | Change to `rgba(16, 185, 129, 0.08)` |
| M7 | [MarathonView.jsx:294](file:///var/home/jmayer/Dev/Dahoot/src/components/MarathonView.jsx#L294), [PracticeView.jsx:246](file:///var/home/jmayer/Dev/Dahoot/src/components/PracticeView.jsx#L246) | Bug | **`bgClip` is not a valid React style property** — should be `backgroundClip`. Gradient text is invisible. | Replace `bgClip: 'text'` with `backgroundClip: 'text'` |
| M8 | [PracticeView.jsx:106](file:///var/home/jmayer/Dev/Dahoot/src/components/PracticeView.jsx#L106) | Bug | **Division by zero** — `Math.round((masteredCount / totalCount) * 100)` produces `NaN` when `totalCount` is 0 | Guard: `totalCount > 0 ? ... : 0` |
| M9 | [TeacherDashboard.jsx:1200–1250](file:///var/home/jmayer/Dev/Dahoot/src/components/TeacherDashboard.jsx#L1200-L1250) | Bug | Quiz import doesn't validate JSON structure — crashes on `importedData.questions.forEach()` if `questions` is missing | Add structural validation |
| M10 | [TeacherDashboard.jsx:205–264](file:///var/home/jmayer/Dev/Dahoot/src/components/TeacherDashboard.jsx#L205-L264) | Bug | useEffect async calls lack `isMounted` guard or `AbortController` — stale state updates on unmount | Add cancellation flags |
| M11 | [CookieConsent.jsx:9](file:///var/home/jmayer/Dev/Dahoot/src/components/CookieConsent.jsx#L9) | Bug | **State setter typo** — `setsetConsent` (double "set") | Rename to `setConsent` |
| M12 | [ConfirmModal.jsx:167–169](file:///var/home/jmayer/Dev/Dahoot/src/components/ConfirmModal.jsx#L167-L169) | Bug | `onConfirm()` then `onClose()` — if `onConfirm` unmounts the parent, `onClose` causes setState on unmounted component | Let caller handle closing |
| M13 | [markdownParser.js:63–71](file:///var/home/jmayer/Dev/Dahoot/src/utils/markdownParser.js#L63-L71) | Bug | Inline-code regex is greedy — matches across backtick pairs | Use non-greedy match |
| M14 | [markdownParser.js:167–172](file:///var/home/jmayer/Dev/Dahoot/src/utils/markdownParser.js#L167-L172) | Bug | CATEGORIZE `split(':')` splits on ALL colons — items with colons in names are misparsed | Use `lastIndexOf(':')` + `substring` |
| M15 | [QuestionInteraction.jsx:150–180](file:///var/home/jmayer/Dev/Dahoot/src/components/QuestionInteraction.jsx#L150-L180) | Bug | Fill-in-the-blank matching breaks on regex special chars in answers | Escape special characters |
| M16 | [HostQuestion.jsx:80–110](file:///var/home/jmayer/Dev/Dahoot/src/components/HostQuestion.jsx#L80-L110) | Bug | `setInterval(1000)` timer drifts 1-2s over a 30s question | Anchor to `Date.now()` |
| M17 | [useMarathonPlayer.js:200–225](file:///var/home/jmayer/Dev/Dahoot/src/hooks/useMarathonPlayer.js#L200-L225) | Bug | Timer uses `Date.now()` — affected by system clock changes | Use `performance.now()` |
| M18 | [useTeacherDashboard.js:350–380](file:///var/home/jmayer/Dev/Dahoot/src/hooks/useTeacherDashboard.js#L350-L380) | Bug | Bulk delete iterates sequentially — partial failure skips remaining | Use `Promise.allSettled()` |
| M19 | [SelectionView.jsx:300–340](file:///var/home/jmayer/Dev/Dahoot/src/components/SelectionView.jsx#L300-L340) | Perf | QR code re-generated on every render | Wrap in `useMemo` |
| M20 | [Hooks (4 files)](file:///var/home/jmayer/Dev/Dahoot/src/hooks/useMarathonHost.js#L89) | Bug | **Biased shuffle** — `.sort(() => 0.5 - Math.random())` in 4 locations. Fisher-Yates in `useHostGame` is correct. | Use Fisher-Yates consistently |
| M21 | [ConfirmModal.jsx](file:///var/home/jmayer/Dev/Dahoot/src/components/ConfirmModal.jsx), [CookieConsent.jsx](file:///var/home/jmayer/Dev/Dahoot/src/components/CookieConsent.jsx), [TeacherDashboard.jsx](file:///var/home/jmayer/Dev/Dahoot/src/components/TeacherDashboard.jsx#L470-L948) | A11y | **Modals lack focus trapping**, `role="dialog"`, `aria-modal`, Escape key handling | Use native `<dialog>` or focus trap library |
| M22 | [AuthView.jsx:150–190](file:///var/home/jmayer/Dev/Dahoot/src/components/AuthView.jsx#L150-L190) | Bug | Submit button not disabled during async auth — double-submit possible | Add `disabled={isLoading}` |
| M23 | [GameMusicController.jsx:130–160](file:///var/home/jmayer/Dev/Dahoot/src/components/GameMusicController.jsx#L130-L160) | Bug | Autoplay blocked on mobile — error silently swallowed | Show "tap to enable audio" prompt |
| M24 | [scripts/deploy.js:295–342](file:///var/home/jmayer/Dev/Dahoot/scripts/deploy.js#L295-L342) | Security | `execSync` interpolates env vars — command injection risk | Use `execFileSync` or `spawn` |
| M25 | [db-setup.js:514](file:///var/home/jmayer/Dev/Dahoot/scripts/db-setup.js#L514) | Security | Hardcoded default admin password `'changeme'` | Read from env var or generate random |
| M26 | [useMarathonPlayer.js:176–184](file:///var/home/jmayer/Dev/Dahoot/src/hooks/useMarathonPlayer.js#L176-L184) | Perf | `question_history` array grows unbounded per marathon session | Cap at max length |
| M27 | [main.jsx](file:///var/home/jmayer/Dev/Dahoot/src/main.jsx) | Best Practice | No React Error Boundary — uncaught errors crash entire app to white screen | Add Error Boundary with retry UI |

---

## 🟢 Low Issues

| # | File | Cat | Issue |
|---|------|-----|-------|
| L1 | [index.html](file:///var/home/jmayer/Dev/Dahoot/index.html) | SEO | Missing `<meta name="description">` and OG tags |
| L2 | [shuffle.js:26](file:///var/home/jmayer/Dev/Dahoot/src/utils/shuffle.js#L26) | Bug | `state / 0xffffffff` → divide by `0x100000000` to avoid off-by-one |
| L3 | [blankParsing.js](file:///var/home/jmayer/Dev/Dahoot/src/utils/blankParsing.js) | Bug | Triple-underscore delimiter could match non-blank content |
| L4 | [PlayerView.jsx:17](file:///var/home/jmayer/Dev/Dahoot/src/components/PlayerView.jsx#L17) | Bug | Unused `disconnectSession` prop destructured |
| L5 | [PlayerFeedback.jsx:175](file:///var/home/jmayer/Dev/Dahoot/src/components/PlayerFeedback.jsx#L175) | Bug | Option label array `['A','B','C','D'][idx]` — undefined for 5+ options |
| L6 | [PlayerFeedback.jsx:265–286](file:///var/home/jmayer/Dev/Dahoot/src/components/PlayerFeedback.jsx#L265-L286) | A11y | Color-only feedback — inaccessible to color-blind users |
| L7 | [HostLeaderboard.jsx:50–80](file:///var/home/jmayer/Dev/Dahoot/src/components/HostLeaderboard.jsx#L50-L80) | Bug | Unstable sort — same-score players swap positions between renders |
| L8 | [HostFinished.jsx:250](file:///var/home/jmayer/Dev/Dahoot/src/components/HostFinished.jsx#L250) | Bug | Confetti `setInterval` not cleaned up |
| L9 | [HostFinished.jsx:152](file:///var/home/jmayer/Dev/Dahoot/src/components/HostFinished.jsx#L152) | Bug | Dead `parts` variable — incomplete refactor |
| L10 | [AuthView.jsx:115–117](file:///var/home/jmayer/Dev/Dahoot/src/components/AuthView.jsx#L115-L117) | Bug | `setTimeout` not cleaned up on unmount |
| L11 | [SchoolFooter.jsx:30–35](file:///var/home/jmayer/Dev/Dahoot/src/components/SchoolFooter.jsx#L30-L35) | Security | `target="_blank"` missing `rel="noopener noreferrer"` |
| L12 | [useAdSense.js:10–35](file:///var/home/jmayer/Dev/Dahoot/src/hooks/useAdSense.js#L10-L35) | Bug | Script tag duplicated on remount; removal doesn't undo AdSense init |
| L13 | [useAdSense.js:29](file:///var/home/jmayer/Dev/Dahoot/src/hooks/useAdSense.js#L29) | Best Practice | Hardcoded AdSense publisher ID — use env var |
| L14 | [.gitignore](file:///var/home/jmayer/Dev/Dahoot/.gitignore) | Best Practice | `dist/` not in `.gitignore` |
| L15 | [App.jsx:397–405](file:///var/home/jmayer/Dev/Dahoot/src/App.jsx#L397-L405) | Bug | Fallback "Synchronizing..." view has no timeout or back button — user can get stuck |
| L16 | [Multiple files](file:///var/home/jmayer/Dev/Dahoot/src/components/SelectionView.jsx#L634-L639) | Best Practice | `onMouseEnter`/`onMouseLeave` DOM style manipulation — use CSS `:hover` |
| L17 | [Multiple components](file:///var/home/jmayer/Dev/Dahoot/src/components/HostQuestion.jsx#L2) | Best Practice | Unused `OPTION_SHAPES` import in 3 files |
| L18 | [GameMusicController.jsx](file:///var/home/jmayer/Dev/Dahoot/src/components/GameMusicController.jsx) | A11y | Audio doesn't respect `prefers-reduced-motion`; collapsed button has no accessible text |
| L19 | [Scripts (4 files)](file:///var/home/jmayer/Dev/Dahoot/scripts/db-setup.js#L12-L27) | Best Practice | Custom `.env` parser duplicated across scripts — use `dotenv` |
| L20 | [db-install.js:47–77](file:///var/home/jmayer/Dev/Dahoot/scripts/db-install.js#L47-L77) | Bug | HTTP redirect follower has no depth limit — potential infinite recursion |

---

## Recommended Priority

> [!CAUTION]
> **Fix immediately — active security vulnerabilities:**
> 1. **C1** — Lock down PocketBase collection rules (currently world-writable)
> 2. **C3** — Add authentication to `/api/generate-questions` (open AI cost proxy)
> 3. **C2** — Implement server-side answer validation
> 4. **C4** — Add DOMPurify to sanitize all `dangerouslySetInnerHTML` usage
> 5. **H1** — Stop exposing correct answers in game session data
> 6. **M1** — Use parameterized PocketBase filters (injection risk in 16+ locations)

> [!WARNING]
> **Fix soon — causes user-visible bugs:**
> 7. **C5** — Fix shadowed `confirm()` — delete confirmations silently bypassed
> 8. **C7** — Fix invite code validation logic
> 9. **H2** — Fix missing imports causing runtime crashes (HostFinished, HostQuestion)
> 10. **H3** — Fix subscription memory leaks in all hooks
> 11. **H4** — Don't clear auth on network errors
> 12. **M6/M7** — Fix CSS typo and `bgClip` → `backgroundClip` (invisible UI elements)
> 13. **M4** — Fix NaN score bug
> 14. **M8** — Guard against division by zero in PracticeView

---

## Architecture Observations

| Concern | Details |
|---------|---------|
| **Client-side trust model** | The single biggest architectural issue. All game logic (scoring, answer validation, timestamps) runs client-side. This must move server-side for any competitive use. |
| **Component size** | [TeacherDashboard.jsx](file:///var/home/jmayer/Dev/Dahoot/src/components/TeacherDashboard.jsx) is **3,600+ lines** with 45+ `useState` hooks. Split into QuizList, QuizEditor, QuestionEditor, etc. |
| **Massive prop drilling** | `App.jsx` passes **65+ individual props** to TeacherDashboard. Use React Context or move hooks into the view components. |
| **Duplicated logic** | Answer validation logic is copy-pasted across 4 hooks. Extract into `utils/validateAnswer.js`. |
| **No error boundary** | Any uncaught throw crashes the entire app to a white screen. Add a React Error Boundary. |
| **No routing** | Views switched via state in App.jsx. A router would give URL navigation, deep linking, and browser back/forward. |
| **`alert()` usage** | 8+ `alert()` calls block the JS event loop and break real-time subscriptions. Use the existing `useConfirm` hook or toast notifications. |
