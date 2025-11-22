// 学习页专属脚本
document.addEventListener('DOMContentLoaded', () => {
  const state = {
    books: [],
    preferences: window.RuswordData ? window.RuswordData.getPreferences() : null
  };

  const dom = {
    bookGrid: document.querySelector('#bookGrid'),
    uploadInput: document.querySelector('#bookUpload'),
    uploadLabel: document.querySelector('#uploadLabel'),
    studyTips: document.querySelector('#studyTips'),
    bookStatus: document.querySelector('#bookStatus'),
    bookModal: document.querySelector('#bookModal'),
    bookModalTitle: document.querySelector('#bookModalTitle'),
    bookModalSummary: document.querySelector('#bookModalSummary'),
    bookModalChips: document.querySelector('#bookModalChips'),
    bookModalTable: document.querySelector('#bookModalTable'),
    bookModalHint: document.querySelector('#bookModalHint'),
    bookModalClose: document.querySelector('#bookModal .book-modal__close')
  };

  const BOOK_PREVIEW_LIMIT = 100;

  if (!window.RuswordData) {
    console.warn('RuswordData 未加载，页面交互将无法正常工作。');
    return;
  }

  init();

  // 监听内置词书加载完成事件
  window.addEventListener('builtinBookLoaded', () => {
    state.books = window.RuswordData.getBooks();
    renderBookCards();
  });

  // 主动尝试加载内置词书（确保XLSX库已加载）
  function tryLoadBuiltinBook(attempt = 0) {
    const maxAttempts = 50; // 最多尝试5秒 (50 * 100ms)
    
    if (!window.XLSX || !window.XLSX.read) {
      // 如果XLSX库还没加载，等待一下再试
      if (attempt < maxAttempts) {
        setTimeout(() => tryLoadBuiltinBook(attempt + 1), 100);
      } else {
        console.warn('XLSX库加载超时，无法加载内置词书');
      }
      return;
    }

    console.log('XLSX库已加载，开始检查内置词书...');

    // 检查是否已有内置词书
    const books = window.RuswordData.getBooks();
    const hasBuiltin = books.some((book) => book.id === 'builtin-«Первые шаги»');
    
    if (hasBuiltin) {
      console.log('内置词书已存在，跳过加载');
      return;
    }
    
    console.log('内置词书不存在，开始加载...');
    
    // 调用data.js中的loadBuiltinBook函数
    if (window.RuswordData.loadBuiltinBook) {
      window.RuswordData.loadBuiltinBook().then((builtinBook) => {
        if (builtinBook) {
          // 再次检查是否已存在（防止并发加载）
          const currentBooks = window.RuswordData.getBooks();
          const stillMissing = !currentBooks.some((book) => book.id === 'builtin-«Первые шаги»');
          
          if (stillMissing) {
            console.log('内置词书加载成功，添加到词库...');
            window.RuswordData.addBook(builtinBook);
            state.books = window.RuswordData.getBooks();
            renderBookCards();
            showStatus(`内置词书《${builtinBook.title}》已加载，共 ${builtinBook.totalWords} 个单词。`);
          } else {
            console.log('内置词书已在加载过程中被添加，跳过重复添加');
            state.books = window.RuswordData.getBooks();
            renderBookCards();
          }
        } else {
          console.warn('内置词书加载返回null，可能文件不存在或格式不正确');
        }
      }).catch((error) => {
        console.error('加载内置词书失败:', error);
        showStatus(`加载内置词书失败: ${error.message}`);
      });
    } else {
      console.warn('window.RuswordData.loadBuiltinBook 函数不存在');
    }
  }

  // 延迟一点再尝试加载，确保所有脚本都已加载
  setTimeout(tryLoadBuiltinBook, 200);

  function init() {
    // 先清理重复的内置词书
    window.RuswordData.cleanupDuplicateBuiltinBooks();
    state.books = window.RuswordData.getBooks();
    renderBookCards();
    setupUploader();
    updatePlanSummary();
  }

  function renderBookCards() {
    if (!dom.bookGrid) return;
    dom.bookGrid.innerHTML = '';
    if (!state.books.length) {
      dom.bookGrid.innerHTML = `<div class="empty-state">暂时还没有词书，快来上传一本吧～</div>`;
      return;
    }
    const fragment = document.createDocumentFragment();
    state.books.forEach((book, index) => {
      const card = document.createElement('article');
      card.className = 'card fade-in';
      const wordCount = book.words && book.words.length ? book.words.length : book.totalWords || 0;
      const units = deriveUnits(book);
      const coverSource =
        book.cover && book.cover.trim() ? book.cover : buildCoverSvg(book.title || `Custom ${index + 1}`);
      card.innerHTML = `
        <img class="book-cover" src="${coverSource}" alt="${book.title}" data-title="${book.title}">
        <div class="book-meta">
          <h3>${book.title}</h3>
          <span class="pill">${wordCount} 词</span>
          ${units.length ? `<span class="pill pill-secondary">${units.length} 个单元</span>` : ''}
        </div>
        <p>${book.description || '自定义词书，请稍后添加示例单词。'}</p>
        <div>
          ${(book.tags || [])
            .map((tag) => `<span class="tag">${tag}</span>`)
            .join('')}
        </div>
        <div class="card-actions" style="margin-top:20px;">
          <button class="btn-primary" data-action="start" data-book="${book.id}">进入背词练习</button>
          <button class="btn-secondary" data-action="preview" data-book="${book.id}">词书详情</button>
          <button class="btn-danger" data-action="delete" data-book="${book.id}">删除词书</button>
        </div>
      `;
      fragment.appendChild(card);
    });
    dom.bookGrid.appendChild(fragment);
    setupCardActions();
    attachCoverFallbacks();
    // 让新加入的卡片也可以渐入
    requestAnimationFrame(() => {
      document.querySelectorAll('.card.fade-in').forEach((el) => el.classList.add('visible'));
    });
  }

  function setupCardActions() {
    dom.bookGrid
      .querySelectorAll('[data-action="start"]')
      .forEach((btn) =>
        btn.addEventListener('click', () => {
          const book = state.books.find((item) => item.id === btn.dataset.book);
          if (!book) return;
          window.location.href = `practice.html?book=${encodeURIComponent(book.id)}`;
        })
      );

    dom.bookGrid.querySelectorAll('[data-action="preview"]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const book = state.books.find((item) => item.id === btn.dataset.book);
        if (!book) return;
        openBookPreview(book);
      })
    );

    dom.bookGrid.querySelectorAll('[data-action="delete"]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const bookId = btn.dataset.book;
        const book = state.books.find((item) => item.id === bookId);
        if (!book) return;
        const confirmed = window.confirm(
          `确定要删除《${book.title}》吗？相关错题记录也会同时移除，此操作不可撤销。`
        );
        if (!confirmed) return;
        window.RuswordData.deleteBook(bookId);
        state.books = window.RuswordData.getBooks();
        renderBookCards();
        showStatus(`已删除《${book.title}》，其错题记录也已同步清理。`);
      })
    );
  }

  function showBookPreview(book) {
    const wordCount = book.words ? book.words.length : 0;
    const units = deriveUnits(book);
    const plan = window.RuswordData.computeStudyPlanStatus(wordCount || book.totalWords || 0);
    if (dom.bookModalTitle) dom.bookModalTitle.textContent = book.title || '词书详情';
    if (dom.bookModalSummary) {
      dom.bookModalSummary.textContent = `共 ${wordCount} 个单词，已识别 ${
        units.length
      } 个单元。建议节奏：每天新词 ${plan.preferences.dailyNew} 个，复习 ${plan.preferences.dailyReview} 个。`;
    }
    if (dom.bookModalChips) {
      dom.bookModalChips.innerHTML = '';
      const chips = [];
      chips.push(createPill(`单词 ${wordCount}`));
      chips.push(createPill(`单元 ${units.length}`, true));
      if (book.tags && book.tags.length) {
        book.tags.forEach((tag) => chips.push(createPill(tag)));
      }
      chips.forEach((chip) => dom.bookModalChips.appendChild(chip));
    }
    if (dom.bookModalTable) {
      dom.bookModalTable.innerHTML = '';
      const previewWords = (book.words || []).slice(0, BOOK_PREVIEW_LIMIT);
      if (previewWords.length) {
        previewWords.forEach((word, index) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${word.ru || '-'}</td>
            <td>${word.zh || '-'}</td>
            <td>${word.unit || '未标注'}</td>
            <td>${word.hint || '-'}</td>
          `;
          dom.bookModalTable.appendChild(tr);
        });
      } else {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
          <td colspan="5" style="text-align:center;">尚未录入任何单词，请稍后补充或重新上传。</td>
        `;
        dom.bookModalTable.appendChild(emptyRow);
      }
    }
    if (dom.bookModalHint) {
      const total = book.words ? book.words.length : 0;
      dom.bookModalHint.textContent =
        total > BOOK_PREVIEW_LIMIT
          ? `已展示前 ${BOOK_PREVIEW_LIMIT} 个单词，完整内容请在背词练习中查看。`
          : '所有单词均已展示，可直接开始背词练习。';
    }
    showBookModal();
  }

  function openBookPreview(book) {
    showBookPreview(book);
  }

  function showBookModal() {
    if (!dom.bookModal) return;
    dom.bookModal.classList.add('show');
    dom.bookModal.setAttribute('aria-hidden', 'false');
  }

  function hideBookModal() {
    if (!dom.bookModal) return;
    dom.bookModal.classList.remove('show');
    dom.bookModal.setAttribute('aria-hidden', 'true');
  }

  function setupUploader() {
    if (!dom.uploadInput) return;

    dom.uploadInput.addEventListener('change', (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      if (!/\.(pdf|doc|docx|xlsx)$/i.test(file.name)) {
        window.alert('请上传 pdf、doc/docx 或 xlsx 格式的文件。');
        return;
      }
      processUploadedBook(file);
    });
  }

  function buildCoverSvg(name) {
    const palette = ['#2f6fed', '#74b0ff', '#f8aa4b', '#2fbb89'];
    const pick = palette[Math.floor(Math.random() * palette.length)];
    const displayText = name.replace(/\s+/g, '').slice(0, 6) || 'RUS';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480"><defs><linearGradient id="grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.28"/><stop offset="100%" stop-color="${pick}"/></linearGradient></defs><rect width="360" height="480" rx="28" fill="url(#grad)"/><text x="50%" y="55%" font-size="42" fill="#1f2a44" font-family="Noto Sans SC, sans-serif" text-anchor="middle">${displayText}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function updatePlanSummary() {
    if (!state.preferences || !dom.studyTips) return;
    dom.studyTips.textContent = `当前计划：每天新词 ${state.preferences.dailyNew} 个，复习 ${state.preferences.dailyReview} 个，复习周期 ${state.preferences.cycleDays} 天。`;
  }

  function processUploadedBook(file) {
    const cleanName = file.name.replace(/\.[^.]+$/, '');
    const baseBook = {
      id: `custom-${Date.now()}`,
      title: cleanName,
      description: '来自上传文件的词书，上传后可在本页面补充或手动录入单词。',
      cover: buildCoverSvg(cleanName),
      totalWords: 0,
      tags: ['自定义', file.type || '本地文件'],
      fileMeta: {
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString()
      },
      words: []
    };

    if (/\.xlsx$/i.test(file.name) && window.XLSX && window.XLSX.read) {
      parseXlsx(file)
        .then((words) => {
          const nextBook = {
            ...baseBook,
            words,
            totalWords: words.length,
            tags: [...baseBook.tags, '自动导入']
          };
          saveBookAndRefresh(nextBook, `${file.name} 导入成功，共 ${words.length} 个单词。`);
        })
        .catch((error) => {
          console.warn('解析 xlsx 失败', error);
          saveBookAndRefresh(baseBook, `导入失败：${error.message || '请确认模板格式后重试。'}`);
        });
    } else if (/\.(pdf|doc|docx)$/i.test(file.name)) {
      saveBookAndRefresh(
        baseBook,
        `${file.name} 已保存为词书信息。当前版本暂不支持直接识别此格式的单词，请手动在练习页录入或转换为 xlsx 模板后再上传。`
      );
    } else {
      saveBookAndRefresh(
        baseBook,
        `${file.name} 已保存，但格式暂不支持自动识别。推荐使用 Excel (.xlsx) 模板导入。`
      );
    }
  }

  function parseXlsx(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = window.XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: '' });
          const words = rows
            .map((row, index) => {
              const ru =
                row['俄语'] ||
                row['俄语单词'] ||
                row['Russian'] ||
                row['ru'] ||
                row['RU'] ||
                '';
              const zh =
                row['中文'] ||
                row['中文释义'] ||
                row['Chinese'] ||
                row['zh'] ||
                row['ZH'] ||
                '';
              const hint = row['提示'] || row['Hint'] || row['备注'] || '';
              const unit =
                row['单元'] ||
                row['Unit'] ||
                row['unit'] ||
                row['章节'] ||
                row['章节/单元'] ||
                '';
              if (!ru || !zh) {
                return null;
              }
              return {
                id: `word-${Date.now()}-${index}`,
                ru: String(ru).trim(),
                zh: String(zh).trim(),
                hint: String(hint).trim(),
                unit: String(unit).trim()
              };
            })
            .filter(Boolean);

          if (!words.length) {
            reject(new Error('未识别到有效的“俄语/中文”列，请参考模板添加表头后再试。'));
            return;
          }
          resolve(words);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function saveBookAndRefresh(book, message) {
    window.RuswordData.addBook(book);
    state.books = window.RuswordData.getBooks();
    renderBookCards();
    if (dom.uploadLabel) {
      dom.uploadLabel.textContent = message;
    }
    showStatus(message);
    if (dom.uploadInput) {
      dom.uploadInput.value = '';
    }
    const newBook = state.books.find((item) => item.id === book.id);
    if (newBook) {
      openBookPreview(newBook);
    }
  }

  function showStatus(text) {
    if (!dom.bookStatus) return;
    dom.bookStatus.textContent = text;
  }

  function attachCoverFallbacks() {
    const images = dom.bookGrid.querySelectorAll('img.book-cover');
    images.forEach((img) => {
      if (img.dataset.fallbackBound) return;
      img.dataset.fallbackBound = 'true';
      img.addEventListener('error', () => {
        if (img.dataset.fallbackApplied) return;
        img.dataset.fallbackApplied = 'true';
        const title = img.dataset.title || img.alt || '词书';
        img.src = buildCoverSvg(title);
      });
    });
  }

  function deriveUnits(book) {
    if (!book) return [];
    if (Array.isArray(book.units) && book.units.length) return book.units;
    const words = Array.isArray(book.words) ? book.words : [];
    const units = new Set();
    words.forEach((word) => {
      if (word && word.unit) {
        units.add(String(word.unit));
      }
    });
    return Array.from(units);
  }

  function createPill(text, secondary) {
    const span = document.createElement('span');
    span.className = `pill${secondary ? ' pill-secondary' : ''}`;
    span.textContent = text;
    return span;
  }

  // 初始化词书详情弹窗事件
  if (dom.bookModal) {
    dom.bookModal.addEventListener('click', (event) => {
      if (event.target === dom.bookModal) {
        hideBookModal();
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && dom.bookModal.classList.contains('show')) {
        hideBookModal();
      }
    });
  }
  dom.bookModalClose && dom.bookModalClose.addEventListener('click', hideBookModal);
});

