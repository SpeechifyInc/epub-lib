
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { EPub } from '../dist/index.js';

// ---------------------------------------------------------------------------
// EPUB2 with NCX — standard path
// ---------------------------------------------------------------------------

test('EPUB2 with NCX: flow and toc populated — alice.epub', async () => {
  const epub = await EPub.createAsync('test/example/alice.epub') as InstanceType<typeof EPub>;

  assert.ok(epub.flow.length > 0, 'flow should be non-empty');
  assert.ok(epub.toc.length > 0, 'toc should be non-empty from NCX');
  assert.ok(epub.metadata.title, 'metadata title should be set');

  const ch = await epub.getChapterRawAsync(epub.flow[0].id);
  assert.ok(ch.length > 0, 'first chapter content should be readable');
});

// ---------------------------------------------------------------------------
// EPUB3 without NCX — regression for "Reading archive failed"
// ---------------------------------------------------------------------------
// epub3-no-ncx.epub mirrors the structure of the life-span epub:
//   - OPF spine toc attr points to toc.ncx (item-1 in manifest)
//   - toc.ncx is absent from the archive
//   - toc.xhtml (EPUB3 nav doc) is present but epub-lib doesn't use it for flow

test('EPUB3 without NCX: no crash, flow populated, toc empty — epub3-no-ncx.epub', async () => {
  const epub = await EPub.createAsync('test/example/epub3-no-ncx.epub') as InstanceType<typeof EPub>;

  assert.equal(epub.flow.length, 3, 'all 3 spine items should be in flow');
  assert.equal(epub.toc.length, 0, 'toc should be empty — no NCX to parse');
});

test('EPUB3 without NCX: all chapters are readable — epub3-no-ncx.epub', async () => {
  const epub = await EPub.createAsync('test/example/epub3-no-ncx.epub') as InstanceType<typeof EPub>;

  const ch1 = await epub.getChapterRawAsync(epub.flow[0].id);
  assert.ok(ch1.includes('first chapter'), 'chapter 1 content readable');

  const ch2 = await epub.getChapterRawAsync(epub.flow[1].id);
  assert.ok(ch2.includes('second chapter'), 'chapter 2 content readable');

  const ch3 = await epub.getChapterRawAsync(epub.flow[2].id);
  assert.ok(ch3.includes('third'), 'chapter 3 content readable');
});

// ---------------------------------------------------------------------------
// Large real-world EPUB3 (skipped if file not present)
// ---------------------------------------------------------------------------

const LARGE_EPUB_PATH = process.env.EPUB_LARGE_PATH
  ?? '../platform/life-span_development__19th_edition__john_w._santrock___z-library_.epub';

const largeEpubExists = fs.existsSync(LARGE_EPUB_PATH);

test('EPUB3 without NCX: large real-world file — life-span development', { skip: !largeEpubExists }, async () => {
  const epub = await EPub.createAsync(LARGE_EPUB_PATH) as InstanceType<typeof EPub>;

  assert.ok(epub.flow.length > 0, 'flow should be non-empty');
  assert.equal(epub.toc.length, 0, 'toc should be empty — no NCX in archive');

  const ch = await epub.getChapterRawAsync(epub.flow[0].id);
  assert.ok(ch.length > 0, 'first chapter content should be readable');
});
