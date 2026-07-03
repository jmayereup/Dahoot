# Dahoot Bulk Import Formatting Guide

This guide explains how to format your quiz questions in Markdown format so they can be parsed and imported into Dahoot all at once.

---

## Supported Question Types

Each question block **must** start with a heading designating its type (e.g. `# MULTIPLE_CHOICE`), followed by the question prompt, option/configuration lines, and answers.

---

### 1. Multiple Choice
*   **Header:** `# MULTIPLE_CHOICE`
*   **Options:** 4 bullet points starting with `-`.
*   **Correct Answer:** Prepend an asterisk (`*`) to the correct option.

**Format Example:**
```markdown
# MULTIPLE_CHOICE
Which programming language was created by Brendan Eich in 1995?
- Java
- *JavaScript
- Python
- C++
```

---

### 2. Sorting Order
*   **Header:** `# SORTING`
*   **Options:** 4 ordered lines starting with `1.`, `2.`, `3.`, `4.` representing the **correct sorted order**.
*   **Note:** The game shuffles the elements automatically during play.

**Format Example:**
```markdown
# SORTING
Sort these tech stack layers from front-end to back-end (client-side at the top).
1. UI CSS / HTML
2. React Client Logic
3. Express API Router
4. PostgreSQL Database
```

---

### 3. Drag & Drop (Blanks)
*   **Header:** `# DRAG_DROP`
*   **Sentence:** Preceded by `Sentence: ` containing placeholders `[blank0]`, `[blank1]`, etc.
*   **Choices:** 4 bullet points starting with `-`. Correct choices must match the order of the blanks and be prefixed with `*`. Other choices act as distractors.

**Format Example:**
```markdown
# DRAG_DROP
Complete the sentence about React hooks.
Sentence: In React, we use the [blank0] hook to manage state, and [blank1] to perform side effects.
- *useState
- *useEffect
- useContext
- useRef
```

---

### 4. Categorization Groups
*   **Header:** `# CATEGORIZE`
*   **Categories:** Preceded by `Categories: ` followed by a comma-separated list of categories.
*   **Items:** Preceded by an `Items:` header, followed by bullet points mapping each item to its category in the format `- ItemName: CategoryName`.

**Format Example:**
```markdown
# CATEGORIZE
Classify the following technologies.
Categories: Languages, Frameworks
Items:
- JavaScript: Languages
- React: Frameworks
- Python: Languages
- Next.js: Frameworks
- SQL: Languages
- Express: Frameworks
```

---

## AI Prompt & Gemini Gem

You can use our pre-configured [Dahoot Quiz Generator Gem](https://gemini.google.com/gem/18ZESHdzKuk0XOKvr8MkQ-WxJn-u8B1RP?usp=sharing) directly on Google Gemini.

Alternatively, copy and paste the prompt below into ChatGPT, Claude, or another AI tool to generate quizzes:

```text
You are the Dahoot Quiz Generator. Output ONLY raw Markdown questions matching the formats described below, with no conversational text:

# MULTIPLE_CHOICE
Question prompt here
- Incorrect Option 1
- *Correct Option (starts with - *)
- Incorrect Option 2
- Incorrect Option 3

# SORTING
Question prompt here
1. First Item (Correct Order)
2. Second Item (Correct Order)
3. Third Item (Correct Order)
4. Fourth Item (Correct Order)

[Generate questions now on the topic: INSERT_TOPIC]
```
