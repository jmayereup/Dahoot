/**
 * Centralized question schema helpers.
 *
 * The single source of truth for the question data shape used throughout
 * the app. Every component, hook, and utility that needs to read or score
 * a question should go through these helpers.
 *
 * New schema (LLM-friendly, no index tracking):
 *   MULTIPLE_CHOICE: { options: { correct_answer: string, distractors: string[] } }
 *   SORTING:         { options: { correct_sequence: string[] } }
 *   DRAG_DROP:       { options: { sentence, answers_in_order: string[], distractors: string[] } }
 *   DROP_DOWN:       { options: { sentence, dropdowns: [{ correct_answer, distractors: string[] }] } }
 *   CATEGORIZE:      { options: { categories: string[], items: [{name, category}] } }
 *
 * The helpers transparently migrate any legacy shape on read, so existing
 * PocketBase rows continue to work until the migration script runs.
 */

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function isOldMultipleChoice(q) {
  return Array.isArray(q.options) && typeof q.correct_option_index === 'number';
}

function isOldSorting(q) {
  return Array.isArray(q.options);
}

function isOldDragDrop(q) {
  return q.options && typeof q.options === 'object' && !Array.isArray(q.options) &&
    Array.isArray(q.options.correct) && Array.isArray(q.options.choices);
}

function isOldDropDown(q) {
  return q.options && typeof q.options === 'object' && !Array.isArray(q.options) &&
    Array.isArray(q.options.dropdowns) && q.options.dropdowns.some(d => typeof d.correct === 'string');
}

export function isNewMultipleChoice(q) {
  return q.options && typeof q.options === 'object' && !Array.isArray(q.options) &&
    typeof q.options.correct_answer === 'string' && Array.isArray(q.options.distractors);
}

export function isNewSorting(q) {
  return q.options && typeof q.options === 'object' && !Array.isArray(q.options) &&
    Array.isArray(q.options.correct_sequence);
}

export function isNewDragDrop(q) {
  return q.options && typeof q.options === 'object' && !Array.isArray(q.options) &&
    Array.isArray(q.options.answers_in_order) && Array.isArray(q.options.distractors);
}

export function isNewDropDown(q) {
  return q.options && typeof q.options === 'object' && !Array.isArray(q.options) &&
    Array.isArray(q.options.dropdowns) && q.options.dropdowns.every(d => typeof d.correct_answer === 'string');
}

/**
 * Returns a normalized question object in the new schema. If the question
 * is already in the new schema, it's returned as-is (with a shallow clone
 * to avoid mutating the input). Legacy shapes are converted on the fly.
 */
export function normalizeQuestion(q) {
  if (!q || typeof q !== 'object') return q;

  const type = q.type || 'MULTIPLE_CHOICE';

  if (type === 'MULTIPLE_CHOICE') {
    if (isNewMultipleChoice(q)) return { ...q, options: { ...q.options, distractors: [...q.options.distractors] } };
    if (isOldMultipleChoice(q)) {
      const opts = q.options;
      const idx = q.correct_option_index || 0;
      return {
        ...q,
        options: {
          correct_answer: opts[idx] || '',
          distractors: opts.filter((_, i) => i !== idx)
        }
      };
    }
  }

  if (type === 'SORTING') {
    if (isNewSorting(q)) return { ...q, options: { ...q.options, correct_sequence: [...q.options.correct_sequence] } };
    if (isOldSorting(q)) {
      return { ...q, options: { correct_sequence: [...q.options] } };
    }
  }

  if (type === 'DRAG_DROP') {
    if (isNewDragDrop(q)) {
      return {
        ...q,
        options: {
          ...q.options,
          answers_in_order: [...q.options.answers_in_order],
          distractors: [...q.options.distractors]
        }
      };
    }
    if (isOldDragDrop(q)) {
      const correctArr = q.options.correct || [];
      const choices = q.options.choices || [];
      const used = new Set(correctArr);
      const distractors = choices.filter(c => !used.has(c));
      return {
        ...q,
        options: {
          sentence: q.options.sentence || '',
          answers_in_order: [...correctArr],
          distractors
        }
      };
    }
  }

  if (type === 'DROP_DOWN') {
    if (isNewDropDown(q)) {
      return {
        ...q,
        options: {
          ...q.options,
          dropdowns: q.options.dropdowns.map(d => ({ ...d, distractors: [...(d.distractors || [])] }))
        }
      };
    }
    if (isOldDropDown(q)) {
      return {
        ...q,
        options: {
          sentence: q.options.sentence || '',
          dropdowns: q.options.dropdowns.map(d => {
            const choices = Array.isArray(d.choices) ? d.choices : [];
            const correct = d.correct || '';
            return {
              correct_answer: correct,
              distractors: choices.filter(c => c !== correct)
            };
          })
        }
      };
    }
  }

  if (type === 'CATEGORIZE') {
    return q;
  }

  return q;
}

