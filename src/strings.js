// Small string helpers without regular expressions. Trimming with /\/+$/ or /^-+|-+$/
// takes quadratic time on long input of slashes or dashes (polynomial ReDoS); these
// loops are linear.

/** Removes slashes at the end: 'https://host///' -> 'https://host'. */
export function trimSlash(s) {
  const str = String(s ?? '');
  let end = str.length;
  while (end > 0 && str.charCodeAt(end - 1) === 47) end--;
  return end === str.length ? str : str.slice(0, end);
}

/** Removes dashes at the start and end: '--a-b--' -> 'a-b'. */
export function trimDashes(s) {
  const str = String(s ?? '');
  let start = 0;
  let end = str.length;
  while (start < end && str.charCodeAt(start) === 45) start++;
  while (end > start && str.charCodeAt(end - 1) === 45) end--;
  return str.slice(start, end);
}
