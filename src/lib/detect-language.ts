/**
 * Best-effort language detection for snippets and commands, from the content
 * alone. Used when content is pasted into the editor and, on create, when no
 * language was chosen. Returns a value from LANGUAGES (lib/constants/editor),
 * or null when nothing is confident enough to guess.
 *
 * Each language has weighted signals; a signal counts once however often it
 * matches. The highest score wins if it reaches MIN_SCORE. Supersets add
 * their base language's score (TypeScript ⊃ JavaScript, C++ ⊃ C, SCSS and
 * Less ⊃ CSS) once one of their own signals matched.
 */

type Signal = [test: RegExp | ((text: string) => boolean), weight: number];

const MIN_SCORE = 2;
// Detection only needs the start of a long paste
const MAX_SAMPLE = 5000;

const SIGNALS: Record<string, Signal[]> = {
  javascript: [
    [/\b(const|let|var)\s+\w+\s*=/, 1],
    [/=>/, 1],
    [/\bfunction\s*\w*\s*\(/, 1],
    [/console\.(log|error|warn)\(/, 2],
    [/\brequire\(\s*['"]/, 2],
    [/\bexport\s+(default|const|function|class)\b/, 1],
    [/^\s*import\s+[\w{},\s*]+\s+from\s+['"]/m, 2],
    [/\b(document|window)\.\w+/, 2],
    [/===|!==/, 1],
    [/\bclassName=/, 2],
    [/\breturn\s*\(?\s*<[A-Za-z]/, 2],
  ],
  typescript: [
    [/[\w)]\??:\s*(string|number|boolean|void|any|unknown|never)(\[\])?\b/, 2],
    [/[\w)]\??:\s*(Record|Promise|Array|Map|Set|Partial|Readonly|React\.\w+)</, 2],
    [/\binterface\s+\w+(\s+extends\s+[\w<>,\s]+)?\s*\{/, 3],
    [/\btype\s+\w+(<[^>]*>)?\s*=/, 2],
    [/\bas\s+const\b/, 2],
    [/\bimport\s+type\b/, 3],
    [/\b(private|protected|readonly)\s+\w+\s*[:(]/, 1],
    [/\w<[\w[\], |]+>\(/, 1],
  ],
  python: [
    [/^\s*(async\s+)?def\s+\w+\s*\(.*\)\s*(->\s*.+)?:\s*$/m, 3],
    [/^\s*class\s+\w+(\(.*\))?:\s*$/m, 3],
    [/^\s*(from\s+[\w.]+\s+)?import\s+[\w.]+(\s+as\s+\w+)?\s*$/m, 1],
    [/^\s*(elif\b.*|except\b.*|finally|try|else):\s*$/m, 3],
    [/^\s*(if|while|with)\s+.+:\s*$/m, 2],
    [/^\s*for\s+\w+(,\s*\w+)*\s+in\s+.+:\s*$/m, 3],
    [/\bprint\(/, 1],
    [/\bself\.\w+/, 2],
    [/\b(None|True|False)\b/, 1],
    [/__name__\s*==\s*['"]__main__['"]/, 3],
  ],
  go: [
    [/^\s*package\s+\w+\s*$/m, 3],
    // Go parameters have no colons, which tells it apart from Swift
    [/\bfunc\s+(\([^)]*\)\s*)?\w+\s*\([^):]*\)/, 3],
    [/:=/, 1],
    [/\bfmt\.\w+\(/, 3],
    [/^\s*import\s+(\(|")/m, 2],
    [/\bif\s+err\s*!=\s*nil\b/, 3],
  ],
  rust: [
    [/\bfn\s+\w+\s*(<[^>]*>)?\s*\(/, 3],
    [/\blet\s+mut\b/, 3],
    [/\bimpl(<[^>]*>)?\s+\w+/, 2],
    [/\b(println|format|vec|panic)!\(/, 2],
    [/^\s*use\s+\w+(::[\w{}*, ]+)+;/m, 3],
    [/&mut\s|&str\b|\bVec</, 2],
    [/\bpub\s+(fn|struct|enum|mod)\b/, 3],
  ],
  java: [
    [/\bpublic\s+(static\s+)?(final\s+)?(class|void|int|String|boolean)\b/, 2],
    [/System\.out\.print(ln)?\(/, 3],
    [/^\s*import\s+java\./m, 3],
    [/^\s*package\s+[\w.]+;\s*$/m, 3],
    [/@Override\b/, 2],
    [/\bString\[\]\s+\w+/, 2],
  ],
  csharp: [
    [/^\s*using\s+System(\.\w+)*;/m, 3],
    [/\bnamespace\s+[\w.]+/, 1],
    [/Console\.Write(Line)?\(/, 3],
    [/\bpublic\s+(async\s+)?Task\b/, 3],
    [/\{\s*get;\s*(set;)?\s*\}/, 3],
  ],
  cpp: [
    [/#include\s*<(iostream|vector|string|map|memory|algorithm|unordered_map)>/, 3],
    [/\bstd::\w+/, 3],
    [/\bcout\s*<</, 2],
    [/\btemplate\s*</, 2],
  ],
  c: [
    [/#include\s*<\w+\.h>/, 3],
    [/\bprintf\s*\(/, 1],
    [/\bint\s+main\s*\(/, 2],
    [/\b(malloc|free)\s*\(/, 2],
    [/\b(struct|typedef)\s+\w+/, 1],
  ],
  php: [
    [/<\?php/, 5],
    [/\$\w+\s*=[^=].*;/, 2],
    [/\$this->/, 3],
    [/\becho\s+["'$]/, 1],
    [/\bfunction\s+\w+\s*\(\s*\$/, 3],
  ],
  ruby: [
    [/^\s*def\s+\w+[?!]?(\(.*\))?\s*$/m, 2],
    [/^\s*end\s*$/m, 2],
    [/^\s*require(_relative)?\s+['"]/m, 2],
    [/\bputs\s/, 2],
    [/\bdo\s*\|\w+(,\s*\w+)*\|/, 3],
    [/\battr_(accessor|reader|writer)\b/, 3],
  ],
  kotlin: [
    [/\bfun\s+\w+\s*\(/, 3],
    [/\bval\s+\w+\s*[:=]/, 2],
    [/\bdata\s+class\b/, 3],
    [/\bwhen\s*\(.*\)\s*\{/, 2],
  ],
  swift: [
    [/\bfunc\s+\w+\s*\([^)]*:/, 3],
    [/\b(guard|if)\s+let\b/, 3],
    [/^\s*import\s+(UIKit|SwiftUI|Foundation)\s*$/m, 3],
    [/\bstruct\s+\w+\s*:\s*View\b/, 3],
    [/\blet\s+\w+\s*:\s*\w+\s*=/, 1],
  ],
  dart: [
    [/^\s*import\s+['"](package|dart):/m, 4],
    [/\bvoid\s+main\s*\(\s*\)/, 2],
    [/\bWidget\s+build\s*\(/, 4],
    [/\bfinal\s+\w+\s+\w+\s*=/, 1],
  ],
  lua: [
    [/^\s*local\s+\w+\s*=/m, 3],
    [/\bthen\s*$/m, 2],
    [/~=/, 2],
    [/^\s*end\s*$/m, 1],
  ],
  perl: [
    [/^#!.*\bperl\b/, 5],
    [/\bmy\s+[$@%]\w+/, 3],
    [/^\s*use\s+(strict|warnings)\s*;/m, 4],
    [/=~\s*[ms]?\//, 2],
  ],
  r: [
    [/\w\s*<-\s*\S/, 2],
    [/\blibrary\(\w+\)/, 3],
    [/\b(data\.frame|ggplot)\(/, 3],
    [/\bc\(/, 1],
  ],
  sql: [
    [/\bSELECT\b[\s\S]+?\bFROM\b/i, 3],
    [/\bINSERT\s+INTO\b/i, 3],
    [/\bUPDATE\s+\w+\s+SET\b/i, 3],
    [/\bDELETE\s+FROM\b/i, 3],
    [/\b(CREATE|ALTER|DROP)\s+(TABLE|INDEX|VIEW|DATABASE|SCHEMA)\b/i, 3],
    [/\b(WHERE|JOIN|GROUP BY|ORDER BY)\b/, 1],
  ],
  graphql: [
    [/^\s*(query|mutation|subscription|fragment)\b[^{=(]*[({]/m, 3],
    [/^\s*type\s+\w+\s*\{[\s\S]*?\w+\s*:\s*\[?\w+!?/m, 2],
  ],
  bash: [
    [/^#!\/(usr\/)?bin\/(env\s+)?(ba|z)?sh/, 5],
    [/^\s*(\$\s+)?(sudo|npm|npx|pnpm|yarn|git|docker|kubectl|cd|ls|curl|wget|apt(-get)?|brew|export|echo|chmod|chown|mkdir|rm|cp|mv|cat|grep|ssh|scp|pip3?|make|tar|systemctl|source)\b/m, 2],
    [/\|\s*(grep|awk|sed|xargs|sort|uniq|head|tail|wc|jq)\b/, 2],
    [/\s--?[a-z][\w-]*/, 1],
    [/&&\s*\w/, 1],
    [/^\s*(fi|done|esac)\s*$/m, 3],
    [/\$\{?\w+\}?/, 1],
  ],
  powershell: [
    [/\b(Get|Set|New|Remove|Write|Invoke|Start|Stop|Test|Select|Where|ForEach|Import|Export)-[A-Z]\w+/, 3],
    [/\$env:\w+/, 3],
    [/\s-(eq|ne|gt|lt|ge|le|like|match)\s/, 2],
  ],
  dockerfile: [
    [/^\s*FROM\s+[\w./:@-]+(\s+AS\s+\w+)?\s*$/im, 3],
    [/^\s*(RUN|COPY|ADD|CMD|WORKDIR|ENTRYPOINT|EXPOSE|ENV|ARG)\s/m, 2],
  ],
  html: [
    [/<(!doctype\s+html|html|head|body)\b/i, 5],
    [/<\/(div|span|p|a|ul|li|section|button|form|table|h[1-6])>/i, 2],
    [/<(meta|link|script)\b[^>]*>/i, 2],
  ],
  xml: [
    [/^\s*<\?xml\b/, 5],
    [/^\s*<[\w:-]+[^>]*>[\s\S]*<\/[\w:-]+>\s*$/, 1],
  ],
  css: [
    [/[.#]?[\w-]+[^{};]*\{\s*[\w-]+\s*:\s*[^;{}]+;/, 3],
    [/@(media|import|keyframes|font-face)\b/, 2],
    [/!important\b/, 2],
  ],
  scss: [
    [/\$[\w-]+\s*:/, 3],
    [/&(:|\.|-)[\w-]/, 3],
    [/@(mixin|include|extend)\b/, 3],
  ],
  less: [
    [/@[\w-]+\s*:\s*[^;]+;/, 3],
    [/\.[\w-]+\(\);/, 2],
  ],
  yaml: [
    [(t) => /^[\w-]+:(\s+\S.*)?$/m.test(t) && !/[;{}()]/.test(t), 2],
    [/^\s+[\w-]+:\s/m, 1],
    [/^\s*-\s+[\w"']/m, 1],
    [/^---\s*$/m, 1],
  ],
  markdown: [
    [/^#{1,6}\s+\S/m, 1],
    [/^\s*[-*+]\s+\S/m, 1],
    [/\[[^\]]+\]\([^)]+\)/, 2],
    [/^```/m, 3],
    [/\*\*[^*\n]+\*\*/, 1],
  ],
};

// A superset language also scores its base's signals, once one of its own matched
const EXTENDS: Record<string, string> = {
  typescript: 'javascript',
  cpp: 'c',
  scss: 'css',
  less: 'css',
};

function isJson(text: string): boolean {
  if (!/^[{[]/.test(text)) return false;
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function score(text: string, signals: Signal[]): number {
  let total = 0;
  for (const [test, weight] of signals) {
    if (typeof test === 'function' ? test(text) : test.test(text)) total += weight;
  }
  return total;
}

/**
 * Guess the language of `content`. For commands, anything that doesn't look
 * like another language is taken to be shell.
 */
export function detectLanguage(content: string, typeName?: string): string | null {
  const text = content.trim().slice(0, MAX_SAMPLE);
  if (!text) return null;
  if (isJson(text)) return 'json';

  const scores = new Map<string, number>();
  for (const [language, signals] of Object.entries(SIGNALS)) {
    scores.set(language, score(text, signals));
  }
  for (const [language, base] of Object.entries(EXTENDS)) {
    const own = scores.get(language) ?? 0;
    if (own > 0) scores.set(language, own + (scores.get(base) ?? 0));
  }

  let best: string | null = null;
  let bestScore = MIN_SCORE - 1;
  for (const [language, value] of scores) {
    if (value > bestScore) {
      best = language;
      bestScore = value;
    }
  }

  if (!best && typeName === 'command') return 'bash';
  return best;
}
