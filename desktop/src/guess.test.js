const test = require('node:test');
const assert = require('node:assert/strict');
const { guessItemType, cleanCommand, parseTags, prefillFrom, titleFrom } = require('./guess');

test('a lone URL is a link', () => {
  assert.equal(guessItemType('https://example.com/post'), 'link');
  assert.equal(guessItemType('  http://localhost:3000  '), 'link');
});

test('a URL with other text is not a link', () => {
  assert.equal(guessItemType('see https://example.com for more'), 'note');
});

test('short shell lines are commands', () => {
  assert.equal(guessItemType('npm run dev'), 'command');
  assert.equal(guessItemType('$ git status'), 'command');
  assert.equal(guessItemType('  docker compose up'), 'command');
});

test('code is a snippet', () => {
  assert.equal(guessItemType('const a = 1;\nconst b = 2;'), 'snippet');
  assert.equal(guessItemType('function useDebounce() {\n  return 1;\n}'), 'snippet');
});

test('prose is a note', () => {
  assert.equal(guessItemType('Remember to renew the domain next month'), 'note');
  assert.equal(guessItemType('   '), 'note');
});

test('cleanCommand strips shell prompts from every line', () => {
  assert.equal(cleanCommand('$ cd app\n  $ npm i\nnpm run dev'), 'cd app\nnpm i\nnpm run dev');
});

test('titleFrom uses the first line and cuts a long one', () => {
  assert.equal(titleFrom('first\nsecond'), 'first');
  assert.equal(titleFrom(''), 'Untitled');
  const title = titleFrom('x'.repeat(200));
  assert.equal(title.length, 78);
  assert.ok(title.endsWith('…'));
});

test('parseTags lowercases, trims and de-duplicates', () => {
  assert.deepEqual(parseTags(' React, hooks,,REACT , '), ['react', 'hooks']);
});

test('prefillFrom for empty clipboard is a blank note', () => {
  assert.deepEqual(prefillFrom(''), { type: 'note', title: '', content: '', url: '' });
  assert.deepEqual(prefillFrom(undefined), { type: 'note', title: '', content: '', url: '' });
});

test('prefillFrom puts a URL in the url field and leaves the title empty', () => {
  assert.deepEqual(prefillFrom('https://example.com'), {
    type: 'link',
    title: '',
    content: '',
    url: 'https://example.com',
  });
});

test('prefillFrom cleans a command and normalises Windows line endings', () => {
  const result = prefillFrom('$ npm i\r\n$ npm run dev');
  assert.equal(result.type, 'command');
  assert.equal(result.content, 'npm i\nnpm run dev');
  assert.equal(result.title, '');
});
