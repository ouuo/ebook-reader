const http = require('http');
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const pdfParse = require('pdf-parse');
const { createReadStream } = fs;

const PORT = 3200;
const DIST_DIR = path.join(__dirname, 'dist');
const BOOKS_DIR = path.join(__dirname, 'books');
const COVERS_DIR = path.join(__dirname, 'covers');
const ASSETS_DIR = path.join(__dirname, 'book-assets');
const META_FILE = path.join(__dirname, 'book-meta.json');
const PDFJS_DIR = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'build');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.mjs': 'application/javascript; charset=utf-8',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

// Ensure directories
[BOOKS_DIR, COVERS_DIR, ASSETS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function safeFileName(name) {
  return String(name || '').replace(/[^a-zA-Z0-9_\-一-鿿.]/g, '_');
}

function cleanDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function normalizeZipPath(baseDir, href) {
  const decoded = decodeURIComponent(String(href || '').split('#')[0]);
  const joined = path.posix.normalize(path.posix.join(baseDir || '', decoded));
  return joined.replace(/^\/+/, '');
}

function rewriteLocalAssetUrls(html, fromDir, bookId) {
  return String(html || '').replace(/\s(src|href)="([^"]+)"/gi, (match, attr, rawUrl) => {
    if (/^(https?:|data:|blob:|\/api\/asset\/)/i.test(rawUrl)) return match;
    const assetPath = normalizeZipPath(fromDir, rawUrl);
    return ` ${attr}="/api/asset/${encodeURIComponent(bookId)}/${assetPath.split('/').map(encodeURIComponent).join('/')}"`;
  });
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|blockquote)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function findBookFileById(bookId, allowedExts) {
  const entries = fs.readdirSync(BOOKS_DIR);
  return entries
    .map(entry => ({ entry, ext: path.extname(entry).toLowerCase() }))
    .find(({ entry, ext }) => allowedExts.includes(ext) && path.basename(entry, ext) === bookId);
}

let mobiParserModule;
async function loadMobiParser() {
  if (!mobiParserModule) {
    mobiParserModule = await import(pathToFileUrl(path.join(__dirname, 'node_modules', '@lingo-reader', 'mobi-parser', 'dist', 'index.node.mjs')));
  }
  return mobiParserModule;
}

function pathToFileUrl(filePath) {
  return 'file://' + filePath.split(path.sep).map(encodeURIComponent).join('/');
}

// ===== Metadata cache =====
function loadMeta() {
  try {
    if (fs.existsSync(META_FILE)) return JSON.parse(fs.readFileSync(META_FILE, 'utf-8'));
  } catch(e) {}
  return {};
}

function saveMeta(meta) {
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2), 'utf-8');
}

// ===== Parse .txt book =====
function parseTxtBook(filePath, fileName) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n');
  const chapters = [];
  let currentChapter = null;
  let currentLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const isChapterHeading = /^(第[零一二三四五六七八九十百千万\d]+[章节篇部]|[Cc]hapter\s+\d+|[Pp]art\s+\d+|前言|序言|引言|后记|附录|版权|楔子|尾声|引子|番外)/.test(trimmed)
      || (/^#{1,3}\s+/.test(trimmed));

    if (isChapterHeading && trimmed.length > 0) {
      if (currentChapter !== null) {
        currentChapter.text = currentLines.join('\n');
        chapters.push(currentChapter);
      }
      const cleanTitle = trimmed.replace(/^#+\s*/, '');
      currentChapter = { title: cleanTitle, text: '' };
      currentLines = [];
    } else {
      if (currentChapter === null) {
        currentChapter = { title: trimmed || fileName.replace(/\.txt$/i, ''), text: '' };
        currentLines = [];
      }
      currentLines.push(line);
    }
  }

  if (currentChapter !== null) {
    currentChapter.text = currentLines.join('\n');
    chapters.push(currentChapter);
  }

  if (chapters.length === 0) {
    chapters.push({ title: fileName.replace(/\.txt$/i, ''), text: raw });
  }

  return { chapters, title: fileName.replace(/\.txt$/i, ''), author: '' };
}

