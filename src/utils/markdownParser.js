export function parseMarkdownQuestions(text) {
  const questions = [];
  const sections = text.split(/#\s+(MULTIPLE_CHOICE|SORTING|DRAG_DROP|DROP_DOWN|CATEGORIZE)/i);
  
  for (let i = 1; i < sections.length; i += 2) {
    const type = sections[i].toUpperCase();
    const content = sections[i + 1] || '';
    
    // Parse question lines
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    
    let textPrompt = '';
    
    if (type === 'MULTIPLE_CHOICE') {
      const optionLines = [];
      let correctIdx = 0;
      
      for (const line of lines) {
        if (line.startsWith('-')) {
          let value = line.substring(1).trim();
          if (value.startsWith('*')) {
            correctIdx = optionLines.length;
            value = value.substring(1).trim();
          }
          optionLines.push(value);
        } else {
          if (!textPrompt) {
            textPrompt = line;
          } else {
            textPrompt += '\n' + line;
          }
        }
      }
      
      // Pad to exactly 4 options
      while (optionLines.length < 4) optionLines.push('');
      
      questions.push({
        type,
        text: textPrompt.trim(),
        options: optionLines.slice(0, 4),
        correct_option_index: correctIdx
      });
    } 
    
    else if (type === 'SORTING') {
      const optionLines = [];
      
      for (const line of lines) {
        const sortingMatch = line.match(/^\d+\.\s*(.*)/);
        if (sortingMatch) {
          optionLines.push(sortingMatch[1].trim());
        } else {
          if (!textPrompt) {
            textPrompt = line;
          } else {
            textPrompt += '\n' + line;
          }
        }
      }
      
      while (optionLines.length < 4) optionLines.push('');
      
      questions.push({
        type,
        text: textPrompt.trim(),
        options: optionLines.slice(0, 4),
        correct_option_index: 0
      });
    } 
    
    else if (type === 'DRAG_DROP') {
      let sentence = '';
      const choices = [];
      const correct = [];
      
      for (const line of lines) {
        if (line.toLowerCase().startsWith('sentence:')) {
          sentence = line.substring(9).trim();
        } else if (line.startsWith('-')) {
          let value = line.substring(1).trim();
          const isCorrect = value.startsWith('*');
          if (isCorrect) {
            value = value.substring(1).trim();
            correct.push(value);
          }
          choices.push(value);
        } else if (line.toLowerCase().startsWith('choices:')) {
          // ignore choices header
        } else {
          if (!textPrompt) {
            textPrompt = line;
          } else {
            textPrompt += '\n' + line;
          }
        }
      }
      
      while (choices.length < 4) choices.push('');
      
      questions.push({
        type,
        text: textPrompt.trim(),
        options: {
          sentence,
          choices: choices.slice(0, 4),
          correct
        },
        correct_option_index: 0
      });
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
          currentDropdown = { choices: [], correct: '' };
        } else if (line.startsWith('-') && currentDropdown) {
          let value = line.substring(1).trim();
          const isCorrect = value.startsWith('*');
          if (isCorrect) {
            value = value.substring(1).trim();
            currentDropdown.correct = value;
          }
          currentDropdown.choices.push(value);
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
      
      questions.push({
        type,
        text: textPrompt.trim(),
        options: {
          sentence,
          dropdowns
        },
        correct_option_index: 0
      });
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
        options: {
          categories,
          items
        },
        correct_option_index: 0
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
      const opts = Array.isArray(q.options) ? q.options : [];
      opts.forEach((opt, idx) => {
        output += idx === q.correct_option_index ? `- *${opt}\n` : `- ${opt}\n`;
      });
    } 
    
    else if (q.type === 'SORTING') {
      const opts = Array.isArray(q.options) ? q.options : [];
      opts.forEach((opt, idx) => {
        output += `${idx + 1}. ${opt}\n`;
      });
    } 
    
    else if (q.type === 'DRAG_DROP') {
      const opts = q.options || {};
      const sentence = opts.sentence || '';
      const choices = Array.isArray(opts.choices) ? opts.choices : [];
      const correct = Array.isArray(opts.correct) ? opts.correct : [];
      
      output += `sentence: ${sentence}\n`;
      choices.forEach(choice => {
        const isCorrect = correct.includes(choice);
        output += isCorrect ? `- *${choice}\n` : `- ${choice}\n`;
      });
    } 
    
    else if (q.type === 'DROP_DOWN') {
      const opts = q.options || {};
      const sentence = opts.sentence || '';
      const dropdowns = Array.isArray(opts.dropdowns) ? opts.dropdowns : [];
      
      output += `sentence: ${sentence}\n`;
      dropdowns.forEach(dd => {
        output += `dropdown\n`;
        const choices = Array.isArray(dd.choices) ? dd.choices : [];
        choices.forEach(choice => {
          output += choice === dd.correct ? `- *${choice}\n` : `- ${choice}\n`;
        });
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

