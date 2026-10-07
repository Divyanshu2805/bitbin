// Type and title guessing for a clipboard capture. Mirrors `guessItemType`,
// `cleanCommand`, `titleFrom` and `parseTags` in extension/lib.js; keep the two in
// sync. There's no language guessing here: the token API detects it for snippets
// and commands sent without one.

/** Item types the token API accepts, in the order the picker shows them. */
const ITEM_TYPES = ['note', 'snippet', 'command', 'prompt', 'link'];

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
 * A lone URL is a link, a short line that starts with a known shell command (or
 * `$ `) is a command, text that looks like code is a snippet, anything else is a note.
 */
function guessItemType(text) {
  const trimmed = text.trim();
  if (!trimmed) return 'note';

  if (URL_RE.test(trimmed)) return 'link';

  const lines = trimmed.split('\n').filter((line) => line.trim());
  const firstWord = lines[0].trim().replace(/^\$\s+/, '').split(/\s+/)[0];
  if (lines.length <= 3 && (/^\s*\$\s+/.test(lines[0]) || SHELL_COMMANDS.has(firstWord))) {
    return 'command';
  }

  const codeLines = CODE_HINTS.filter((re) => re.test(trimmed)).length;
  if (codeLines >= 2 || (codeLines === 1 && lines.length > 1)) return 'snippet';

  return 'note';
}

/** Strip shell prompts (`$ `) from each line of a command. */
function cleanCommand(text) {
  return text
    .trim()
    .split('\n')
    .map((line) => line.replace(/^\s*\$\s+/, ''))
    .join('\n');
}

function titleFrom(text, fallback) {
  const firstLine = text.trim().split('\n')[0]?.trim() ?? '';
  const title = firstLine || fallback || 'Untitled';
  return title.length > 80 ? `${title.slice(0, 77)}…` : title;
}

function parseTags(value) {
  return [...new Set(
    value
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
  )];
}

/** What the capture window starts with for a piece of clipboard text. The title is left for the user to write. */
function prefillFrom(text) {
  const trimmed = (text ?? '').replace(/\r\n/g, '\n').trim();
  if (!trimmed) return { type: 'note', title: '', content: '', url: '' };

  const type = guessItemType(trimmed);
  if (type === 'link') return { type, title: '', content: '', url: trimmed };

  const content = type === 'command' ? cleanCommand(trimmed) : trimmed;
  return { type, title: '', content, url: '' };
}

module.exports = { ITEM_TYPES, guessItemType, cleanCommand, titleFrom, parseTags, prefillFrom };