// ===== Parse .md book =====
function parseMdBook(filePath, fileName) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const chapters = [];
  const parts = raw.split(/^(#{1,3}\s+.+)$/m);

  let currentChapter = null;
  let currentText = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (/^#{1,3}\s+/.test(part)) {
      if (currentChapter !== null) {
        currentChapter.text = currentText.trim();
        chapters.push(currentChapter);
      }
      const level = part.match(/^(#{1,3})/)[1].length;
      currentChapter = { title: part.replace(/^#{1,3}\s+/, '').trim(), level: level - 1, text: '' };
      currentText = '';
    } else {
      currentText += part;
    }
  }

  if (currentChapter !== null) {
    currentChapter.text = currentText.trim();
    chapters.push(currentChapter);
  }

  if (chapters.length === 0) {
    chapters.push({ title: fileName.replace(/\.md$/i, ''), text: raw });
  }

  return { chapters, title: fileName.replace(/\.md$/i, ''), author: '' };
}

// ===== Parse JSON book =====
function parseJsonBook(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return {
      chapters: data.chapters || [],
      title: data.title || path.basename(filePath, '.json'),
      author: data.author || '',
    };
  } catch(e) {
    console.error(`Failed to parse ${filePath}:`, e.message);
    return null;
  }
}

// ===== Parse EPUB via JSZip — cover, metadata, TOC, content =====
async function parseEpubBook(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(buf);
    const bookId = path.basename(filePath, '.epub');

    // 1. Find OPF path from container.xml
    const containerFile = zip.file('META-INF/container.xml');
    if (!containerFile) { console.error(`No container.xml in ${filePath}`); return null; }
    const containerXml = await containerFile.async('text');
    const opfMatch = containerXml.match(/full-path="([^"]+)"/);
    const opfPath = opfMatch ? opfMatch[1] : 'OEBPS/content.opf';
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

    // 2. Read OPF for metadata
    const opfFile = zip.file(opfPath);
    if (!opfFile) { console.error(`OPF not found: ${opfPath}`); return null; }
    const opfXml = await opfFile.async('text');

    // Extract title and author from Dublin Core
    const titleMatch = opfXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/);
    const creatorMatch = opfXml.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/);
    const title = titleMatch ? titleMatch[1].trim() : bookId;
    const author = creatorMatch ? creatorMatch[1].trim() : '';

    // 3. Extract cover image
    let coverSaved = false;
    let coverHref = null;

    // Method 1: <meta name="cover" content="idref"> -> find in manifest
    const coverMetaMatch = opfXml.match(/<meta[^>]*name="cover"[^>]*content="([^"]+)"/);
    if (coverMetaMatch) {
      const escaped = coverMetaMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const itemMatch = opfXml.match(new RegExp('<item[^>]*id="' + escaped + '"[^>]*>'));
      if (itemMatch) {
        const hrefM = itemMatch[0].match(/href="([^"]+)"/);
        if (hrefM) coverHref = hrefM[1];
      }
    }

    // Method 2: properties="cover-image"
    if (!coverHref) {
      const m = opfXml.match(/<item[^>]*properties="[^"]*cover-image[^"]*"[^>]*href="([^"]+)"/);
      if (m) coverHref = m[1];
    }

    // Method 3: id contains "cover" + image media-type
    if (!coverHref) {
      const m = opfXml.match(/<item[^>]*id="[^"]*cover[^"]*"[^>]*href="([^"]+)"[^>]*media-type="image\//);
      if (!m) {
        const m2 = opfXml.match(/<item[^>]*media-type="image\/[^"]*"[^>]*id="[^"]*cover[^"]*"[^>]*href="([^"]+)"/);
        if (m2) coverHref = m2[1];
      } else {
        coverHref = m[1];
      }
    }

    if (coverHref) {
      const fullPath = opfDir + decodeURIComponent(coverHref);
      const coverFile = zip.file(fullPath);
      if (coverFile) {
        const coverData = await coverFile.async('nodebuffer');
        const ext = coverHref.match(/\.(jpg|jpeg|png|gif|webp)/i) ? coverHref.match(/\.(jpg|jpeg|png|gif|webp)/i)[1] : 'jpg';
        fs.writeFileSync(path.join(COVERS_DIR, `${bookId}.${ext}`), coverData);
        coverSaved = true;
      }
    }

    // 4. Build spine order (reading order)
    const spineIdRefs = [...opfXml.matchAll(/<itemref[^>]*idref="([^"]+)"/g)].map(m => m[1]);

    // 5. Build manifest map: id -> { href, mediaType }
    const manifest = {};
    const itemRegex = /<item[^>]*>/g;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(opfXml)) !== null) {
      const item = itemMatch[0];
      const idM = item.match(/id="([^"]+)"/);
      const hrefM = item.match(/href="([^"]+)"/);
      const typeM = item.match(/media-type="([^"]+)"/);
      if (idM && hrefM) {
        manifest[idM[1]] = { href: hrefM[1], mediaType: typeM ? typeM[1] : '' };
      }
    }

    const assetDir = path.join(ASSETS_DIR, bookId);
    cleanDir(assetDir);
    for (const item of Object.values(manifest)) {
      if (!/^image\//.test(item.mediaType)) continue;
      const assetZipPath = normalizeZipPath(opfDir, item.href);
      const assetFile = zip.file(assetZipPath);
      if (!assetFile) continue;
      const assetOutPath = path.join(assetDir, assetZipPath);
      fs.mkdirSync(path.dirname(assetOutPath), { recursive: true });
      fs.writeFileSync(assetOutPath, await assetFile.async('nodebuffer'));
    }

    // 6. Parse NCX/NAV TOC for chapter titles
    const tocByHref = new Map();

    // NCX TOC
    const ncxItem = opfXml.match(/href="([^"]+)"[^>]*media-type="application\/x-dtbncx\+xml"/)
      || opfXml.match(/<item[^>]*media-type="application\/x-dtbncx\+xml"[^>]*href="([^"]+)"/);
    if (ncxItem) {
      const ncxPath = opfDir + ncxItem[1];
      const ncxFile = zip.file(ncxPath);
      if (ncxFile) {
        const ncxXml = await ncxFile.async('text');
        const navPoints = [...ncxXml.matchAll(/<navPoint[^>]*>[\s\S]*?<content[^>]*src="([^"#]+)(?:#[^"]*)?"[^>]*\/?>[\s\S]*?<text>([^<]+)<\/text>/g)];
        for (const np of navPoints) {
          const href = decodeURIComponent(np[1].trim());
          const label = np[2].trim();
          if (href && label) tocByHref.set(href, label);
        }
        // Also try alternate NCX format where <text> comes before <content>
        const navPoints2 = [...ncxXml.matchAll(/<navPoint[^>]*>[\s\S]*?<text>([^<]+)<\/text>[\s\S]*?<content[^>]*src="([^"#]+)(?:#[^"]*)?"/g)];
        for (const np of navPoints2) {
          const label = np[1].trim();
          const href = decodeURIComponent(np[2].trim());
          if (href && label && !tocByHref.has(href)) tocByHref.set(href, label);
        }
      }
    }

    // NAV XHTML TOC (EPUB 3)
    const navItem = opfXml.match(/href="([^"]+)"[^>]*properties="[^"]*nav[^"]*"/)
      || opfXml.match(/<item[^>]*properties="[^"]*nav[^"]*"[^>]*href="([^"]+)"/);
    if (navItem) {
      const navPath = opfDir + navItem[1];
      const navFile = zip.file(navPath);
      if (navFile) {
        const navHtml = await navFile.async('text');
        const navLinks = [...navHtml.matchAll(/<a[^>]*href="([^"#]+)(?:#[^"]*)?"[^>]*>([\s\S]*?)<\/a>/g)];
        for (const nl of navLinks) {
          const href = decodeURIComponent(nl[1].trim());
          const label = nl[2].replace(/<[^>]+>/g, '').trim();
          if (href && label && !tocByHref.has(href)) tocByHref.set(href, label);
        }
      }
    }

    // 7. Extract chapters in spine order
    const chapters = [];
    const htmlMediaTypes = ['application/xhtml+xml', 'text/html'];
    const htmlItems = spineIdRefs.filter(id => manifest[id] && htmlMediaTypes.includes(manifest[id].mediaType));

    for (const id of htmlItems) {
      const item = manifest[id];
      const chapterPath = normalizeZipPath(opfDir, item.href);
      const chapterFile = zip.file(chapterPath);
      if (!chapterFile) continue;

      const rawHtml = await chapterFile.async('text');

      // Extract <body> content only
      let bodyContent = rawHtml;
      const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch) bodyContent = bodyMatch[1];
      bodyContent = rewriteLocalAssetUrls(bodyContent, path.posix.dirname(chapterPath), bookId);

      // Skip cover pages (only contain SVG/image, no real text)
      const textOnlyForCheck = bodyContent.replace(/<svg[\s\S]*?<\/svg>/gi, '').replace(/<img[^>]+>/gi, '').replace(/<[^>]+>/g, '').trim();
      if (textOnlyForCheck.length < 5) continue;

      // Extract title: prefer TOC, then h1/h2, then <title>, then id
      let chTitle = '';

      // Try TOC lookup first
      const tocKey = item.href;
      const tocKeyDecoded = decodeURIComponent(item.href);
      if (tocByHref.has(tocKey)) chTitle = tocByHref.get(tocKey);
      else if (tocByHref.has(tocKeyDecoded)) chTitle = tocByHref.get(tocKeyDecoded);

      // Try h1
      if (!chTitle) {
        const h1M = bodyContent.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        if (h1M) chTitle = h1M[1].replace(/<[^>]+>/g, '').trim();
      }
      // Try h2
      if (!chTitle) {
        const h2M = bodyContent.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
        if (h2M) chTitle = h2M[1].replace(/<[^>]+>/g, '').trim();
      }
      // Fall back to <title> tag (skip generic values)
      if (!chTitle) {
        const titleM = rawHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleM && titleM[1].trim() && !['未知','Cover','Contents','目录'].includes(titleM[1].trim())) {
          chTitle = titleM[1].trim();
        }
      }
      // If title is still an id-like string, extract from first <p> text
      if (!chTitle || /^id[_\d]+$/.test(chTitle) || /^id\d+$/.test(chTitle) || /^id[a-zA-Z]?\d+$/.test(chTitle)) {
        const pMatches = [...bodyContent.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
        for (const pM of pMatches) {
          const pText = pM[1].replace(/<[^>]+>/g, '').trim();
          if (pText.length > 2 && pText.length < 60) { chTitle = pText; break; }
        }
      }
      if (!chTitle) chTitle = id;

      // Skip TOC pages (contain many <a href> links to other chapters)
      const linkCount = (bodyContent.match(/<a[^>]+href="[^"]*\.html/gi) || []).length;
      if (linkCount > 5) continue;

      // Clean HTML for rendering: keep document structure, strip executable and layout-heavy attributes.
      const cleanHtml = bodyContent
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<svg[\s\S]*?<\/svg>/gi, '')
        .replace(/<link[^>]+>/gi, '')
        .replace(/<div[^>]*><\/div>/gi, '')
        .replace(/\s+class="[^"]*"/gi, '')
        .replace(/\s+style="[^"]*"/gi, '')
        .replace(/\s+id="[^"]*"/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/<a[^>]*href="[^"]*"[^>]*>/gi, '')
        .replace(/<\/a>/gi, '')
        .replace(/\n{2,}/g, '\n')
        .trim();

      // Also generate plain text version
      const cleanText = htmlToText(bodyContent);

      // Skip chapters with very little content
      if (cleanText.length < 20) continue;

      chapters.push({ title: chTitle, text: cleanText, html: cleanHtml });
    }

    if (chapters.length === 0) {
      chapters.push({ title, text: '无法解析此EPUB的内容', html: '' });
    }

    return { id: bookId, title, author, format: 'epub', hasCover: coverSaved, chapters }
  } catch(e) {
    console.error(`EPUB error ${filePath}:`, e.message);
    return null;
  }
}

