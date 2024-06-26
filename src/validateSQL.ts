const OTHER = [';'];
const COMMENTS = ['#', '--', '/*'];
const KEYWORDS = [
  /\balter\b/,
  /\band\b/,
  /\bascii\b/,
  /\bchar\b/,
  /\bcreate\b/,
  /\bdelete\b/,
  /\bdrop\b/,
  /\bgroup by\b/,
  /\bhaving\b/,
  /\binsert\b/,
  /\bor\b/,
  /\border by\b/,
  /\brename\b/,
  /\breplace\b/,
  /\bselect\b/,
  /\btruncate\b/,
  /\bunion\b/,
  /\bupdate\b/,
  /\bwhere\b/,
];

/**
 * Returns the string.
 *
 * @throws {Error} if the string contains any potential SQL vulnerability exploits.
 */
export function validateSQL<S extends string>(string: S): S {
  const str = string.toLowerCase();
  const errMessage = 'Potential SQL injection vulnerability';
  if (OTHER.some((other) => str.includes(other))) throw new Error(errMessage);
  if (COMMENTS.some((comment) => str.includes(comment))) throw new Error(errMessage);
  if (KEYWORDS.some((keyword) => keyword.test(str))) throw new Error(errMessage);

  return string;
}
