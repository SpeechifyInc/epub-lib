// Regenerates the synthetic fixtures in this directory:
//
//   node test/example/build-fixtures.mjs
//
// The real-world fixtures (alice.epub and friends) are checked in as-is; these
// two are built so a reader can see exactly which manifest field each one is
// about.
import AdmZip from 'adm-zip';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const CONTAINER_XML = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`;

const NCX = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <navMap>
    <navPoint id="np-1" playOrder="1"><navLabel><text>Chapter one</text></navLabel><content src="chapter-1.html"/></navPoint>
  </navMap>
</ncx>`;

function buildOpf(items, spineIds) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<package unique-identifier="uuid_id" version="2.0" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>Declared as text/html</dc:title>
    <dc:language>en</dc:language>
    <dc:identifier id="uuid_id" opf:scheme="uuid">1f0b6e1e-6c6c-4f2b-9e3a-2c9b6a7f0d11</dc:identifier>
  </metadata>
  <manifest>
${items.map((item) => `    <item href="${item.href}" id="${item.id}" media-type="${item.mediaType}"/>`).join('\n')}
  </manifest>
  <spine toc="ncx">
${spineIds.map((id) => `    <itemref idref="${id}"/>`).join('\n')}
  </spine>
</package>`;
}

function writeEpub(name, { items, spineIds, files }) {
  const zip = new AdmZip();
  // The mimetype entry must come first in a conforming EPUB.
  zip.addFile('mimetype', Buffer.from('application/epub+zip', 'utf-8'));
  zip.addFile('META-INF/container.xml', Buffer.from(CONTAINER_XML, 'utf-8'));
  zip.addFile('content.opf', Buffer.from(buildOpf(items, spineIds), 'utf-8'));
  zip.addFile('toc.ncx', Buffer.from(NCX, 'utf-8'));
  for (const [path, contents] of Object.entries(files)) {
    zip.addFile(path, Buffer.from(contents, 'utf-8'));
  }
  const target = join(here, name);
  writeFileSync(target, zip.toBuffer());
  console.log('wrote', target);
}

// An EPUB 2 the way Calibre and several web exporters actually emit one: the
// content document is declared `text/html`, not `application/xhtml+xml`. The
// SVG page is here so the fixture also covers the second type the reader has
// always accepted, and the stylesheet so a non-chapter manifest entry is
// present.
writeEpub('epub2-text-html.epub', {
  items: [
    { href: 'chapter-1.html', id: 'chapter-1', mediaType: 'text/html' },
    { href: 'chapter-2.html', id: 'chapter-2', mediaType: 'TEXT/HTML; charset=utf-8' },
    { href: 'page-3.svg', id: 'page-3', mediaType: 'image/svg+xml' },
    { href: 'style.css', id: 'css', mediaType: 'text/css' },
    { href: 'toc.ncx', id: 'ncx', mediaType: 'application/x-dtbncx+xml' },
  ],
  spineIds: ['chapter-1', 'chapter-2', 'page-3'],
  files: {
    'chapter-1.html': '<html><body><p>The first chapter, declared as text/html.</p></body></html>',
    'chapter-2.html': '<html><body><p>The second chapter, with a charset parameter.</p></body></html>',
    'page-3.svg': '<svg xmlns="http://www.w3.org/2000/svg"><text>A page rendered as SVG.</text></svg>',
    'style.css': 'body { margin: 0; }',
  },
});

// Same book, declared the way the spec asks for, so the two can be compared
// directly and a regression in the compliant path is visible.
writeEpub('epub2-xhtml.epub', {
  items: [
    { href: 'chapter-1.html', id: 'chapter-1', mediaType: 'application/xhtml+xml' },
    { href: 'toc.ncx', id: 'ncx', mediaType: 'application/x-dtbncx+xml' },
  ],
  spineIds: ['chapter-1'],
  files: {
    'chapter-1.html': '<html><body><p>The first chapter, declared as application/xhtml+xml.</p></body></html>',
  },
});
