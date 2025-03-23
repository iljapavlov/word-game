// game logic like word validation, damage calculation, etc,
const fs = require('fs');
const path = require('path');

const topLongestWords = [];

const data = fs.readFileSync(path.join(__dirname, 'russian_nouns.txt'), 'utf8');
const words = data.split('\n').map(word => word.trim().toLowerCase());
const russianNouns = new Set(words);

topLongestWords.push(...Array.from(russianNouns).sort((a, b) => b.length - a.length).slice(0, 300));

console.log('Russian nouns loaded:', russianNouns.size);

function getRandomWord() {
    return topLongestWords[Math.floor(Math.random() * topLongestWords.length)];
}

function validateWord(givenWord, submittedWord, usedWords) {
    console.log('Validating word:', submittedWord);
    if (submittedWord.length < 3) return { valid: false, reason: 'Word too short', resetMultiplier: true };
    if (submittedWord === givenWord.toLowerCase()) return { valid: false, reason: 'Cannot use original word', resetMultiplier: true };
    if (usedWords.has(submittedWord)) return { valid: false, reason: 'Word already used', resetMultiplier: true };
    if (!canFormWord(givenWord, submittedWord)) return { valid: false, reason: 'Cannot be formed from given letters', resetMultiplier: true };
    if (!russianNouns.has(submittedWord)) return { valid: false, reason: 'Not a valid Russian noun', resetMultiplier: true };
    return { valid: true, damage: calculateDamage(givenWord, submittedWord), increaseMultiplier: true };
}

function isValidRussianNoun(word) {
  return russianNouns.has(word.toLowerCase());
}

function canFormWord(givenWord, submittedWord) {
    const givenFreq = {};
    for (let char of givenWord) givenFreq[char] = (givenFreq[char] || 0) + 1;
    const submittedFreq = {};
    for (let char of submittedWord) submittedFreq[char] = (submittedFreq[char] || 0) + 1;
    for (let char in submittedFreq) {
        if (!givenFreq[char] || submittedFreq[char] > givenFreq[char]) return false;
    }
    return true;
}

// DAMAGE CALCULATIONS

function calculateDamage(givenWord, submittedWord) {
  let lengthFactor = submittedWord.length;
  if (submittedWord.length > 5) {
    lengthFactor += Math.pow(submittedWord.length - 5, 1.8);
  }
  const isSubstring = givenWord.toLowerCase().includes(submittedWord.toLowerCase());
  const substringMultiplier = isSubstring ? 0.6 : 1.0;
  const uniqueLetters = new Set(submittedWord.split('')).size;
  const letterDiversityFactor = 0.5 + (uniqueLetters / submittedWord.length) * 0.5;
  const positionComplexity = calculatePositionComplexity(givenWord, submittedWord);
  const rareLetterBonus = calculateRareLetterBonus(submittedWord);
  let damage = lengthFactor * substringMultiplier * letterDiversityFactor * positionComplexity;
  damage += rareLetterBonus;
  return Math.max(1, Math.round(damage, 2));
}

function calculatePositionComplexity(givenWord, submittedWord) {
  let complexity = 1.0;
  const letterPositions = {};
  for (let i = 0; i < givenWord.length; i++) {
    const char = givenWord[i].toLowerCase();
    if (!letterPositions[char]) letterPositions[char] = [];
    letterPositions[char].push(i);
  }
  let lastUsedPosition = -1;
  let positionJumps = 0;
  for (let i = 0; i < submittedWord.length; i++) {
    const char = submittedWord[i].toLowerCase();
    if (letterPositions[char] && letterPositions[char].length > 0) {
      let closestPosition = -1;
      let minDistance = Infinity;
      for (const pos of letterPositions[char]) {
        if (lastUsedPosition === -1) {
          closestPosition = pos;
          break;
        } else {
          const distance = Math.abs(pos - lastUsedPosition);
          if (distance < minDistance) {
            minDistance = distance;
            closestPosition = pos;
          }
        }
      }
      if (closestPosition !== -1) {
        if (lastUsedPosition !== -1 && Math.abs(closestPosition - lastUsedPosition) > 1) {
          positionJumps++;
        }
        letterPositions[char] = letterPositions[char].filter(p => p !== closestPosition);
        lastUsedPosition = closestPosition;
      }
    }
  }
  if (positionJumps > 0) {
    complexity *= (1 + (positionJumps / submittedWord.length) * 0.5);
  }
  return complexity;
}

function calculateRareLetterBonus(word) {
  const letterFrequency = {
    'а': 0.062, 'б': 0.014, 'в': 0.038, 'г': 0.013, 'д': 0.025,
    'е': 0.072, 'ё': 0.003, 'ж': 0.007, 'з': 0.016, 'и': 0.062,
    'й': 0.010, 'к': 0.028, 'л': 0.035, 'м': 0.026, 'н': 0.053,
    'о': 0.090, 'п': 0.023, 'р': 0.040, 'с': 0.045, 'т': 0.053,
    'у': 0.021, 'ф': 0.002, 'х': 0.009, 'ц': 0.004, 'ч': 0.012,
    'ш': 0.006, 'щ': 0.003, 'ъ': 0.000, 'ы': 0.016, 'ь': 0.014,
    'э': 0.003, 'ю': 0.006, 'я': 0.018
  };
  let bonus = 0;
  const usedLetters = new Set(word.toLowerCase().split(''));
  for (const letter of usedLetters) {
    if (letterFrequency[letter] && letterFrequency[letter] < 0.03) {
      bonus += (0.03 - letterFrequency[letter]) * 10;
    }
  }
  return bonus;
}

module.exports = {
  getRandomWord,
  validateWord,
  isValidRussianNoun,
  canFormWord,
  calculateDamage,
  calculatePositionComplexity,
  calculateRareLetterBonus
};