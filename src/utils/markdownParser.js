export function parseMarkdownQuestions(text) {
  const questions = [];
  const sections = text.split(/#\s+(MULTIPLE_CHOICE|SORTING|DRAG_DROP|DROP_DOWN|CATEGORIZE)/i);
  
  for (let i = 1; i < sections.length; i += 2) {
    const type = sections[i].toUpperCase();
    const content = sections[i + 1] || '';
    
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    
    let textPrompt = '';
    
    if (type === 'MULTIPLE_CHOICE') {
      const allOptions = [];
      
      for (const line of lines) {
        if (line.startsWith('-')) {
          let value = line.substring(1).trim();
          const isCorrect = value.startsWith('*');
          if (isCorrect) value = value.substring(1).trim();
          allOptions.push({ value, isCorrect });
        } else {
          if (!textPrompt) {
            textPrompt = line;
          } else {
            textPrompt += '\n' + line;
          }
        }
      }
      
      const correctEntry = allOptions.find(o => o.isCorrect);
      if (correctEntry) {
        const distractors = allOptions.filter(o => !o.isCorrect).map(o => o.value);
        questions.push({
          type,
          text: textPrompt.trim(),
          options: {
            correct_answer: correctEntry.value,
            distractors
          }
        });
      }
    } 
    
    else if (type === 'SORTING') {
      const correctSequence = [];
      
      for (const line of lines) {
        const sortingMatch = line.match(/^\d+\.\s*(.*)/);
        if (sortingMatch) {
          correctSequence.push(sortingMatch[1].trim());
        } else {
          if (!textPrompt) {
            textPrompt = line;
          } else {
            textPrompt += '\n' + line;
          }
        }
      }
      
      if (correctSequence.length > 0) {
        questions.push({
          type,
          text: textPrompt.trim(),
          options: { correct_sequence: correctSequence }
        });
      }
    } 
    
    else if (type === 'DRAG_DROP') {
      let sentence = '';
      const correctAnswers = [];
      const distractors = [];
      
      for (const line of lines) {
        if (line.toLowerCase().startsWith('sentence:')) {
          sentence = line.substring(9).trim();
        } else if (line.startsWith('-')) {
          let value = line.substring(1).trim();
          const isCorrect = value.startsWith('*');
          if (isCorrect) {
            value = value.substring(1).trim();
            correctAnswers.push(value);
          } else {
            distractors.push(value);
          }
        } else {
          if (!textPrompt) {
            textPrompt = line;
          } else {
            textPrompt += '\n' + line;
          }
        }
      }
      
      if (sentence) {
        questions.push({
          type,
          text: textPrompt.trim(),
          options: {
            sentence,
            answers_in_order: correctAnswers,
            distractors
          }
        });
      }
    } 
    
    else if (type === 'DROP_DOWN') {
      let sentence = '';
      const dropdowns = [];
      let currentDropdown = null;
      
      for (const line of lines) {
        if (line.toLowerCase().startsWith('sentence:')) {
          sentence = line.substring(9).trim();
        } else if (line.toLowerCase().startsWith('dropdown')) {
          if (currentDropdown) {
            dropdowns.push(currentDropdown);
          }
          currentDropdown = { correct_answer: '', distractors: [] };
        } else if (line.startsWith('-') && currentDropdown) {
          let value = line.substring(1).trim();
          const isCorrect = value.startsWith('*');
          if (isCorrect) {
            value = value.substring(1).trim();
            currentDropdown.correct_answer = value;
          } else {
            currentDropdown.distractors.push(value);
          }
        } else {
          if (!textPrompt) {
            textPrompt = line;
          } else {
            textPrompt += '\n' + line;
          }
        }
      }
      
      if (currentDropdown) {
        dropdowns.push(currentDropdown);
      }
      
      if (sentence) {
        questions.push({
          type,
          text: textPrompt.trim(),
          options: { sentence, dropdowns }
        });
      }
    } 
    
    else if (type === 'CATEGORIZE') {
      let categories = [];
      const items = [];
      
      for (const line of lines) {
        if (line.toLowerCase().startsWith('categories:')) {
          categories = line.substring(11).split(',').map(c => c.trim()).filter(Boolean);
        } else if (line.startsWith('-')) {
          const content = line.substring(1);
          const lastColonIndex = content.lastIndexOf(':');
          if (lastColonIndex !== -1) {
            items.push({
              name: content.substring(0, lastColonIndex).trim(),
              category: content.substring(lastColonIndex + 1).trim()
            });
          }
        } else if (line.toLowerCase().startsWith('items:')) {
          // ignore items header
        } else {
          if (!textPrompt) {
            textPrompt = line;
          } else {
            textPrompt += '\n' + line;
          }
        }
      }
      
      questions.push({
        type,
        text: textPrompt.trim(),
        options: { categories, items }
      });
    }
  }
  
  return questions;
}

export function compileQuestionsToMarkdown(questions) {
  if (!Array.isArray(questions)) return '';

  return questions.map(q => {
    let output = `# ${q.type}\n${q.text}\n`;
    
    if (q.type === 'MULTIPLE_CHOICE') {
      const opts = q.options && !Array.isArray(q.options) ? q.options : null;
      if (opts) {
        output += `- *${opts.correct_answer}\n`;
        (opts.distractors || []).forEach(opt => { output += `- ${opt}\n`; });
      }
    } 
    
    else if (q.type === 'SORTING') {
      const opts = q.options && !Array.isArray(q.options) ? q.options : null;
      const seq = opts?.correct_sequence || (Array.isArray(q.options) ? q.options : []);
      seq.forEach((opt, idx) => {
        output += `${idx + 1}. ${opt}\n`;
      });
    } 
    
    else if (q.type === 'DRAG_DROP') {
      const opts = q.options || {};
      const sentence = opts.sentence || '';
      const answers = opts.answers_in_order || opts.correct || [];
      const distractors = opts.distractors || [];
      
      output += `sentence: ${sentence}\n`;
      answers.forEach(word => { output += `- *${word}\n`; });
      distractors.forEach(word => { output += `- ${word}\n`; });
    } 
    
    else if (q.type === 'DROP_DOWN') {
      const opts = q.options || {};
      const sentence = opts.sentence || '';
      const dropdowns = Array.isArray(opts.dropdowns) ? opts.dropdowns : [];
      
      output += `sentence: ${sentence}\n`;
      dropdowns.forEach(dd => {
        output += `dropdown\n`;
        if (dd.correct_answer) output += `- *${dd.correct_answer}\n`;
        else if (dd.correct) output += `- *${dd.correct}\n`;
        (dd.distractors || []).forEach(d => { output += `- ${d}\n`; });
        if (dd.choices && Array.isArray(dd.choices)) {
          dd.choices.forEach(c => {
            if (c !== dd.correct_answer && c !== dd.correct && !(dd.distractors || []).includes(c)) {
              output += `- ${c}\n`;
            }
          });
        }
      });
    } 
    
    else if (q.type === 'CATEGORIZE') {
      const opts = q.options || {};
      const categories = Array.isArray(opts.categories) ? opts.categories : [];
      const items = Array.isArray(opts.items) ? opts.items : [];
      
      output += `categories: ${categories.join(', ')}\n`;
      items.forEach(item => {
        output += `- ${item.name}: ${item.category}\n`;
      });
    }
    
    return output;
  }).join('\n');
}