async function parseMobiBook(filePath, ext) {
  const bookId = path.basename(filePath, ext);
  const assetDir = path.join(ASSETS_DIR, bookId);
  cleanDir(assetDir);
  const { initMobiFile, initKf8File } = await loadMobiParser();

  let parser;
  try {
    parser = ext === '.azw3' ? await initKf8File(filePath, assetDir) : await initMobiFile(filePath, assetDir);
  } catch (mobiError) {
    if (ext === '.mobi' || ext === '.azw') {
      try {
        parser = await initKf8File(filePath, assetDir);
      } catch (kf8Error) {
        console.error(`MOBI parse error ${filePath}:`, mobiError.message || mobiError);
        return null;
      }
    } else {
      console.error(`KF8 parse error ${filePath}:`, mobiError.message || mobiError);
      return null;
    }
  }

  try {
    const metadata = parser.getMetadata ? parser.getMetadata() : {};
    const spine = parser.getSpine ? parser.getSpine() : [];
    const toc = parser.getToc ? parser.getToc() : [];
    const tocByHref = new Map();

    function collectToc(items) {
      (items || []).forEach(item => {
        if (item.href && item.label) tocByHref.set(String(item.href).split('#')[0], item.label);
        collectToc(item.children);
      });
    }
    collectToc(toc);

    const chapters = [];
    spine.forEach((spineItem, index) => {
      const id = spineItem.id || spineItem.href || String(index);
      const loaded = parser.loadChapter(id);
      if (!loaded || !loaded.html) return;
      const html = String(loaded.html).replace(new RegExp(assetDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `/api/asset/${encodeURIComponent(bookId)}`);
      const text = htmlToText(html);
      if (text.length < 5) return;
      const hrefKey = String(spineItem.href || id).split('#')[0];
      const title = tocByHref.get(hrefKey) || toc[index]?.label || firstHeadingText(html) || `第${chapters.length + 1}章`;
      chapters.push({ title, text, html });
    });

    if (chapters.length === 0) {
      chapters.push({ title: metadata.title || bookId, text: '无法解析此 Kindle 文件的正文内容。', html: '' });
    }

    const title = metadata.title || bookId;
    const author = Array.isArray(metadata.author) ? metadata.author.join(', ') : (metadata.author || '');
    return { id: bookId, title, author, format: ext === '.azw3' ? 'azw3' : 'mobi', hasCover: false, chapters };
  } finally {
    if (parser && parser.destroy) parser.destroy();
  }
}

function firstHeadingText(html) {
  const heading = String(html || '').match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
  return heading ? htmlToText(heading[1]).slice(0, 80) : '';
}

// ===== Parse PDF =====
async function parsePdfBook(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const fullText = data.text;
    const title = data.info?.Title || path.basename(filePath, '.pdf');
    const author = data.info?.Author || '';
    const bookId = path.basename(filePath, '.pdf');

    // Generate cover from first page (just save metadata)
    // We can't easily extract PDF cover in pure JS, use placeholder

    const chapters = [];
    const lines = fullText.split('\n');
    let currentChapter = { title, text: '' };
    let currentLines = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const isChapterHeading = /^(第[零一二三四五六七八九十百千万\d]+[章节篇部]|[Cc]hapter\s+\d+|[Pp]art\s+\d+|前言|序言|引言|后记|附录)/.test(trimmed);

      if (isChapterHeading && trimmed.length > 0 && trimmed.length < 50) {
        if (currentLines.length > 0) {
          currentChapter.text = currentLines.join('\n');
          if (currentChapter.text.trim()) chapters.push(currentChapter);
        }
        currentChapter = { title: trimmed, text: '' };
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }

    if (currentLines.length > 0) {
      currentChapter.text = currentLines.join('\n');
      if (currentChapter.text.trim()) chapters.push(currentChapter);
    }

    if (chapters.length === 0) {
      const chunkSize = 3000;
      for (let i = 0; i < fullText.length; i += chunkSize) {
        const chunk = fullText.substring(i, i + chunkSize).trim();
        if (chunk) chapters.push({ title: `第${chapters.length + 1}节`, text: chunk });
      }
    }

    return {
      id: bookId,
      title,
      author,
      format: 'pdf',
      fileUrl: `/api/file/${encodeURIComponent(bookId)}`,
      chapters: chapters.length > 0 ? chapters : [{ title, text: fullText || '无法解析内容' }],
    };
  } catch(e) {
    console.error(`PDF parse error ${filePath}:`, e.message);
    return null;
  }
}

