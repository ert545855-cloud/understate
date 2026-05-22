const BANNED_WORDS = [
  'spam','fuck','shit','bitch','ass','nigger','faggot','retard',
  'orospu','göt','bok','amk','bok','sik','piç','kıç','ibne',
];

const BANNED_REGEX = new RegExp(BANNED_WORDS.join('|'), 'gi');

function filterMessage(text) {
  if (typeof text !== 'string') return '';
  return text.replace(BANNED_REGEX, (match) => '*'.repeat(match.length));
}

function containsProfanity(text) {
  if (typeof text !== 'string') return false;
  return BANNED_REGEX.test(text);
}

module.exports = { filterMessage, containsProfanity };
