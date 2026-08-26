/**
 * Utilities for parsing .gitignore rules and matching file paths against them.
 */

export function parseGitignore(content) {
  if (!content || typeof content !== "string") return [];

  const lines = content.split(/\r?\n/);
  const rules = [];

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;

    let isNegated = false;
    if (line.startsWith("!")) {
      isNegated = true;
      line = line.slice(1).trim();
    }

    const isDirOnly = line.endsWith("/");
    if (isDirOnly) {
      line = line.slice(0, -1);
    }

    const isRootOnly = line.startsWith("/");
    if (isRootOnly) {
      line = line.slice(1);
    }

    // Convert git glob pattern to RegExp
    let regexPattern = line
      .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape regex special chars
      .replace(/\*\*/g, "___DOUBLE_STAR___")
      .replace(/\*/g, "[^/]*")
      .replace(/\?/g, "[^/]")
      .replace(/___DOUBLE_STAR___/g, ".*");

    let finalRegex;
    try {
      if (isRootOnly) {
        finalRegex = new RegExp(`^${regexPattern}(?:$|/.*)`);
      } else {
        finalRegex = new RegExp(`(?:^|/)${regexPattern}(?:$|/.*)`);
      }
    } catch {
      continue;
    }

    rules.push({
      original: line,
      isNegated,
      isDirOnly,
      regex: finalRegex,
    });
  }

  return rules;
}

export function isPathIgnored(relPath, rules) {
  if (!rules || rules.length === 0 || !relPath) return false;

  const normalized = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
  let isIgnored = false;

  for (const r of rules) {
    if (r.regex.test(normalized)) {
      isIgnored = !r.isNegated;
    }
  }

  return isIgnored;
}
