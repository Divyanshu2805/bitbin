const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_UPLOAD_BYTES,
  baseName,
  buildFileForm,
  checkFile,
  classifyFile,
  clipboardImageName,
  contentTypeFor,
  formatSize,
} = require('./files');

test('classifyFile sorts a name into image, file or nothing', () => {
  assert.equal(classifyFile('shot.PNG'), 'image');
  assert.equal(classifyFile('logo.svg'), 'image');
  assert.equal(classifyFile('spec.pdf'), 'file');
  assert.equal(classifyFile('config.yml'), 'file');
  assert.equal(classifyFile('run.exe'), null);
  assert.equal(classifyFile('noextension'), null);
  assert.equal(classifyFile(undefined), null);
});

test('checkFile accepts what the server accepts', () => {
  assert.equal(checkFile('spec.pdf', 1000), null);
  assert.equal(checkFile('shot.png', 1000), null);
});

test('checkFile refuses an unsupported type, an empty file and an oversized one', () => {
  assert.match(checkFile('run.exe', 1000), /BitBin stores/);
  assert.match(checkFile('spec.pdf', 0), /empty/);
  assert.match(checkFile('spec.pdf', MAX_UPLOAD_BYTES + 1), /too large/);
  assert.match(checkFile('spec.pdf', Number.NaN), /empty/);
});

test('checkFile applies the smaller image limit and the platform ceiling', () => {
  assert.equal(checkFile('big.pdf', MAX_UPLOAD_BYTES), null);
  assert.match(checkFile('big.png', MAX_UPLOAD_BYTES + 1), /too large/);
});

test('contentTypeFor goes by extension', () => {
  assert.equal(contentTypeFor('a.png'), 'image/png');
  assert.equal(contentTypeFor('a.PDF'), 'application/pdf');
  assert.equal(contentTypeFor('a.unknown'), 'application/octet-stream');
});

test('baseName drops folders and control characters and is never empty', () => {
  assert.equal(baseName('C:\\Users\\me\\spec.pdf'), 'spec.pdf');
  assert.equal(baseName('/home/me/spec.pdf'), 'spec.pdf');
  assert.equal(baseName('a\u0000b.txt'), 'ab.txt');
  assert.equal(baseName(''), 'file');
  assert.equal(baseName('x'.repeat(400)).length, 255);
});

test('formatSize', () => {
  assert.equal(formatSize(500), '500 B');
  assert.equal(formatSize(2048), '2 KB');
  assert.equal(formatSize(3.5 * 1024 * 1024), '3.5 MB');
});

test('clipboardImageName is a dated png name', () => {
  assert.equal(clipboardImageName(new Date(2026, 9, 7, 8, 5, 9)), 'clipboard-2026-10-07-080509.png');
});

test('buildFileForm sends the file and only the known fields', async () => {
  const attachment = { name: 'spec.pdf', type: 'file', bytes: Buffer.from('%PDF') };
  const form = buildFileForm(attachment, {
    title: ' Spec ',
    description: 'The spec',
    tags: 'a, b',
    collectionId: 'col-1',
    isPro: true,
    itemType: 'note',
  });

  const sent = [...form.keys()].sort();
  assert.deepEqual(sent, ['collectionId', 'description', 'file', 'itemType', 'tags', 'title']);
  assert.equal(form.get('itemType'), 'file');
  assert.equal(form.get('title'), 'Spec');
  const file = form.get('file');
  assert.equal(file.name, 'spec.pdf');
  assert.equal(file.type, 'application/pdf');
  assert.equal(await file.text(), '%PDF');
});

test('buildFileForm leaves out empty fields', () => {
  const form = buildFileForm({ name: 'a.png', type: 'image', bytes: Buffer.from([1]) }, { title: '  ', tags: '' });
  assert.deepEqual([...form.keys()].sort(), ['file', 'itemType']);
});