// ===== Scan books =====
async function scanBooks() {
  const books = [];
  const meta = loadMeta();

  if (!fs.existsSync(BOOKS_DIR)) return books;

  const entries = fs.readdirSync(BOOKS_DIR);
  for (const entry of entries) {
    try {
      const fullPath = path.join(BOOKS_DIR, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        const bookId = entry;
        const dirCached = meta[bookId] || {};
        if (dirCached.hidden) continue;
        const subFiles = fs.readdirSync(fullPath).sort();
        const chapters = [];

        for (const sub of subFiles) {
          const subPath = path.join(fullPath, sub);
          const subStat = fs.statSync(subPath);
          if (subStat.isFile()) {
            const ext = path.extname(sub).toLowerCase();
            const chapterName = path.basename(sub, path.extname(sub));
            if (ext === '.txt' || ext === '.md') {
              chapters.push({ title: chapterName, text: fs.readFileSync(subPath, 'utf-8') });
            } else if (ext === '.html') {
              chapters.push({ title: chapterName, html: fs.readFileSync(subPath, 'utf-8') });
            }
          }
        }

        if (chapters.length > 0) {
          const cached = meta[bookId] || {};
          books.push({
            id: bookId,
            title: cached.title || entry,
            author: cached.author || '',
            hasCover: cached.hasCover || false,
            chapters,
          });
        }
      } else if (stat.isFile()) {
        const ext = path.extname(entry).toLowerCase();
        const bookId = path.basename(entry, ext);
        const cached = meta[bookId] || {};
        if (cached.hidden) continue;

        if (ext === '.txt') {
          const parsed = parseTxtBook(fullPath, entry);
          books.push({ id: bookId, title: parsed.title, author: parsed.author, format: 'txt', hasCover: false, chapters: parsed.chapters });
        } else if (ext === '.md') {
          const parsed = parseMdBook(fullPath, entry);
          books.push({ id: bookId, title: parsed.title, author: parsed.author, format: 'md', hasCover: false, chapters: parsed.chapters });
        } else if (ext === '.json') {
          const parsed = parseJsonBook(fullPath);
          if (parsed) books.push({ id: bookId, title: parsed.title, author: parsed.author, format: 'json', hasCover: false, chapters: parsed.chapters });
        } else if (ext === '.epub') {
          const book = await parseEpubBook(fullPath);
          if (book) {
            const coverFiles = fs.readdirSync(COVERS_DIR).filter(f => f.startsWith(bookId + '.'));
            const hasCover = coverFiles.length > 0;
            meta[bookId] = { title: book.title, author: book.author, hasCover };
            books.push({ ...book, hasCover });
          }
        } else if (ext === '.mobi' || ext === '.azw' || ext === '.azw3') {
          const book = await parseMobiBook(fullPath, ext);
          if (book) {
            meta[bookId] = { title: book.title, author: book.author, hasCover: false };
            books.push({ ...book, hasCover: false });
          }
        } else if (ext === '.pdf') {
          const book = await parsePdfBook(fullPath);
          if (book) {
            meta[bookId] = { title: book.title, author: book.author, hasCover: false };
            books.push({ ...book, hasCover: false });
          }
        }
      }
    } catch(e) { console.error(`scanBooks error for ${entry}:`, e.message); }
  }

  saveMeta(meta);
  return books;
}

