// Shared by the popup, options page and background worker.

export const BASE_URLS = [
  { label: 'BitBin (bitbin.divyanshuagrahari.dev)', value: 'https://bitbin.divyanshuagrahari.dev' },
  { label: 'Local development (localhost:3000)', value: 'http://localhost:3000' },
];

export const DEFAULT_BASE_URL = BASE_URLS[0].value;

/** Item types the token API accepts, in the order the picker shows them. */
export const ITEM_TYPES = ['note', 'snippet', 'command', 'prompt', 'link'];

/** How long a context-menu selection waits for the popup to pick it up. */
export const PENDING_TTL_MS = 60 * 1000;

export async function getSettings() {
  const { baseUrl, token, lastCollectionId } = await chrome.storage.local.get([
    'baseUrl',
    'token',
    'lastCollectionId',
  ]);
  return {
    baseUrl: baseUrl || DEFAULT_BASE_URL,
    token: token || '',
    lastCollectionId: lastCollectionId || '',
  };
}

export async function saveSettings(values) {
  await chrome.storage.local.set(values);
}

/**
 * Call the BitBin token API. Resolves to the parsed `data`, or throws an
 * Error whose message is safe to show (the server's `error` string).
 */
export async function api(path, { method = 'GET', body, settings } = {}) {
  const { baseUrl, token } = settings ?? (await getSettings());
  if (!token) throw new Error('Add your BitBin token in the extension options.');

  let res;
  try {
    res = await fetch(`${baseUrl}/api/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'omit',
    });
  } catch {
    throw new Error(`Could not reach ${new URL(baseUrl).host}.`);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fieldError = json.fieldErrors && Object.values(json.fieldErrors).flat()[0];
    const error = new Error(fieldError || json.error || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return json.data;
}

const URL_RE = /^https?:\/\/\S+$/i;

const SHELL_COMMANDS = new Set([
  'apt', 'apt-get', 'brew', 'cargo', 'cat', 'cd', 'chmod', 'chown', 'cp', 'curl', 'docker',
  'docker-compose', 'echo', 'export', 'find', 'gh', 'git', 'go', 'grep', 'helm', 'kill',
  'kubectl', 'ln', 'ls', 'make', 'mkdir', 'mv', 'node', 'npm', 'npx', 'pip', 'pip3', 'pnpm',
  'python', 'python3', 'rm', 'rsync', 'scp', 'sed', 'ssh', 'sudo', 'systemctl', 'tail', 'tar',
  'terraform', 'touch', 'vercel', 'wget', 'yarn', 'bun', 'deno', 'prisma', 'psql', 'redis-cli',
]);

const CODE_HINTS = [
  /[{};]\s*$/m,
  /^\s*(import|export|from|const|let|var|function|class|def|return|if|for|while|async|await|public|private|package|using|#include|fn|impl|struct|interface|type)\b/m,
  /=>|::|\(\)\s*{|<\/?[a-z][\w-]*[^>]*>/i,
];

/**
 * Guess the item type for a selection: a lone URL is a link, a short line that
 * starts with a known shell command (or `$ `) is a command, text that looks
 * like code is a snippet, anything else is a note.
 */
export function guessItemType(text) {
  const trimmed = text.trim();
  if (!trimmed) return 'note';

  if (URL_RE.test(trimmed)) return 'link';

  const lines = trimmed.split('\n').filter((line) => line.trim());
  const firstWord = lines[0].replace(/^\$\s+/, '').split(/\s+/)[0];
  if (lines.length <= 3 && (/^\$\s+/.test(lines[0]) || SHELL_COMMANDS.has(firstWord))) {
    return 'command';
  }

  const codeLines = CODE_HINTS.filter((re) => re.test(trimmed)).length;
  if (codeLines >= 2 || (codeLines === 1 && lines.length > 1)) return 'snippet';

  return 'note';
}

/** Strip shell prompts (`$ `) from each line of a command. */
export function cleanCommand(text) {
  return text
    .trim()
    .split('\n')
    .map((line) => line.replace(/^\s*\$\s+/, ''))
    .join('\n');
}

export function titleFrom(text, fallback) {
  const firstLine = text.trim().split('\n')[0]?.trim() ?? '';
  const title = firstLine || fallback || 'Untitled';
  return title.length > 80 ? `${title.slice(0, 77)}…` : title;
}

/** Same values as LANGUAGES in src/lib/constants/editor.ts, so the app's editor highlights them. */
export const LANGUAGES = [
  ['plaintext', 'Plain Text'], ['javascript', 'JavaScript'], ['typescript', 'TypeScript'],
  ['python', 'Python'], ['html', 'HTML'], ['css', 'CSS'], ['json', 'JSON'], ['markdown', 'Markdown'],
  ['bash', 'Bash / Shell'], ['sql', 'SQL'], ['java', 'Java'], ['csharp', 'C#'], ['cpp', 'C++'],
  ['c', 'C'], ['go', 'Go'], ['rust', 'Rust'], ['ruby', 'Ruby'], ['php', 'PHP'], ['swift', 'Swift'],
  ['kotlin', 'Kotlin'], ['dart', 'Dart'], ['yaml', 'YAML'], ['xml', 'XML'], ['graphql', 'GraphQL'],
  ['dockerfile', 'Dockerfile'], ['scss', 'SCSS'], ['less', 'Less'], ['lua', 'Lua'], ['perl', 'Perl'],
  ['r', 'R'], ['powershell', 'PowerShell'],
].map(([value, label]) => ({ value, label }));

// Checked in order; the first match wins, so specific patterns come first.
const LANGUAGE_HINTS = [
  ['json', (t) => /^\s*[{[]/.test(t) && (() => { try { JSON.parse(t); return true; } catch { return false; } })()],
  ['dockerfile', (t) => /^\s*FROM\s+\S+/m.test(t) && /^\s*(RUN|COPY|CMD|WORKDIR|ENTRYPOINT)\b/m.test(t)],
  ['html', (t) => /^\s*<(!doctype|html|div|span|p|a|body|head|section|ul|li|button|form|input|img)\b/im.test(t)],
  ['xml', (t) => /^\s*<\?xml|^\s*<[\w:-]+[^>]*>[\s\S]*<\/[\w:-]+>\s*$/i.test(t)],
  ['sql', (t) => /\b(SELECT\s+[\s\S]+\s+FROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|CREATE\s+TABLE|DELETE\s+FROM)\b/i.test(t)],
  ['graphql', (t) => /^\s*(query|mutation|fragment|subscription)\b[\s\S]*{/m.test(t) || /^\s*type\s+\w+\s*{[\s\S]*:\s*\w+!?/m.test(t)],
  ['python', (t) =>
    /^\s*(def|class)\s+\w+.*:\s*$/m.test(t) ||
    /\b(try|finally):\s/.test(t) ||
    /\bexcept(\s+\w+)?\s*:/.test(t) ||
    (/^\s*(from\s+\S+\s+)?import\s+\w+(\s+as\s+\w+)?\s*$/m.test(t) && !/;\s*$/m.test(t)) ||
    (/\b(elif|print\(|self\.|None\b|True\b|False\b)/.test(t) && !/[;{}]\s*$/m.test(t))],
  ['typescript', (t) => /:\s*(string|number|boolean|void|any|unknown|never)\b|\binterface\s+\w+\s*{|\btype\s+\w+\s*=|<\w+>\(|\bas\s+const\b|\bimport\s+type\b/.test(t)],
  ['javascript', (t) => /\b(const|let|var)\s+\w+\s*=|=>|\bfunction\s*\w*\s*\(|console\.log|require\(|\bexport\s+(default|const|function)\b|document\.|\bawait\s/.test(t)],
  ['go', (t) => /^\s*package\s+\w+\s*$/m.test(t) || /\bfunc\s+(\(\w+\s+\*?\w+\)\s*)?\w+\(|:=/.test(t)],
  ['rust', (t) => /\bfn\s+\w+\s*\(|\blet\s+mut\b|\bimpl\b|println!|->\s*\w+\s*{|::new\(/.test(t)],
  ['java', (t) => /\bpublic\s+(static\s+)?(class|void|int|String)\b|System\.out\.println/.test(t)],
  ['csharp', (t) => /\busing\s+System\b|\bnamespace\s+\w+|Console\.WriteLine|\bpublic\s+async\s+Task\b/.test(t)],
  ['cpp', (t) => /#include\s*<(iostream|vector|string|map)>|std::|\bcout\s*<</.test(t)],
  ['c', (t) => /#include\s*<\w+\.h>|\bprintf\s*\(|\bint\s+main\s*\(/.test(t)],
  ['php', (t) => /<\?php|\$\w+\s*=.*;|\becho\s+["$]/.test(t)],
  ['ruby', (t) => /^\s*(def\s+\w+[^:]*$|end\s*$|require\s+['"])/m.test(t) || /\bputs\s/.test(t)],
  ['kotlin', (t) => /\bfun\s+\w+\s*\(|\bval\s+\w+\s*[:=]/.test(t)],
  ['swift', (t) => /\bfunc\s+\w+\s*\(|\bvar\s+\w+\s*:\s*\w+|\bguard\s+let\b/.test(t)],
  ['powershell', (t) => /\b(Get|Set|New|Remove|Write)-\w+|\$env:/.test(t)],
  ['bash', (t) => /^#!\/bin\/(ba)?sh|^\s*(sudo|npm|npx|git|docker|cd|ls|curl|apt|brew|export|echo)\b/m.test(t)],
  ['yaml', (t) => /^[\w-]+:\s*(\S.*)?$/m.test(t) && /^\s+[\w-]+:|^\s*-\s+\w/m.test(t) && !/[{};]/.test(t)],
  ['scss', (t) => /\$[\w-]+\s*:|&:hover|@mixin|@include/.test(t)],
  ['css', (t) => /^\s*[.#]?[\w-][\w\s.#:>-]*\{\s*[\w-]+\s*:/m.test(t)],
  ['markdown', (t) => /^#{1,6}\s+\w|^\s*[-*]\s+\w|\[.+\]\(https?:/m.test(t)],
];

/** Best-effort language for a snippet; `plaintext` when nothing matches. */
export function guessLanguage(text) {
  const trimmed = text.trim();
  for (const [language, test] of LANGUAGE_HINTS) {
    if (test(trimmed)) return language;
  }
  return 'plaintext';
}

/** "How to read a file - Stack Overflow" → "How to read a file" */
export function cleanPageTitle(title) {
  const parts = (title ?? '').split(/\s+[|\-–—·•]\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  // Keep the most descriptive part: usually the first, unless it's just the site name
  return parts[0].length >= 8 || parts.length === 1 ? parts[0] : parts.reduce((a, b) => (b.length > a.length ? b : a));
}

/**
 * Title for a saved item. Code and commands take their context (the heading
 * above the selection, then the page title) because their first line is
 * rarely a good name. Notes and prompts use their first line when it's short.
 */
export function suggestTitle(type, text, { heading, pageTitle } = {}) {
  const context = (heading ?? '').trim() || cleanPageTitle(pageTitle);
  if (type === 'snippet' || type === 'command') {
    return titleFrom(context, titleFrom(text));
  }
  const firstLine = text.trim().split('\n')[0]?.trim() ?? '';
  if (firstLine && firstLine.length <= 80) return firstLine;
  return titleFrom(context || text, 'Untitled');
}

export function parseTags(value) {
  return [...new Set(
    value
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
  )];
}
