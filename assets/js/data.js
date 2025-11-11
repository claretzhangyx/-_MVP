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

function ensureBookData() {
  const existing = readStorage(STORAGE_KEYS.books, null);
  if (!existing || !Array.isArray(existing) || existing.length === 0) {
    const normalized = defaultBookPool.map(applyBookMetadata);
    writeStorage(STORAGE_KEYS.books, normalized);
    return normalized;
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

