document.addEventListener('DOMContentLoaded', () => {
  if (!window.RuswordData) {
    console.warn('RuswordData 未加载，背词练习页无法使用。');
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const requestedBookId = params.get('book');
  const PHASES = ['brush', 'practice', 'test'];

  const state = {
    books: window.RuswordData.getBooks(),
    preferences: window.RuswordData.getPreferences(),
    mode: 'memorize',
    practicePhase: 'brush',
    currentBook: null,
    units: [],
    selectedUnit: 'all',
    shuffledWords: [],
    currentIndex: 0,
    round: 1,
    maxRounds: 3,
    roundWrong: [],
    completed: false,
    audioReady: false,
    autoSpeak: true,
    wordAttemptStatus: { wrong: false }
  };

  const dom = {
    bookSelect: document.querySelector('#bookSelect'),
    unitSelect: document.querySelector('#unitSelect'),
    unitWrap: document.querySelector('#unitSelectWrap'),
    trainerTitle: document.querySelector('#trainerTitle'),
    trainerMeta: document.querySelector('#trainerMeta'),
    roundInfo: document.querySelector('#roundInfo'),
    phaseButtons: document.querySelectorAll('[data-phase]'),
    modeButtons: document.querySelectorAll('[data-mode]'),
    ruWord: document.querySelector('#ruWord'),
    wordReference: document.querySelector('#wordReference'),
    zhHint: document.querySelector('#zhHint'),
    brushActions: document.querySelector('#brushActions'),
    brushButtons: document.querySelectorAll('[data-brush]'),
    choicesWrap: document.querySelector('#choicesWrap'),
    spellWrap: document.querySelector('#spellWrap'),
    spellInput: document.querySelector('#spellInput'),
    spellCheckBtn: document.querySelector('#spellCheck'),
    spellFeedback: document.querySelector('#spellFeedback'),
    nextBtn: document.querySelector('#nextWord'),
    progressInfo: document.querySelector('#progressInfo'),
    message: document.querySelector('#practiceMessage'),
    studyTips: document.querySelector('#practiceTips'),
    emptyState: document.querySelector('#practiceEmpty'),
    speakBtn: document.querySelector('#speakWord')
  };

  const speech = {
    supported: 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
    synth: window.speechSynthesis,
    voices: [],
    voice: null
  };

  init();

  function init() {
    if (!state.books.length) {
      showEmptyState();
      return;
    }
    prepareSpeech();
    populateBookSelect();
    setupEvents();
    updateModeButtons();
    updatePhaseButtons();
    renderPlanTips();
    const fallbackBook = requestedBookId
      ? state.books.find((book) => book.id === requestedBookId)
      : state.books[0];
    if (fallbackBook) {
      selectBook(fallbackBook.id, false);
    } else {
      showEmptyState('找不到指定的词书，请重新选择。');
    }
  }

  function populateBookSelect() {
    if (!dom.bookSelect) return;
    dom.bookSelect.innerHTML = '';
    state.books.forEach((book) => {
      const option = document.createElement('option');
      option.value = book.id;
      option.textContent = book.title;
      dom.bookSelect.appendChild(option);
    });
    if (requestedBookId) {
      dom.bookSelect.value = requestedBookId;
    }
  }

  function setupEvents() {
    dom.bookSelect &&
      dom.bookSelect.addEventListener('change', (event) => {
        state.audioReady = true;
        selectBook(event.target.value, true);
      });

    dom.unitSelect &&
      dom.unitSelect.addEventListener('change', (event) => {
        state.audioReady = true;
        state.selectedUnit = event.target.value || 'all';
        rebuildWordPool(true);
      });

    dom.modeButtons.forEach((btn) =>
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        if (!mode || mode === state.mode) return;
        state.mode = mode;
        updateModeButtons();
        setPracticePhase('brush', false);
        rebuildWordPool(true);
      })
    );

    dom.phaseButtons.forEach((btn) =>
      btn.addEventListener('click', () => {
        const phase = btn.dataset.phase;
        if (!phase || phase === state.practicePhase) return;
        setPracticePhase(phase);
      })
    );

    dom.brushButtons.forEach((btn) =>
      btn.addEventListener('click', () => {
        const value = btn.dataset.brush;
        if (!value) return;
        handleBrushResponse(value);
      })
    );

    dom.spellCheckBtn &&
      dom.spellCheckBtn.addEventListener('click', () => {
        state.audioReady = true;
        handleSpellCheck();
      });

    dom.nextBtn &&
      dom.nextBtn.addEventListener('click', () => {
        state.audioReady = true;
        skipCurrentWord();
      });

    dom.speakBtn &&
      dom.speakBtn.addEventListener('click', () => {
        state.audioReady = true;
        speakCurrentWord(true);
      });

    if (dom.spellInput) {
      dom.spellInput.addEventListener('input', () => {
        dom.spellInput.classList.remove('incorrect');
        updateSpellFeedback();
      });
      dom.spellInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
          handleSpellCheck();
        }
      });
    }

    document.addEventListener(
      'pointerdown',
      () => {
        state.audioReady = true;
      },
      { once: true }
    );
  }

  function renderPlanTips() {
    if (!state.preferences || !dom.studyTips) return;
    dom.studyTips.textContent = `当前计划：每天新词 ${state.preferences.dailyNew} 个，复习 ${state.preferences.dailyReview} 个，复习周期 ${state.preferences.cycleDays} 天。`;
  }

  function prepareSpeech() {
    if (!speech.supported) return;
    const loadVoices = () => {
      speech.voices = speech.synth.getVoices() || [];
      speech.voice =
        speech.voices.find((voice) => voice.lang && voice.lang.toLowerCase().includes('ru')) ||
        speech.voices.find((voice) => voice.lang && voice.lang.toLowerCase().includes('en')) ||
        speech.voices[0] ||
        null;
    };
    loadVoices();
    if (speech.synth.onvoiceschanged !== undefined) {
      speech.synth.onvoiceschanged = loadVoices;
    }
  }

  function selectBook(bookId, updateUrl) {
    const book = state.books.find((item) => item.id === bookId);
    if (!book) {
      showEmptyState('找不到选中的词书，请重新选择。');
      return;
    }
    state.currentBook = book;
    state.units = deriveUnits(book);
    state.selectedUnit = 'all';
    renderMetaInfo(book);
    populateUnitOptions();
    rebuildWordPool(true);

    if (updateUrl) {
      const nextParams = new URLSearchParams(window.location.search);
      nextParams.set('book', bookId);
      const nextUrl = `${window.location.pathname}?${nextParams.toString()}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }

  function renderMetaInfo(book) {
    if (!dom.trainerMeta) return;
    const totalWords = book.words ? book.words.length : book.totalWords || 0;
    const units = deriveUnits(book);
    const plan = window.RuswordData.computeStudyPlanStatus(totalWords);
    dom.trainerMeta.innerHTML = `
      <span class="pill">单词：${totalWords || '待补充'}</span>
      <span class="pill">单元：${units.length}</span>
      <span class="pill">日新词：${plan.preferences.dailyNew}</span>
      <span class="pill">日复习：${plan.preferences.dailyReview}</span>
      <span class="pill">预计完成：${plan.totalDays ? plan.totalDays + ' 天' : '待定'}</span>
    `;
  }

  function deriveUnits(book) {
    if (!book) return [];
    if (Array.isArray(book.units) && book.units.length) return book.units;
    const words = Array.isArray(book.words) ? book.words : [];
    const unitSet = new Set();
    words.forEach((word) => {
      if (word && word.unit) {
        unitSet.add(String(word.unit));
      }
    });
    return Array.from(unitSet);
  }

  function populateUnitOptions() {
    if (!dom.unitSelect || !dom.unitWrap) return;
    const units = state.units || [];
    dom.unitSelect.innerHTML = '';
    if (!units.length) {
      dom.unitWrap.style.display = 'none';
      return;
    }
    dom.unitWrap.style.display = 'inline-flex';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = '全部单元';
    dom.unitSelect.appendChild(allOption);
    units.forEach((unit) => {
      const option = document.createElement('option');
      option.value = unit;
      option.textContent = unit;
      dom.unitSelect.appendChild(option);
    });
    dom.unitSelect.value = state.selectedUnit;
  }

  function setPracticePhase(phase, shouldRebuild = true) {
    if (!PHASES.includes(phase)) return;
    state.practicePhase = phase;
    updatePhaseButtons();
    if (shouldRebuild) {
      rebuildWordPool(true);
    } else {
      renderCurrentWord();
    }
  }

  function updatePhaseButtons() {
    dom.phaseButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.phase === state.practicePhase);
    });
  }

  function updateModeButtons() {
    dom.modeButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === state.mode);
    });
  }

  function rebuildWordPool(shouldRender = true) {
    const pool = getActiveWords();
    state.round = 1;
    state.roundWrong = [];
    state.completed = false;
    state.wordAttemptStatus = { wrong: false };
    state.shuffledWords = shuffleArray(pool);
    state.currentIndex = 0;
    clearMessage();
    updateRoundInfo();
    if (shouldRender) {
      renderCurrentWord();
    }
  }

  function getActiveWords() {
    if (!state.currentBook) return [];
    const allWords = Array.isArray(state.currentBook.words) ? state.currentBook.words : [];
    if (state.selectedUnit && state.selectedUnit !== 'all') {
      return allWords.filter((word) => word.unit === state.selectedUnit);
    }
    return allWords;
  }

  function renderCurrentWord() {
    clearMessage();
    updateRoundInfo();

    if (state.completed) {
      renderCompletionView();
      return;
    }

    if (!state.shuffledWords.length) {
      renderEmptyWordView();
      return;
    }

    const current = state.shuffledWords[state.currentIndex];
    state.wordAttemptStatus = { wrong: false };

    if (state.mode === 'memorize') {
      renderMemorizeView(current);
    } else {
      renderSpellView(current);
    }

    if (dom.speakBtn) {
      dom.speakBtn.disabled = !(speech.supported && current && current.ru);
    }
    speakCurrentWord(false);
  }

  function renderMemorizeView(current) {
    dom.spellWrap.style.display = 'none';
    dom.brushActions && dom.brushActions.classList.toggle('show', state.practicePhase === 'brush');
    dom.choicesWrap.style.display = state.practicePhase === 'brush' ? 'none' : 'grid';

    dom.ruWord.textContent = current.ru;

    if (dom.wordReference) {
      if (state.practicePhase === 'brush') {
        dom.wordReference.textContent = `中文释义：${current.zh}`;
      } else if (state.practicePhase === 'practice') {
        dom.wordReference.textContent = current.hint
          ? `提示：${current.hint}`
          : '根据记忆选择正确的中文释义';
      } else {
        dom.wordReference.textContent = '测验模式：无提示';
      }
    }

    if (state.practicePhase === 'brush') {
      dom.zhHint.textContent = '请选择你对这个单词的掌握程度';
    } else if (state.practicePhase === 'practice') {
      dom.zhHint.textContent = current.hint ? `提示：${current.hint}` : '请选择正确的中文释义';
      renderChoices(current);
    } else {
      dom.zhHint.textContent = '测验模式：没有提示，请直接作答';
      renderChoices(current);
    }
  }

  function renderSpellView(current) {
    dom.brushActions && dom.brushActions.classList.remove('show');
    dom.choicesWrap.style.display = 'none';
    dom.spellWrap.style.display = 'flex';
    dom.spellInput.disabled = false;
    dom.spellCheckBtn.disabled = false;
    dom.spellInput.value = '';
    dom.spellInput.classList.remove('incorrect');

    const target = current.ru || '';
    dom.ruWord.textContent = current.zh;

    if (dom.wordReference) {
      if (state.practicePhase === 'brush') {
        dom.wordReference.textContent = `俄语：${target}`;
      } else if (state.practicePhase === 'practice') {
        dom.wordReference.textContent = `首字母提示：${target ? target[0] : '—'}`;
      } else {
        dom.wordReference.textContent = '测验模式：无提示，请直接拼写';
      }
    }

    if (state.practicePhase === 'brush') {
      dom.zhHint.textContent = `请跟着输入俄语单词，加深记忆。`;
      dom.spellInput.placeholder = '请键入完整的俄语单词';
    } else if (state.practicePhase === 'practice') {
      dom.zhHint.textContent = current.hint ? `提示：${current.hint}` : '请输入对应的俄语单词。';
      dom.spellInput.placeholder = target ? `首字母提示：${target[0]}` : '请输入俄语单词';
    } else {
      dom.zhHint.textContent = current.hint ? `提示：${current.hint}` : '请输入对应的俄语单词。';
      dom.spellInput.placeholder = '请输入俄语单词';
    }

    updateSpellFeedback('');
    dom.spellInput.focus();
  }

  function renderChoices(correctWord) {
    const words = getActiveWords();
    const distractors = shuffleArray(words.filter((item) => item.id !== correctWord.id)).slice(0, 2);
    while (distractors.length < 2) {
      distractors.push({ zh: '（待补充）' });
    }
    const options = shuffleArray([...distractors, correctWord]);
    dom.choicesWrap.innerHTML = '';
    options.forEach((option) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = option.zh;
      btn.addEventListener('click', () => handleChoice(option, correctWord, btn));
      dom.choicesWrap.appendChild(btn);
    });
  }

  function handleBrushResponse(value) {
    if (!state.shuffledWords.length) return;
    const current = state.shuffledWords[state.currentIndex];
    let message = '';
    let isCorrect = false;

    if (value === 'known') {
      message = '很好，继续保持！';
      isCorrect = true;
    } else if (value === 'fuzzy') {
      message = '标记为模糊，稍后会重点复习。';
      addWrongWord(current);
    } else {
      message = '没关系，本轮结束后会再来巩固。';
      addWrongWord(current);
    }

    showMessage(message, isCorrect ? 'success' : 'info');
    applyAnswer(isCorrect);
  }

  function handleChoice(selected, correctWord, button) {
    if (!state.shuffledWords.length) return;
    const buttons = dom.choicesWrap.querySelectorAll('button');
    buttons.forEach((btn) => {
      if (btn.textContent === correctWord.zh) {
        btn.classList.add('correct');
      }
      if (btn === button && selected.zh !== correctWord.zh) {
        btn.classList.add('incorrect');
      }
      btn.disabled = true;
    });

    const isCorrect = selected.zh === correctWord.zh;
    if (isCorrect) {
      showMessage('选择正确，继续保持节奏！', 'success');
      dom.zhHint.textContent = `中文释义：${correctWord.zh}`;
    } else {
      showMessage(`正确答案是「${correctWord.zh}」喔～`, 'error');
      addWrongWord(correctWord);
    }

    setTimeout(() => applyAnswer(isCorrect), isCorrect ? 600 : 900);
  }

  function handleSpellCheck() {
    if (!state.shuffledWords.length) return;
    const current = state.shuffledWords[state.currentIndex];
    const value = (dom.spellInput.value || '').trim();
    if (!value) {
      showMessage('先输入俄语单词试试吧～', 'info');
      dom.spellInput.focus();
      return;
    }
    if (value.toLowerCase() === (current.ru || '').toLowerCase()) {
      showMessage('拼写正确，太棒啦！', 'success');
      dom.spellInput.value = '';
      dom.spellInput.classList.remove('incorrect');
      updateSpellFeedback('');
      applyAnswer(true);
    } else {
      showMessage(`可惜差一点，正确拼写是：${current.ru}`, 'error');
      dom.spellInput.classList.add('incorrect');
      addWrongWord(current);
      state.wordAttemptStatus.wrong = true;
      updateSpellFeedback();
    }
  }

  function skipCurrentWord() {
    if (!state.shuffledWords.length) return;
    const current = state.shuffledWords[state.currentIndex];
    addWrongWord(current);
    showMessage('已跳过该单词，稍后会在复习轮次中出现。', 'info');
    applyAnswer(false);
  }

  function applyAnswer(isCorrect) {
    const current = state.shuffledWords[state.currentIndex];
    if (!isCorrect && current) {
      addWrongWord(current);
    }

    state.currentIndex += 1;
    if (state.currentIndex >= state.shuffledWords.length) {
      completeRound();
    } else {
      renderCurrentWord();
    }
  }

  function completeRound() {
    if (state.roundWrong.length && state.round < state.maxRounds) {
      state.round += 1;
      state.shuffledWords = shuffleArray(state.roundWrong);
      state.roundWrong = [];
      state.currentIndex = 0;
      state.wordAttemptStatus = { wrong: false };
      showMessage(`进入第 ${state.round} 轮，继续攻克易错单词！`, 'info');
      updateRoundInfo();
      renderCurrentWord();
    } else {
      finishUnit();
    }
  }

  function finishUnit() {
    state.completed = true;
    state.shuffledWords = [];
    state.currentIndex = 0;
    state.roundWrong = [];
    updateRoundInfo();
    renderCurrentWord();
    showMessage('本单元已完成三轮巩固，太棒啦！', 'success');
  }

  function addWrongWord(word) {
    if (!word) return;
    if (!state.roundWrong.some((item) => item.id === word.id)) {
      state.roundWrong.push(word);
    }
  }

  function updateRoundInfo() {
    if (!dom.roundInfo) return;
    const total = getActiveWords().length;
    if (dom.progressInfo) {
      dom.progressInfo.textContent = state.shuffledWords.length
        ? `${Math.min(state.currentIndex + 1, state.shuffledWords.length)} / ${state.shuffledWords.length}`
        : '0 / 0';
    }
    if (state.completed) {
      dom.roundInfo.textContent = total
        ? `三轮学习完成 · 当前单元共 ${total} 个单词`
        : '当前单元暂无单词';
      return;
    }
    if (!state.shuffledWords.length) {
      dom.roundInfo.textContent = total
        ? `第 ${state.round} 轮 / 共 ${state.maxRounds} 轮 · 当前单元共 ${total} 个单词`
        : '当前单元暂无单词';
      return;
    }
    dom.roundInfo.textContent = `第 ${state.round} 轮 / 共 ${state.maxRounds} 轮 · 当前单词 ${
      state.currentIndex + 1
    } / ${state.shuffledWords.length} · 单元词汇 ${total}`;
  }

  function updateSpellFeedback(inputValue) {
    if (!dom.spellFeedback) return;
    const current = state.shuffledWords[state.currentIndex];
    const target = current && current.ru ? current.ru : '';
    const value = inputValue !== undefined ? inputValue : dom.spellInput.value || '';
    const chars = target.split('');
    if (!chars.length) {
      dom.spellFeedback.innerHTML = '';
      return;
    }
    const spans = chars.map((char, idx) => {
      let status = 'pending';
      let display = char;

      if (state.practicePhase !== 'brush') {
        if (idx >= value.length) {
          display = idx === 0 && state.practicePhase === 'practice' ? char : '·';
        } else {
          display = value[idx];
        }
      }

      if (value[idx] !== undefined) {
        status =
          value[idx].toLowerCase() === char.toLowerCase() ? 'correct' : 'incorrect';
      } else if (state.practicePhase === 'brush') {
        status = 'pending';
      } else if (idx === 0 && state.practicePhase === 'practice') {
        status = 'hint';
      }

      return `<span class="char ${status}">${display}</span>`;
    });
    dom.spellFeedback.innerHTML = spans.join('');
  }

  function renderCompletionView() {
    dom.spellWrap.style.display = 'none';
    dom.brushActions && dom.brushActions.classList.remove('show');
    dom.choicesWrap.style.display = 'none';
    dom.ruWord.textContent = '本单元三轮学习完成 🎉';
    dom.zhHint.textContent = '可以切换模式或单元继续巩固，也可以返回词书列表。';
    if (dom.wordReference) dom.wordReference.textContent = '';
    if (dom.spellFeedback) dom.spellFeedback.innerHTML = '';
    dom.spellInput.disabled = true;
    dom.spellCheckBtn.disabled = true;
    dom.nextBtn.disabled = true;
    if (dom.speakBtn) dom.speakBtn.disabled = true;
  }

  function renderEmptyWordView() {
    dom.spellWrap.style.display = 'none';
    dom.brushActions && dom.brushActions.classList.remove('show');
    dom.choicesWrap.style.display = 'none';
    dom.ruWord.textContent =
      state.units.length && state.selectedUnit !== 'all' ? '该单元暂无单词' : '暂未录入单词';
    dom.zhHint.textContent =
      state.units.length && state.selectedUnit !== 'all'
        ? '请在学习页补充此单元词汇或切换其他单元。'
        : '请回到学习页上传词书后再来练习。';
    if (dom.wordReference) dom.wordReference.textContent = '';
    if (dom.spellFeedback) dom.spellFeedback.innerHTML = '';
    dom.spellInput.disabled = true;
    dom.spellCheckBtn.disabled = true;
    dom.nextBtn.disabled = true;
    if (dom.speakBtn) dom.speakBtn.disabled = true;
  }

  function showEmptyState(message) {
    if (!dom.emptyState) return;
    dom.emptyState.hidden = false;
    dom.emptyState.textContent =
      message || '暂未添加词书，请回到学习页上传或选择一本词书后再来。';
  }

  function clearMessage() {
    if (!dom.message) return;
    dom.message.textContent = '';
    dom.message.dataset.type = '';
  }

  function showMessage(text, type) {
    if (!dom.message) return;
    dom.message.textContent = text;
    dom.message.dataset.type = type;
  }

  function shuffleArray(arr = []) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function speakCurrentWord(force) {
    if (!speech.supported) return;
    if (!force && (!state.audioReady || !state.autoSpeak || state.mode !== 'memorize')) return;
    const current = state.shuffledWords[state.currentIndex];
    if (!current || !current.ru) return;
    try {
      speech.synth.cancel();
      const utterance = new SpeechSynthesisUtterance(current.ru);
      utterance.lang = 'ru-RU';
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.volume = 1;
      if (speech.voice) {
        utterance.voice = speech.voice;
      }
      speech.synth.speak(utterance);
    } catch (error) {
      console.warn('语音播放失败', error);
    }
  }
});

