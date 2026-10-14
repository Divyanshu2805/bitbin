const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_UPLOAD_BYTES,
  UPLOAD_PART_BYTES,
  splitParts,
  pickerExtensions,
  baseName,
  buildFileForm,
  checkFile,
  classifyFile,
  clipboardImageName,
  contentTypeFor,
  formatSize,
} = require('./files');

test('pickerExtensions offers images, files or both, without dots', () => {
  assert.deepEqual(pickerExtensions('image'), ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);
  assert.ok(pickerExtensions('file').includes('pdf'));
  assert.ok(!pickerExtensions('file').includes('png'));
  const all = pickerExtensions();
  assert.ok(all.includes('png') && all.includes('pdf'));
  assert.ok(all.every((ext) => !ext.startsWith('.')));
});

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

test('checkFile applies the server limits: 10 MB for files, 5 MB for images', () => {
  assert.equal(MAX_UPLOAD_BYTES, 10 * 1024 * 1024);
  assert.equal(checkFile('big.pdf', MAX_UPLOAD_BYTES), null);
  assert.equal(checkFile('big.png', 5 * 1024 * 1024), null);
  assert.match(checkFile('big.png', 5 * 1024 * 1024 + 1), /too large.*5 MB/);
});

test('splitParts leaves a small file whole and cuts a large one into 4 MB parts', () => {
  assert.deepEqual(splitParts(Buffer.alloc(UPLOAD_PART_BYTES)), []);
  const parts = splitParts(Buffer.alloc(UPLOAD_PART_BYTES * 2 + 10));
  assert.deepEqual(parts.map((p) => p.length), [UPLOAD_PART_BYTES, UPLOAD_PART_BYTES, 10]);
  assert.ok(UPLOAD_PART_BYTES < 4_500_000, 'a part must stay under the host limit');
});

test('buildFileForm names the parts instead of carrying the file', () => {
  const attachment = { name: 'big.pdf', type: 'file', bytes: Buffer.alloc(10) };
  const form = buildFileForm(attachment, { title: 'Big' }, { uploadId: 'id-1', partCount: 3 });
  assert.equal(form.get('file'), null);
  assert.equal(form.get('uploadId'), 'id-1');
  assert.equal(form.get('partCount'), '3');
  assert.equal(form.get('fileName'), 'big.pdf');
  assert.equal(form.get('itemType'), 'file');
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
