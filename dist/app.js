/* ===== Apple Books Reader — App Logic ===== */
;(function() {
  'use strict';

  const APPLE_FONTS = [
    { id: 'songti',   label: '宋体',    css: 'var(--font-songti)' },
    { id: 'heiti',    label: '黑体',    css: 'var(--font-heiti)' },
    { id: 'kaiti',    label: '楷体',    css: 'var(--font-kaiti)' },
    { id: 'yuanti',   label: '圆体',    css: 'var(--font-yuanti)' },
    { id: 'pingfang', label: '苹方',    css: 'var(--font-pingfang)' },
    { id: 'times',    label: 'Times',   css: 'var(--font-times)' },
    { id: 'georgia',  label: 'Georgia', css: 'var(--font-georgia)' },
    { id: 'palatino', label: 'Palatino',css: 'var(--font-palatino)' },
    { id: 'iowan',    label: 'Iowan',   css: 'var(--font-iowan)' },
    { id: 'avenir',   label: 'Avenir',  css: 'var(--font-avenir)' },
    { id: 'newyork',  label: 'New York',css: 'var(--font-newyork)' },
    { id: 'wenkai',   label: '霞鹜文楷', css: 'var(--font-wenkai)' },
    { id: 'xiaowei',  label: '小薇',    css: 'var(--font-xiaowei)' },
  ];

  const state = {
    view: 'library',
    books: [],
    libraryFilter: 'all',
    manageMode: false,
    selectedBooks: new Set(),
    currentBook: null,
    currentChapter: 0,
    currentPage: 0,
    totalPages: 1,
    pageAdvance: 1,
    tocOpen: true,
    settingsOpen: false,
    searchOpen: false,
    settings: {
      theme: 'light',
      fontId: 'songti',
      fontSize: 18,
      columns: 1,
    },
    bookmarks: {},
  };

  const app = document.getElementById('app');

  const icons = {
    chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    bookmarkFilled: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  };

  const coverPalettes = [
    { bg: 'linear-gradient(145deg, #2c3e50 0%, #34495e 100%)', text: '#ecf0f1' },
    { bg: 'linear-gradient(145deg, #8e44ad 0%, #9b59b6 100%)', text: '#f5eef8' },
    { bg: 'linear-gradient(145deg, #27ae60 0%, #2ecc71 100%)', text: '#eafaf1' },
    { bg: 'linear-gradient(145deg, #c0392b 0%, #e74c3c 100%)', text: '#fdedec' },
    { bg: 'linear-gradient(145deg, #2980b9 0%, #3498db 100%)', text: '#ebf5fb' },
    { bg: 'linear-gradient(145deg, #d35400 0%, #e67e22 100%)', text: '#fef5e7' },
    { bg: 'linear-gradient(145deg, #1a5276 0%, #2980b9 100%)', text: '#d6eaf8' },
    { bg: 'linear-gradient(145deg, #7d3c98 0%, #a569bd 100%)', text: '#f4ecf7' },
  ];

  function saveState() {
    localStorage.setItem('ebook_state', JSON.stringify({ settings: state.settings, bookmarks: state.bookmarks }));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem('ebook_state');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.settings) Object.assign(state.settings, data.settings);
      if (data.bookmarks) state.bookmarks = data.bookmarks;
    } catch(e) {}
  }

  function saveBookProgress(bookId) {
    localStorage.setItem('ebook_progress_' + bookId, JSON.stringify({ chapter: state.currentChapter, page: state.currentPage }));
  }

  function getBookProgress(bookId) {
    try {
      const raw = localStorage.getItem('ebook_progress_' + bookId);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  function applyTheme() { document.documentElement.setAttribute('data-theme', state.settings.theme); }
  function applyFont() {
    const font = APPLE_FONTS.find(f => f.id === state.settings.fontId) || APPLE_FONTS[0];
    document.documentElement.style.setProperty('--reading-font-family', font.css);
  }
  function applyFontSize() { document.documentElement.style.setProperty('--reading-font-size', state.settings.fontSize + 'px'); }
  function applyColumns() { document.documentElement.style.setProperty('--reading-columns', state.settings.columns); }

  function renderLibrary() {
    state.view = 'library';
    const allBooks = state.books;
    const isRecent = state.libraryFilter === 'recent';
    const displayedBooks = isRecent ? allBooks.filter(b => getBookProgress(b.id)) : allBooks;

    if (allBooks.length === 0) {
      app.innerHTML = `<div class="library-view"><div class="library-header"><h1>图书</h1></div><div class="library-body"><div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;color:var(--text-tertiary)">${icons.book}<p style="margin-top:12px">拖拽图书文件到此处，或点击添加图书</p></div></div></div>`;
      return;
    }

    const cardsHtml = displayedBooks.map((book, di) => {
      const origIdx = allBooks.indexOf(book);
      const palette = coverPalettes[origIdx % coverPalettes.length];
      let coverHtml;
      if (book.hasCover) {
        coverHtml = `<div class="book-cover real-cover"><img src="/api/cover/${escAttr(book.id)}" alt="${escAttr(book.title)}" loading="lazy"></div>`;
      } else {
        coverHtml = `<div class="book-cover generated" style="background:${palette.bg}"><div class="book-spine"></div><div class="book-cover-inner" style="color:${palette.text}"><div class="cover-title">${escHtml(book.title)}</div><div class="cover-author">${escHtml(book.author || '')}</div></div></div>`;
      }
      const checkbox = state.manageMode ? `<label class="book-checkbox" onclick="event.stopPropagation()"><input type="checkbox" data-book-id="${escAttr(book.id)}" ${state.selectedBooks.has(book.id)?'checked':''}><span class="checkmark"></span></label>` : '';
      return `<div class="book-card fade-in ${state.manageMode?'manage-mode':''}" data-book-index="${origIdx}" data-book-id="${escAttr(book.id)}" style="animation-delay:${di*0.04}s">${checkbox}${coverHtml}<div class="book-info"><div class="book-title-text">${escHtml(book.title)}</div><div class="book-author">${escHtml(book.author || '未知作者')}</div></div></div>`;
    }).join('');

    const emptyRecent = isRecent && displayedBooks.length === 0 ? '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:40vh;color:var(--text-tertiary)"><p>还没有阅读记录</p></div>' : '';

    app.innerHTML = `
      <div class="library-view" id="libraryView">
        <div class="library-header"><h1>图书</h1><div class="library-controls"><div class="segment-control"><button class="segment-btn ${!isRecent?'active':''}" data-filter="all">全部</button><button class="segment-btn ${isRecent?'active':''}" data-filter="recent">最近阅读</button></div><button class="manage-btn" id="manageBtn">${state.manageMode?'取消':'管理'}</button><button class="add-book-btn" id="addFileBtn">+ 添加文件</button><button class="add-book-btn" id="addFolderBtn">+ 添加文件夹</button></div></div>
        ${state.manageMode?`<div class="manage-bar" id="manageBar"><label class="manage-select-all"><input type="checkbox" id="selectAllCb"><span>全选</span></label><button class="manage-delete-btn" id="deleteSelectedBtn" disabled>删除所选 (<span id="selectedCount">0</span>)</button></div>`:''}
        <div class="library-body" id="libraryBody">
          <div class="book-grid">${cardsHtml}</div>
          ${emptyRecent}
          <div class="drop-zone" id="dropZone"><div class="drop-zone-content"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><p>拖拽图书文件到此处</p><span>支持 .txt .md .json .epub .pdf .mobi .azw .azw3</span></div></div>
        </div>
        <input type="file" id="fileInput" accept=".txt,.md,.json,.epub,.pdf,.mobi,.azw,.azw3" multiple style="display:none">
        <input type="file" id="dirInput" webkitdirectory style="display:none">
      </div>`;

    app.querySelectorAll('.book-card').forEach(card => {
      card.addEventListener('click', () => {
        if (state.manageMode) {
          const cb = card.querySelector('input[type="checkbox"]');
          if (cb) { cb.checked = !cb.checked; updateManageSelection(); }
          return;
        }
        openBook(parseInt(card.dataset.bookIndex));
      });
    });
    app.querySelectorAll('.segment-btn').forEach(btn => {
      btn.addEventListener('click', () => { state.libraryFilter = btn.dataset.filter; renderLibrary(); });
    });
    const manageBtn = document.getElementById('manageBtn');
    if (manageBtn) manageBtn.addEventListener('click', () => { state.manageMode = !state.manageMode; state.selectedBooks = new Set(); renderLibrary(); });
    const selectAllCb = document.getElementById('selectAllCb');
    if (selectAllCb) selectAllCb.addEventListener('change', () => { const checked = selectAllCb.checked; app.querySelectorAll('.book-card input[type="checkbox"]').forEach(cb => { cb.checked = checked; }); updateManageSelection(); });
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    if (deleteBtn) deleteBtn.addEventListener('click', deleteSelectedBooks);
    app.querySelectorAll('.book-card input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', updateManageSelection);
    });
    document.getElementById('addFileBtn').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('addFolderBtn').addEventListener('click', () => document.getElementById('dirInput').click());
    document.getElementById('fileInput').addEventListener('change', e => {
      const files = Array.from(e.target.files);
      e.target.value = '';
      handleFiles(files);
    });
    document.getElementById('dirInput').addEventListener('change', e => {
      const files = Array.from(e.target.files);
      e.target.value = '';
      const validExts = ['.txt','.md','.json','.epub','.pdf','.mobi','.azw','.azw3'];
      const valid = files.filter(f => validExts.includes(pathExt(f.name).toLowerCase()));
      if (valid.length > 0) handleFiles(valid);
    });
    const libraryBody = document.getElementById('libraryBody');
    const dropZone = document.getElementById('dropZone');
    ['dragenter','dragover'].forEach(evt => libraryBody.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('active'); }));
    ['dragleave','drop'].forEach(evt => libraryBody.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('active'); }));
    libraryBody.addEventListener('drop', e => handleFiles(Array.from(e.dataTransfer.files)));
  }

  function updateManageSelection() {
    const checked = app.querySelectorAll('.book-card input[type="checkbox"]:checked');
    state.selectedBooks = new Set([...checked].map(cb => cb.dataset.bookId));
    const countEl = document.getElementById('selectedCount');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    if (countEl) countEl.textContent = checked.length;
    if (deleteBtn) deleteBtn.disabled = checked.length === 0;
    const selectAllCb = document.getElementById('selectAllCb');
    if (selectAllCb) selectAllCb.checked = checked.length > 0 && checked.length === app.querySelectorAll('.book-card input[type="checkbox"]').length;
  }

  async function deleteSelectedBooks() {
    if (state.selectedBooks.size === 0) return;
    if (!confirm(`确定要删除 ${state.selectedBooks.size} 本图书吗？此操作不可恢复。`)) return;
    const overlay = document.createElement('div');
    overlay.className = 'upload-overlay';
    overlay.innerHTML = '<div class="upload-spinner"></div><div class="upload-text">正在删除…</div>';
    document.body.appendChild(overlay);
    let failCount = 0;
    for (const bookId of state.selectedBooks) {
      try {
        const res = await fetch('/api/books/' + encodeURIComponent(bookId), { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
      } catch(e) { failCount++; console.error('Delete failed:', bookId, e); }
    }
    state.manageMode = false;
    state.selectedBooks = new Set();
    await loadBooks();
    renderLibrary();
    overlay.remove();
    if (failCount > 0) alert(failCount + ' 本删除失败');
  }

  async function handleFiles(files) {
    const textExts = ['.txt', '.md', '.json'];
    const binaryExts = ['.epub', '.pdf', '.mobi', '.azw', '.azw3'];
    const validFiles = files.filter(f => [...textExts, ...binaryExts].includes(pathExt(f.name).toLowerCase()));
    if (validFiles.length === 0) { alert('不支持的格式，请选择 .txt .md .json .epub .pdf .mobi .azw .azw3 文件'); return; }

    const overlay = document.createElement('div');
    overlay.className = 'upload-overlay';
    overlay.innerHTML = '<div class="upload-spinner"></div><div class="upload-text">正在上传…</div>';
    document.body.appendChild(overlay);

    let successCount = 0;
    let failNames = [];
    for (const file of validFiles) {
      const ext = pathExt(file.name).toLowerCase();
      overlay.querySelector('.upload-text').textContent = '正在上传: ' + file.name;
      try {
        if (textExts.includes(ext)) {
          const content = await file.text();
          const res = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: file.name, content }) });
          if (!res.ok) throw new Error('Server error ' + res.status);
        } else {
          const buf = await file.arrayBuffer();
          const res = await fetch('/api/upload-binary', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'x-filename': encodeURIComponent(file.name) }, body: buf });
          if (!res.ok) throw new Error('Server error ' + res.status);
        }
        successCount++;
      } catch(e) { failNames.push(file.name); console.error('Upload failed:', file.name, e); }
    }

    overlay.querySelector('.upload-text').textContent = '正在更新书架…';
    await loadBooks();
    renderLibrary();
    overlay.remove();

    if (failNames.length > 0) {
      alert('上传失败: ' + failNames.join(', '));
    }
  }

  function pathExt(name) { const d = name.lastIndexOf('.'); return d >= 0 ? name.substring(d) : ''; }

  function openBook(bookIndex) {
    state.currentBook = state.books[bookIndex];
    const progress = getBookProgress(state.currentBook.id);
    state.currentChapter = progress && Number.isInteger(progress.chapter) ? progress.chapter : 0;
    state.currentPage = progress && Number.isInteger(progress.page) ? progress.page : 0;
    state.tocOpen = true;
    state.settingsOpen = false;
    renderReading();
  }

  function renderReading() {
    state.view = 'reading';
    const book = state.currentBook;
    const isBookmarked = (state.bookmarks[book.id] || []).includes(state.currentChapter);

    const isPdf = book.format === 'pdf';
    const tocItems = book.chapters.map((ch, i) =>
      `<button class="toc-item ${i === state.currentChapter ? 'active' : ''}" data-chapter="${i}"><span class="toc-marker"></span><span>${escHtml(ch.title)}</span></button>`
    ).join('');

    const allContent = isPdf
      ? `<div class="pdf-reader" id="pdfReader"><div class="pdf-loading">正在加载 PDF…</div></div>`
      : `<div class="chapter-section" id="chapter-${state.currentChapter}">${renderChapterContent(book.chapters[state.currentChapter])}</div>`;

    const fontBtns = APPLE_FONTS.map(f =>
      `<button class="font-btn ${state.settings.fontId === f.id ? 'active' : ''}" data-font="${f.id}" style="font-family:${f.css}">${f.label}</button>`
    ).join('');

    app.innerHTML = `
      <div class="reading-view">
        <div class="reading-topbar">
          <button class="back-btn" id="backBtn">${icons.chevronLeft} 返回</button>
          <div class="topbar-title">${escHtml(book.title)}</div>
          <div class="topbar-actions">
            <button class="icon-btn" id="searchBtn">${icons.search}</button>
            <button class="icon-btn" id="bookmarkBtn">${isBookmarked ? icons.bookmarkFilled : icons.bookmark}</button>
          </div>
        </div>
        <div class="reading-body">
          <div class="toc-sidebar ${state.tocOpen ? '' : 'collapsed'}" id="tocSidebar">
            <div class="toc-header">目录</div>
            <div class="toc-list" id="tocList">${tocItems}</div>
          </div>
          <div class="reading-scroll ${isPdf ? 'pdf-scroll' : 'paged-scroll'}" id="readingScroll">
            <div class="reading-content ${isPdf ? 'pdf-content' : 'paged-content'}" id="readingContent">${allContent}</div>
          </div>
        </div>
        <div class="reading-toolbar">
          <div class="toolbar-left"><button class="icon-btn" id="tocToggleBtn">${icons.list}</button></div>
          <div class="toolbar-center"><span class="page-indicator" id="pageIndicator">1 / 1</span></div>
          <div class="toolbar-right"><button class="icon-btn" id="settingsBtn">${icons.settings}</button></div>
        </div>
        <div class="settings-panel" id="settingsPanel">
          <div class="settings-row"><span class="settings-label">字号</span><div class="size-control"><button class="size-btn" id="fontDecrease">A-</button><span class="size-value" id="fontSizeVal">${state.settings.fontSize}</span><button class="size-btn" id="fontIncrease">A+</button></div></div>
          <div class="settings-row"><span class="settings-label">字体</span><div class="font-options" id="fontOptions">${fontBtns}</div></div>
          <div class="settings-row"><span class="settings-label">版式</span><div class="column-options"><button class="col-btn ${state.settings.columns===1?'active':''}" data-cols="1">单页</button><button class="col-btn ${state.settings.columns===2?'active':''}" data-cols="2">双页</button></div></div>
          <div class="settings-row"><span class="settings-label">主题</span><div class="theme-options"><button class="theme-btn light-theme ${state.settings.theme==='light'?'active':''}" data-theme="light"></button><button class="theme-btn sepia-theme ${state.settings.theme==='sepia'?'active':''}" data-theme="sepia"></button><button class="theme-btn dark-theme ${state.settings.theme==='dark'?'active':''}" data-theme="dark"></button></div></div>
        </div>
        <div class="search-overlay" id="searchOverlay"><div class="search-box"><div class="search-input-row">${icons.search}<input class="search-input" id="searchInput" placeholder="搜索书内内容…" autofocus><button class="icon-btn" id="searchCloseBtn">${icons.x}</button></div><div class="search-results" id="searchResults"></div></div></div>
      </div>`;

    applyTheme(); applyFont(); applyFontSize(); applyColumns();

    bindReadingEvents();
    if (isPdf) {
      renderPdfBook(book);
    } else {
      requestAnimationFrame(() => layoutPagedContent(state.currentPage));
    }
  }

  function renderChapterContent(chapter) {
    if (!chapter) return '<p>章节内容为空</p>';
    let html = `<h1 class="chapter-title">${escHtml(chapter.title)}</h1>`;
    if (chapter.html) {
      html += sanitizeReadingHtml(chapter.html, chapter.title);
    } else if (chapter.text) {
      html += renderPlainText(chapter.text);
    }
    return html;
  }

  function renderPlainText(text) {
    return String(text || '')
      .split(/\n\s*\n/)
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => `<p>${escHtml(part).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  function sanitizeReadingHtml(rawHtml, chapterTitle) {
    const template = document.createElement('template');
    template.innerHTML = String(rawHtml || '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<svg[\s\S]*?<\/svg>/gi, '');

    const allowedBlocks = new Set(['p', 'blockquote', 'ul', 'ol', 'li', 'pre', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td']);
    const allowedInline = new Set(['br', 'hr', 'em', 'strong', 'b', 'i', 'u', 'sub', 'sup', 'code']);
    const containers = new Set(['html', 'body', 'main', 'article', 'section', 'div', 'header', 'footer', 'aside', 'nav', 'span', 'a']);
    const wrapper = document.createElement('div');
    let skippedDuplicateTitle = false;

    function normalizedText(value) {
      return String(value || '')
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '');
    }

    function cleanChildren(source, target) {
      Array.from(source.childNodes).forEach(child => {
        const cleaned = cleanNode(child);
        if (cleaned) target.appendChild(cleaned);
      });
    }

    function cleanNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (!node.textContent || !node.textContent.replace(/\s+/g, '')) return null;
        return document.createTextNode(node.textContent);
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return null;

      const tag = node.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) {
        if (!node.textContent.trim()) return null;
        if (!skippedDuplicateTitle && normalizedText(node.textContent) === normalizedText(chapterTitle)) {
          skippedDuplicateTitle = true;
          return null;
        }
        const heading = document.createElement(tag === 'h1' ? 'h2' : tag);
        cleanChildren(node, heading);
        return heading.textContent.trim() ? heading : null;
      }

      if (tag === 'img') {
        const src = node.getAttribute('src') || '';
        if (!/^(\/api\/asset\/|data:image\/|https?:\/\/)/i.test(src)) return null;
        const img = document.createElement('img');
        img.src = src;
        img.alt = node.getAttribute('alt') || '';
        return img;
      }

      if (allowedBlocks.has(tag) || allowedInline.has(tag)) {
        const el = document.createElement(tag);
        cleanChildren(node, el);
        if (tag === 'br' || tag === 'hr') return el;
        return el.childNodes.length ? el : null;
      }

      if (containers.has(tag)) {
        const fragment = document.createDocumentFragment();
        cleanChildren(node, fragment);
        return fragment.childNodes.length ? fragment : null;
      }

      return null;
    }

    cleanChildren(template.content, wrapper);
    Array.from(wrapper.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (!text) {
          node.remove();
          return;
        }
        const p = document.createElement('p');
        p.textContent = text;
        node.replaceWith(p);
      }
    });
    wrapper.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, li').forEach(el => {
      if (!el.textContent.trim() && !el.querySelector('img')) el.remove();
    });
    const firstBlock = wrapper.querySelector('p, h1, h2, h3, h4, h5, h6');
    if (firstBlock && normalizedText(firstBlock.textContent) === normalizedText(chapterTitle)) {
      firstBlock.remove();
    }
    return wrapper.innerHTML || renderPlainText(template.content.textContent || '');
  }

  async function renderPdfBook(book) {
    const container = document.getElementById('pdfReader');
    if (!container || !book.fileUrl) return;

    try {
      const pdfjsLib = await import('/vendor/pdf.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.mjs';
      const pdf = await pdfjsLib.getDocument(book.fileUrl).promise;
      container.innerHTML = '';

      for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
        const page = await pdf.getPage(pageNo);
        const baseViewport = page.getViewport({ scale: 1 });
        const targetWidth = Math.min(baseViewport.width, container.clientWidth || 820);
        const scale = targetWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const pageWrap = document.createElement('div');
        pageWrap.className = 'pdf-page';
        pageWrap.id = 'chapter-' + (pageNo - 1);

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';

        pageWrap.appendChild(canvas);
        container.appendChild(pageWrap);
        await page.render({ canvasContext: context, viewport }).promise;
      }

      updatePageIndicator();
    } catch (err) {
      container.innerHTML = `<div class="pdf-error">PDF 加载失败：${escHtml(err.message || err)}</div>`;
    }
  }

  function bindReadingEvents() {
    const book = state.currentBook;
    const scroll = document.getElementById('readingScroll');

    document.getElementById('backBtn').addEventListener('click', () => { saveBookProgress(book.id); renderLibrary(); });
    document.getElementById('tocToggleBtn').addEventListener('click', () => {
      state.tocOpen = !state.tocOpen;
      const sidebar = document.getElementById('tocSidebar');
      sidebar.classList.toggle('collapsed', !state.tocOpen);
      sidebar.addEventListener('transitionend', function handler() {
        sidebar.removeEventListener('transitionend', handler);
        layoutPagedContent(state.currentPage);
      });
    });
    document.getElementById('tocList').addEventListener('click', e => { const item = e.target.closest('.toc-item'); if (item) navigateToChapter(parseInt(item.dataset.chapter)); });
    scroll.addEventListener('scroll', () => { updatePageIndicator(); saveBookProgress(book.id); });
    window.removeEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);

    document.getElementById('settingsBtn').addEventListener('click', () => { state.settingsOpen = !state.settingsOpen; document.getElementById('settingsPanel').classList.toggle('visible', state.settingsOpen); });
    document.getElementById('fontDecrease').addEventListener('click', () => { state.settings.fontSize = Math.max(12, state.settings.fontSize - 2); applyFontSize(); document.getElementById('fontSizeVal').textContent = state.settings.fontSize; saveState(); layoutPagedContent(0); });
    document.getElementById('fontIncrease').addEventListener('click', () => { state.settings.fontSize = Math.min(32, state.settings.fontSize + 2); applyFontSize(); document.getElementById('fontSizeVal').textContent = state.settings.fontSize; saveState(); layoutPagedContent(0); });

    app.querySelectorAll('.font-btn').forEach(btn => {
      btn.addEventListener('click', () => { state.settings.fontId = btn.dataset.font; applyFont(); app.querySelectorAll('.font-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); saveState(); layoutPagedContent(0); });
    });
    app.querySelectorAll('.col-btn').forEach(btn => {
      btn.addEventListener('click', () => { state.settings.columns = parseInt(btn.dataset.cols); applyColumns(); app.querySelectorAll('.col-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); saveState(); layoutPagedContent(0); });
    });
    app.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => { state.settings.theme = btn.dataset.theme; applyTheme(); app.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); saveState(); });
    });
    document.getElementById('bookmarkBtn').addEventListener('click', toggleBookmark);

    document.getElementById('searchBtn').addEventListener('click', () => { state.searchOpen = true; document.getElementById('searchOverlay').classList.add('visible'); document.getElementById('searchInput').focus(); });
    document.getElementById('searchCloseBtn').addEventListener('click', closeSearch);
    document.getElementById('searchOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeSearch(); });
    document.getElementById('searchInput').addEventListener('input', e => performSearch(e.target.value));

    document.removeEventListener('keydown', handleKeydown);
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('click', e => { if (state.settingsOpen && !e.target.closest('.settings-panel') && !e.target.closest('#settingsBtn')) { state.settingsOpen = false; document.getElementById('settingsPanel').classList.remove('visible'); } });
  }

  function updatePageIndicator() {
    const scroll = document.getElementById('readingScroll');
    if (!scroll) return;
    const el = document.getElementById('pageIndicator');
    const book = state.currentBook;
    if (!book) return;

    if (book.format !== 'pdf') {
      state.currentPage = Math.min(state.totalPages - 1, Math.max(0, state.currentPage));
      if (el) el.textContent = (state.currentPage + 1) + ' / ' + state.totalPages;
      return;
    }

    const scrollH = scroll.clientHeight;
    const contentH = scroll.scrollHeight;
    const totalPages = Math.max(1, Math.ceil(contentH / scrollH));
    const currentPage = Math.min(totalPages, Math.floor(scroll.scrollTop / scrollH) + 1);
    if (el) el.textContent = String(currentPage);

    const sections = scroll.querySelectorAll('.chapter-section');
    const scrollCenter = scroll.scrollTop + scroll.clientHeight / 2;
    let activeIdx = 0;
    sections.forEach((sec, i) => { if (sec.offsetTop <= scrollCenter) activeIdx = i; });
    if (activeIdx !== state.currentChapter) {
      state.currentChapter = activeIdx;
      document.querySelectorAll('.toc-item').forEach((item, i) => item.classList.toggle('active', i === activeIdx));
    }
  }

  function layoutPagedContent(targetPage = state.currentPage) {
    const book = state.currentBook;
    if (!book || book.format === 'pdf') return;
    const scroll = document.getElementById('readingScroll');
    const content = document.getElementById('readingContent');
    if (!scroll || !content) return;

    const style = getComputedStyle(scroll);
    const usableWidth = Math.max(320, scroll.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    const usableHeight = Math.max(320, scroll.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom));
    const columns = state.settings.columns === 2 && usableWidth >= 760 ? 2 : 1;
    const gap = columns === 2 ? 56 : 72;
    const columnWidth = Math.floor((usableWidth - gap * (columns - 1)) / columns);
    const columnAdvance = columnWidth + gap;

    content.style.width = usableWidth + 'px';
    content.style.height = usableHeight + 'px';
    content.style.columnCount = columns;
    content.style.columnWidth = columnWidth + 'px';
    content.style.columnGap = gap + 'px';
    content.style.setProperty('--page-column-width', columnWidth + 'px');
    content.style.setProperty('--page-gap', gap + 'px');
    state.pageAdvance = columns * columnAdvance;

    requestAnimationFrame(() => {
      const totalColumns = Math.max(1, Math.round((content.scrollWidth + gap) / columnAdvance));
      state.totalPages = Math.max(1, Math.ceil(totalColumns / columns));
      const page = Math.min(Math.max(0, targetPage), state.totalPages - 1);
      applyPagedPosition(page, false);
    });
  }

  function applyPagedPosition(page, animate = true) {
    const book = state.currentBook;
    const scroll = document.getElementById('readingScroll');
    const content = document.getElementById('readingContent');
    if (!book || !scroll || !content) return;
    state.currentPage = Math.min(state.totalPages - 1, Math.max(0, page));
    scroll.scrollLeft = 0;
    if (!animate) content.classList.add('no-page-transition');
    content.style.transform = `translate3d(${-state.currentPage * state.pageAdvance}px, 0, 0)`;
    if (!animate) requestAnimationFrame(() => content.classList.remove('no-page-transition'));
    updatePageIndicator();
    saveBookProgress(book.id);
  }

  function handleResize() {
    if (state.view !== 'reading') return;
    layoutPagedContent(state.currentPage);
    updatePageIndicator();
  }

  function pageNext() {
    const book = state.currentBook;
    const scroll = document.getElementById('readingScroll');
    if (!book || !scroll) return;
    if (book.format === 'pdf') {
      scroll.scrollBy({ top: scroll.clientHeight - 60, behavior: 'smooth' });
      return;
    }
    if (state.currentPage < state.totalPages - 1) {
      applyPagedPosition(state.currentPage + 1);
    } else if (state.currentChapter < book.chapters.length - 1) {
      state.currentChapter += 1;
      state.currentPage = 0;
      renderReading();
    }
  }

  function pagePrev() {
    const book = state.currentBook;
    const scroll = document.getElementById('readingScroll');
    if (!book || !scroll) return;
    if (book.format === 'pdf') {
      scroll.scrollBy({ top: -(scroll.clientHeight - 60), behavior: 'smooth' });
      return;
    }
    if (state.currentPage > 0) {
      applyPagedPosition(state.currentPage - 1);
    } else if (state.currentChapter > 0) {
      state.currentChapter -= 1;
      state.currentPage = Number.MAX_SAFE_INTEGER;
      renderReading();
    }
  }

  function navigateToChapter(idx) {
    if (idx < 0 || idx >= state.currentBook.chapters.length) return;
    state.currentChapter = idx;
    state.currentPage = 0;
    const book = state.currentBook;
    const isPdf = book.format === 'pdf';
    // Update content without full re-render to preserve TOC scroll position
    const content = document.getElementById('readingContent');
    if (content && !isPdf) {
      content.innerHTML = renderChapterContent(book.chapters[idx]);
      requestAnimationFrame(() => layoutPagedContent(0));
    }
    // Update TOC highlight
    document.querySelectorAll('.toc-item').forEach((item, i) => item.classList.toggle('active', i === idx));
    // Update bookmark icon
    const isBookmarked = (state.bookmarks[book.id] || []).includes(idx);
    const btn = document.getElementById('bookmarkBtn');
    if (btn) btn.innerHTML = isBookmarked ? icons.bookmarkFilled : icons.bookmark;
    saveBookProgress(book.id);
  }

  function toggleBookmark() {
    const book = state.currentBook;
    if (!state.bookmarks[book.id]) state.bookmarks[book.id] = [];
    const arr = state.bookmarks[book.id];
    const idx = arr.indexOf(state.currentChapter);
    if (idx >= 0) arr.splice(idx, 1); else arr.push(state.currentChapter);
    saveState();
    const btn = document.getElementById('bookmarkBtn');
    const isB = arr.includes(state.currentChapter);
    btn.innerHTML = isB ? icons.bookmarkFilled : icons.bookmark;
  }

  function closeSearch() { state.searchOpen = false; document.getElementById('searchOverlay').classList.remove('visible'); }

  function performSearch(query) {
    const results = document.getElementById('searchResults');
    if (!query || query.length < 2) { results.innerHTML = ''; return; }
    const q = query.toLowerCase();
    let html = '', count = 0;
    for (let i = 0; i < state.currentBook.chapters.length && count < 30; i++) {
      const ch = state.currentBook.chapters[i];
      const text = (ch.text || ch.title || '').toLowerCase();
      const pos = text.indexOf(q);
      if (pos >= 0) {
        const start = Math.max(0, pos - 30), end = Math.min(text.length, pos + query.length + 30);
        html += `<div class="search-result-item" data-chapter="${i}"><div>…${escHtml(text.substring(start, end))}…</div><div class="result-chapter">${escHtml(ch.title)}</div></div>`;
        count++;
      }
    }
    if (!html) html = '<div style="padding:20px;text-align:center;color:var(--text-tertiary)">未找到结果</div>';
    results.innerHTML = html;
    results.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        navigateToChapter(parseInt(item.dataset.chapter));
        closeSearch();
        // Scroll to the matching text in the content
        requestAnimationFrame(() => {
          const content = document.getElementById('readingContent');
          if (!content) return;
          const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null);
          while (walker.nextNode()) {
            const node = walker.currentNode;
            const idx = node.textContent.toLowerCase().indexOf(q);
            if (idx >= 0 && node.parentElement) {
              const range = document.createRange();
              range.setStart(node, idx);
              range.setEnd(node, idx + query.length);
              const mark = document.createElement('mark');
              range.surroundContents(mark);
              mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
              setTimeout(() => { mark.replaceWith(mark.textContent); }, 3000);
              break;
            }
          }
        });
      });
    });
  }

  function handleKeydown(e) {
    if (state.view !== 'reading') return;
    if (e.key === 'Escape') { if (state.searchOpen) closeSearch(); else if (state.settingsOpen) { state.settingsOpen = false; document.getElementById('settingsPanel').classList.remove('visible'); } }
    if (e.key === 'ArrowLeft' && !state.searchOpen) { e.preventDefault(); pagePrev(); }
    if (e.key === 'ArrowRight' && !state.searchOpen) { e.preventDefault(); pageNext(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') { e.preventDefault(); state.searchOpen = true; document.getElementById('searchOverlay').classList.add('visible'); document.getElementById('searchInput').focus(); }
  }

  async function loadBooks() {
    try { const res = await fetch('/api/books'); if (!res.ok) throw 0; state.books = await res.json(); } catch(e) { state.books = []; }
  }

  function escHtml(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }
  function escAttr(s) { return encodeURIComponent(String(s)); }

  async function init() { loadState(); applyTheme(); applyFont(); applyFontSize(); applyColumns(); await loadBooks(); renderLibrary(); }
  init();
})();