/**
 * Returns the full merged MC option list as a plain string array,
 * in canonical order: [correct_answer, ...distractors].
 */
export function getMcOptions(q) {
  const n = normalizeQuestion(q);
  if (!n || !n.options || Array.isArray(n.options)) return [];
  return [n.options.correct_answer, ...(n.options.distractors || [])];
}

/**
 * Returns the correct answer text for an MC question.
 */
export function getMcCorrectAnswer(q) {
  const n = normalizeQuestion(q);
  if (!n || !n.options || Array.isArray(n.options)) return '';
  return n.options.correct_answer || '';
}

/**
 * Returns the full DRAG_DROP choice pool (answers + distractors).
 */
export function getDragDropChoices(q) {
  const n = normalizeQuestion(q);
  if (!n || !n.options || Array.isArray(n.options)) return [];
  return [...(n.options.answers_in_order || []), ...(n.options.distractors || [])];
}

/**
 * Returns the correct answers for DRAG_DROP in blank order.
 */
export function getDragDropCorrect(q) {
  const n = normalizeQuestion(q);
  if (!n || !n.options || Array.isArray(n.options)) return [];
  return n.options.answers_in_order || [];
}

/**
 * Returns the choices for a single dropdown (correct + distractors).
 */
export function getDropDownChoices(q, idx) {
  const n = normalizeQuestion(q);
  const dd = n?.options?.dropdowns?.[idx];
  if (!dd) return [];
  return [dd.correct_answer, ...(dd.distractors || [])];
}

/**
 * Returns the correct answer for a single dropdown.
 */
export function getDropDownCorrect(q, idx) {
  const n = normalizeQuestion(q);
  return n?.options?.dropdowns?.[idx]?.correct_answer || '';
}

/**
 * Returns the SORTING correct sequence.
 */
export function getSortingCorrect(q) {
  const n = normalizeQuestion(q);
  return n?.options?.correct_sequence || [];
}

/**
 * Detect if a question is in the DRAG_DROP "scramble sentence" mode
 * (sentence is just [blank0] [blank1] ... with no surrounding text).
 */
export function isScrambleSentence(q) {
  const n = normalizeQuestion(q);
  const s = n?.options?.sentence;
  if (!s) return false;
  return !s.replace(/\[blank\d+\]/g, '').trim();
}

/**
 * Determines if a player's answer is correct, regardless of which schema
 * the question is in. Accepts the player's answer in the same shape used
 * by the UI:
 *   MC:        { originalIdx, item }   |   string   |   number (legacy)
 *   SORTING:   string[] (in player's chosen order)
 *   DRAG_DROP: string[] (per blank, in order)
 *   DROP_DOWN: string[] (per dropdown, in order)
 *   CATEGORIZE: { [itemName]: category }
 */
export function isAnswerCorrect(question, userAnswer) {
  if (!question) return false;
  const type = question.type || 'MULTIPLE_CHOICE';
  const n = normalizeQuestion(question);

  if (type === 'MULTIPLE_CHOICE') {
    const correct = n.options?.correct_answer;
    if (typeof userAnswer === 'string') return userAnswer === correct;
    if (userAnswer && typeof userAnswer === 'object' && 'item' in userAnswer) {
      return userAnswer.item === correct;
    }
    if (typeof userAnswer === 'number') {
      const opts = getMcOptions(n);
      return opts[userAnswer] === correct;
    }
    return false;
  }

  if (type === 'SORTING') {
    const seq = n.options?.correct_sequence || [];
    return Array.isArray(userAnswer) &&
      userAnswer.length === seq.length &&
      userAnswer.every((val, i) => val === seq[i]);
  }

  if (type === 'DRAG_DROP') {
    const correct = n.options?.answers_in_order || [];
    return Array.isArray(userAnswer) &&
      userAnswer.length === correct.length &&
      userAnswer.every((val, i) => val === correct[i]);
  }

  if (type === 'DROP_DOWN') {
    const dropdowns = n.options?.dropdowns || [];
    return Array.isArray(userAnswer) &&
      userAnswer.length === dropdowns.length &&
      userAnswer.every((val, i) => val === dropdowns[i]?.correct_answer);
  }

  if (type === 'CATEGORIZE') {
    const correctItems = n.options?.items || [];
    return typeof userAnswer === 'object' && userAnswer !== null &&
      correctItems.every(item => userAnswer[item.name] === item.category);
  }

  return false;
}

/**
 * Strips fields that don't belong in the new schema (e.g. legacy
 * `correct_option_index` for non-MC types) when writing to PocketBase.
 * Returns a new object; does not mutate the input.
 */
export function denormalizeForSave(question) {
  if (!question || typeof question !== 'object') return question;
  const out = { ...question };
  const type = out.type || 'MULTIPLE_CHOICE';

  if (type === 'MULTIPLE_CHOICE') {
    delete out.correct_option_index;
  } else {
    delete out.correct_option_index;
  }
  return out;
}
