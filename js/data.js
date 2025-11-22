// 简单的数据与本地存储工具
const STORAGE_KEYS = {
  books: 'rusword-books',
  wrongWords: 'rusword-wrong-words',
  preferences: 'rusword-preferences'
};

const defaultBookPool = [
  {
    id: 'basic-01',
    title: '零基础入门词表',
    description: '涵盖最常用的生活场景词汇，适合刚接触俄语的同学。',
    cover:
      'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480"><defs><linearGradient id="grad" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="%232f6fed"/><stop offset="100%" stop-color="%23a2c6ff"/></linearGradient></defs><rect width="360" height="480" rx="28" fill="url(%23grad)"/><text x="50%" y="58%" font-size="48" fill="%23fff" font-family="Noto Sans" text-anchor="middle">База</text></svg>',
    totalWords: 200,
    tags: ['高频', '生活场景'],
    words: [
      { id: 'w1', ru: 'привет', zh: '你好', hint: '打招呼用语', unit: '单元 1' },
      { id: 'w2', ru: 'спасибо', zh: '谢谢', hint: '表达感谢', unit: '单元 1' },
      { id: 'w3', ru: 'пожалуйста', zh: '不客气；请', hint: '常见礼貌用语', unit: '单元 1' },
      { id: 'w4', ru: 'учитель', zh: '老师', hint: '职业', unit: '单元 2' },
      { id: 'w5', ru: 'ученик', zh: '学生', hint: '职业', unit: '单元 2' }
    ]
  },
  {
    id: 'travel-01',
    title: '出行与旅行词表',
    description: '覆盖交通、问路、住宿等必备词汇，让旅行无障碍。',
    cover:
      'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480"><defs><linearGradient id="grad" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="%2374b0ff"/><stop offset="100%" stop-color="%23f8aa4b"/></linearGradient></defs><rect width="360" height="480" rx="28" fill="url(%23grad)"/><text x="50%" y="58%" font-size="48" fill="%23fff" font-family="Noto Sans" text-anchor="middle">Путь</text></svg>',
    totalWords: 150,
    tags: ['旅行', '动词'],
    words: [
      { id: 'w6', ru: 'поезд', zh: '火车', hint: '交通工具', unit: '行前准备' },
      { id: 'w7', ru: 'билет', zh: '票/车票', hint: '购票时使用', unit: '行前准备' },
      { id: 'w8', ru: 'карта', zh: '地图', hint: '问路', unit: '到达之后' },
      { id: 'w9', ru: 'гостиница', zh: '宾馆', hint: '住宿', unit: '到达之后' },
      { id: 'w10', ru: 'аэропорт', zh: '机场', hint: '交通设施', unit: '行前准备' }
    ]
  },
  {
    id: 'business-01',
    title: '商务沟通词表',
    description: '商务洽谈常见表达，助你保持专业、表达清晰。',
    cover:
      'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480"><defs><linearGradient id="grad" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="%232f6fed"/><stop offset="100%" stop-color="%23f8aa4b"/></linearGradient></defs><rect width="360" height="480" rx="28" fill="url(%23grad)"/><text x="50%" y="58%" font-size="48" fill="%23fff" font-family="Noto Sans" text-anchor="middle">Бизнес</text></svg>',
    totalWords: 180,
    tags: ['商务', '正式场合'],
    words: [
      { id: 'w11', ru: 'контракт', zh: '合同', hint: '商务文件', unit: '合同签署' },
      { id: 'w12', ru: 'переговоры', zh: '谈判', hint: '商务活动', unit: '沟通交流' },
      { id: 'w13', ru: 'компания', zh: '公司', hint: '组织', unit: '基础词汇' },
      { id: 'w14', ru: 'встреча', zh: '会议', hint: '活动', unit: '沟通交流' },
      { id: 'w15', ru: 'партнёр', zh: '伙伴', hint: '合作关系', unit: '基础词汇' }
    ]
  }
];

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn('读取本地存储失败', error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('写入本地存储失败', error);
  }
}

// 内置词书文件名
const BUILTIN_BOOK_FILE = '19821876113.xlsx';
const BUILTIN_BOOK_ID = 'builtin-19821876113';

// 尝试加载内置的xlsx词书
async function loadBuiltinBook() {
  // 检查是否已经存在这个词书
  const existing = readStorage(STORAGE_KEYS.books, null);
  if (existing && Array.isArray(existing)) {
    const hasBuiltin = existing.some((book) => book.id === BUILTIN_BOOK_ID);
    if (hasBuiltin) {
      return null; // 已经存在，不需要重新加载
    }
  }

  // 检查XLSX库是否可用
  if (!window.XLSX || !window.XLSX.read) {
    console.warn('XLSX库未加载，无法加载内置词书');
    return null;
  }

  try {
    // 尝试从assets/data/目录加载文件
    const response = await fetch(`assets/data/${BUILTIN_BOOK_FILE}`);
    if (!response.ok) {
      console.warn(`内置词书文件 ${BUILTIN_BOOK_FILE} 未找到，跳过加载`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
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
          id: `builtin-word-${index}`,
          ru: String(ru).trim(),
          zh: String(zh).trim(),
          hint: String(hint).trim(),
          unit: String(unit).trim()
        };
      })
      .filter(Boolean);

    if (!words.length) {
      console.warn(`内置词书 ${BUILTIN_BOOK_FILE} 解析后没有有效单词`);
      return null;
    }

    // 创建词书对象
    const bookName = BUILTIN_BOOK_FILE.replace(/\.xlsx$/i, '');
    const builtinBook = {
      id: BUILTIN_BOOK_ID,
      title: bookName,
      description: '内置词书，自动加载。',
      cover: buildCoverSvgForBuiltin(bookName),
      totalWords: words.length,
      tags: ['内置', '自动导入'],
      words: words,
      isBuiltin: true
    };

    return builtinBook;
  } catch (error) {
    console.warn(`加载内置词书失败: ${error.message}`);
    return null;
  }
}

