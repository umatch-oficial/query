const OTHER = [";"];
const OPERATORS = ["+", "||"];
const COMMENTS = ["#", "--", "/*"];
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
 * Throws an error if the string contains any potential SQL
 * vulnerability exploits.
 */
export default function validateSQL<S extends string>(string: S): S {
  const str = string.toLowerCase();
  if (
    OTHER.some((other) => str.includes(other)) ||
    OPERATORS.some((operator) => str.includes(operator)) ||
    COMMENTS.some((comment) => str.includes(comment)) ||
    KEYWORDS.some((keyword) => keyword.test(str))
  )
    throw new Error("Potential SQL injection vulnerability");
  return string;
}