// ===== Server =====
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const urlPath = url.pathname;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');

  // API: list books
  if (urlPath === '/api/books' && req.method === 'GET') {
    const books = await scanBooks();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify(books));
    return;
  }

  // API: get cover image
  if (urlPath.startsWith('/api/cover/') && req.method === 'GET') {
    const bookId = decodeURIComponent(urlPath.replace('/api/cover/', ''));
    const coverFiles = fs.readdirSync(COVERS_DIR).filter(f => f.startsWith(bookId + '.'));
    if (coverFiles.length > 0) {
      const coverPath = path.join(COVERS_DIR, coverFiles[0]);
      const ext = path.extname(coverPath);
      const data = fs.readFileSync(coverPath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'image/jpeg', 'Cache-Control': 'public, max-age=86400' });
      res.end(data);
    } else {
      res.writeHead(404);
      res.end('No cover');
    }
    return;
  }

  if (urlPath.startsWith('/api/file/') && req.method === 'GET') {
    const bookId = decodeURIComponent(urlPath.replace('/api/file/', ''));
    const found = findBookFileById(bookId, ['.pdf']);
    if (!found) {
      res.writeHead(404);
      res.end('No file');
      return;
    }
    const filePath = path.join(BOOKS_DIR, found.entry);
    res.writeHead(200, { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-cache' });
    createReadStream(filePath).pipe(res);
    return;
  }

  if (urlPath.startsWith('/api/asset/') && req.method === 'GET') {
    const parts = urlPath.replace('/api/asset/', '').split('/').map(decodeURIComponent);
    const bookId = parts.shift();
    const relPath = parts.join('/');
    const root = path.resolve(ASSETS_DIR, bookId || '');
    const assetPath = path.resolve(root, relPath || '');
    if (!bookId || !assetPath.startsWith(root + path.sep) || !fs.existsSync(assetPath)) {
      res.writeHead(404);
      res.end('No asset');
      return;
    }
    const ext = path.extname(assetPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=86400' });
    createReadStream(assetPath).pipe(res);
    return;
  }

  if (urlPath === '/vendor/pdf.mjs' && req.method === 'GET') {
    const filePath = path.join(PDFJS_DIR, 'pdf.mjs');
    res.writeHead(200, { 'Content-Type': MIME['.mjs'], 'Cache-Control': 'public, max-age=86400' });
    createReadStream(filePath).pipe(res);
    return;
  }

  if (urlPath === '/vendor/pdf.worker.mjs' && req.method === 'GET') {
    const filePath = path.join(PDFJS_DIR, 'pdf.worker.mjs');
    res.writeHead(200, { 'Content-Type': MIME['.mjs'], 'Cache-Control': 'public, max-age=86400' });
    createReadStream(filePath).pipe(res);
    return;
  }

  // API: upload text book
  if (urlPath === '/api/upload' && req.method === 'POST') {
    const chunks = [];
    req.on('error', () => { try { res.writeHead(500); res.end('Upload error'); } catch(e){} });
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const payload = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
        const { filename, content } = payload;
        if (!filename || !content) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing filename or content' }));
          return;
        }
        const safeName = safeFileName(filename);
        fs.writeFileSync(path.join(BOOKS_DIR, safeName), content, 'utf-8');
        console.log(`Uploaded: ${safeName}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch(e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // API: upload binary book (epub, pdf, mobi, azw)
  if (urlPath === '/api/upload-binary' && req.method === 'POST') {
    const filename = req.headers['x-filename'] || 'unknown';
    const chunks = [];
    req.on('error', () => { try { res.writeHead(500); res.end('Upload error'); } catch(e){} });
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const safeName = safeFileName(decodeURIComponent(filename)).replace(/[\/<>:|?*]/g, '_');
        fs.writeFileSync(path.join(BOOKS_DIR, safeName), Buffer.concat(chunks));
        console.log(`Uploaded binary: ${safeName}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch(e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // API: add local file or directory
  if (urlPath === '/api/add-local' && req.method === 'POST') {
    const chunks = [];
    req.on('error', () => { try { res.writeHead(500); res.end('Upload error'); } catch(e){} });
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const { localPath } = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
        if (!localPath) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing localPath' }));
          return;
        }
        const resolved = path.resolve(localPath);
        if (!fs.existsSync(resolved)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '路径不存在: ' + resolved }));
          return;
        }
        const stat = fs.statSync(resolved);
        const validExts = ['.txt', '.md', '.json', '.epub', '.pdf', '.mobi', '.azw', '.azw3'];
        let added = [];

        function copyFile(src) {
          const ext = path.extname(src).toLowerCase();
          if (!validExts.includes(ext)) return;
          const safeName = safeFileName(path.basename(src)).replace(/[\/<>:|?*]/g, '_');
          const dest = path.join(BOOKS_DIR, safeName);
          if (path.resolve(src) === path.resolve(dest)) return;
          fs.copyFileSync(src, dest);
          added.push(safeName);
        }

        if (stat.isFile()) {
          copyFile(resolved);
        } else if (stat.isDirectory()) {
          function scanDir(dir) {
            fs.readdirSync(dir).forEach(name => {
              const fullPath = path.join(dir, name);
              const s = fs.statSync(fullPath);
              if (s.isFile()) copyFile(fullPath);
              else if (s.isDirectory()) scanDir(fullPath);
            });
          }
          scanDir(resolved);
        }

        console.log(`Added local: ${added.join(', ') || '(no valid files)'}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, added }));
      } catch(e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // API: delete book
  if (urlPath.startsWith('/api/books/') && req.method === 'DELETE') {
    const bookId = decodeURIComponent(urlPath.replace('/api/books/', ''));
    try {
      const meta = loadMeta();
      // Delete cover
      fs.readdirSync(COVERS_DIR).filter(f => f.startsWith(bookId + '.')).forEach(f => fs.rmSync(path.join(COVERS_DIR, f), { force: true }));
      // Delete assets
      const assetDir = path.join(ASSETS_DIR, bookId);
      if (fs.existsSync(assetDir)) fs.rmSync(assetDir, { recursive: true, force: true });
      // Mark as hidden in meta (don't delete source files)
      meta[bookId] = meta[bookId] || {};
      meta[bookId].hidden = true;
      saveMeta(meta);
      console.log(`Removed from shelf: ${bookId}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Static files
  let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Ebook Reader running at http://localhost:${PORT}`);
  console.log(`Books: ${BOOKS_DIR}`);
  console.log(`Supported: .txt .md .json .epub .pdf .mobi .azw .azw3`);
});