// 为内置词书生成封面
function buildCoverSvgForBuiltin(name) {
  const palette = ['#6b46c1', '#9333ea', '#a855f7'];
  const pick = palette[Math.floor(Math.random() * palette.length)];
  const displayText = name.replace(/\s+/g, '').slice(0, 6) || 'RUS';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480"><defs><linearGradient id="grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.28"/><stop offset="100%" stop-color="${pick}"/></linearGradient></defs><rect width="360" height="480" rx="28" fill="url(#grad)"/><text x="50%" y="55%" font-size="42" fill="#1f2a44" font-family="Noto Sans SC, sans-serif" text-anchor="middle">${displayText}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function ensureBookData() {
  const existing = readStorage(STORAGE_KEYS.books, null);
  if (!existing || !Array.isArray(existing) || existing.length === 0) {
    const normalized = defaultBookPool.map(applyBookMetadata);
    writeStorage(STORAGE_KEYS.books, normalized);
    // 异步加载内置词书（不阻塞初始化）
    loadBuiltinBook().then((builtinBook) => {
      if (builtinBook) {
        const currentBooks = getBooks();
        const hasBuiltin = currentBooks.some((book) => book.id === BUILTIN_BOOK_ID);
        if (!hasBuiltin) {
          addBook(builtinBook);
          // 触发自定义事件，通知页面刷新
          window.dispatchEvent(new CustomEvent('builtinBookLoaded'));
        }
      }
    });
    return normalized;
  } else {
    // 即使已有数据，也检查是否需要加载内置词书
    const hasBuiltin = existing.some((book) => book.id === BUILTIN_BOOK_ID);
    if (!hasBuiltin) {
      loadBuiltinBook().then((builtinBook) => {
        if (builtinBook) {
          addBook(builtinBook);
          window.dispatchEvent(new CustomEvent('builtinBookLoaded'));
        }
      });
    }
  }
  return existing;
}

function getBooks() {
  return ensureBookData().map(applyBookMetadata);
}

function addBook(book) {
  const books = getBooks();
  books.push(applyBookMetadata(book));
  writeStorage(STORAGE_KEYS.books, books);
  return books;
}

function updateBook(updatedBook) {
  const books = getBooks().map((book) =>
    book.id === updatedBook.id ? applyBookMetadata(updatedBook) : book
  );
  writeStorage(STORAGE_KEYS.books, books);
  return books;
}

function deleteBook(bookId) {
  const books = getBooks();
  const nextBooks = books.filter((book) => book.id !== bookId);
  writeStorage(STORAGE_KEYS.books, nextBooks);
  removeWrongWordsByBook(bookId);
  return nextBooks;
}

function getPreferences() {
  return readStorage(STORAGE_KEYS.preferences, {
    dailyNew: 20,
    dailyReview: 30,
    cycleDays: 14,
    lastSync: null
  });
}

function savePreferences(nextPreferences) {
  const preferences = { ...getPreferences(), ...nextPreferences, lastSync: new Date().toISOString() };
  writeStorage(STORAGE_KEYS.preferences, preferences);
  return preferences;
}

function getWrongWords() {
  return readStorage(STORAGE_KEYS.wrongWords, []);
}

function recordWrongWord(entry) {
  const wrongWords = getWrongWords();
  const existing = wrongWords.find((item) => item.wordId === entry.wordId);
  if (existing) {
    existing.count += 1;
    existing.lastSeen = new Date().toISOString();
  } else {
    wrongWords.push({
      ...entry,
      count: 1,
      lastSeen: new Date().toISOString()
    });
  }
  writeStorage(STORAGE_KEYS.wrongWords, wrongWords);
  return wrongWords;
}

function clearWrongWords() {
  writeStorage(STORAGE_KEYS.wrongWords, []);
}

function removeWrongWordsByBook(bookId) {
  if (!bookId) return;
  const filtered = getWrongWords().filter((item) => item.bookId !== bookId);
  writeStorage(STORAGE_KEYS.wrongWords, filtered);
}

function computeStudyPlanStatus(totalWords) {
  const preferences = getPreferences();
  const wordsPerDay = preferences.dailyNew + preferences.dailyReview;
  const totalDays = wordsPerDay ? Math.ceil(totalWords / wordsPerDay) : 0;
  return {
    preferences,
    totalWords,
    wordsPerDay,
    totalDays
  };
}

window.RuswordData = {
  getBooks,
  addBook,
  updateBook,
  deleteBook,
  getPreferences,
  savePreferences,
  getWrongWords,
  recordWrongWord,
  clearWrongWords,
  removeWrongWordsByBook,
  computeStudyPlanStatus
};

function applyBookMetadata(book) {
  const words = Array.isArray(book.words) ? book.words : [];
  const units = computeUnits(words);
  return {
    ...book,
    totalWords: typeof book.totalWords === 'number' ? book.totalWords : words.length,
    words,
    units
  };
}

function computeUnits(words = []) {
  const set = new Set();
  words.forEach((word) => {
    if (word && word.unit) {
      set.add(String(word.unit));
    }
  });
  return Array.from(set);
}

