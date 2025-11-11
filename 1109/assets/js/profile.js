// 我的页脚本
document.addEventListener('DOMContentLoaded', () => {
  if (!window.RuswordData) {
    console.warn('RuswordData 未加载，无法读取学习计划设置');
    return;
  }

  const dom = {
    dailyNew: document.querySelector('#dailyNew'),
    dailyReview: document.querySelector('#dailyReview'),
    cycleDays: document.querySelector('#cycleDays'),
    saveBtn: document.querySelector('#savePreferences'),
    syncBtn: document.querySelector('#syncPreferences'),
    summary: document.querySelector('#planSummary'),
    lastSync: document.querySelector('#lastSync'),
    recommendList: document.querySelector('#recommendList')
  };

  let preferences = window.RuswordData.getPreferences();
  let books = window.RuswordData.getBooks();

  init();

  function init() {
    hydrateInputs();
    renderSummary();
    renderRecommendations();
    bindEvents();
  }

  function hydrateInputs() {
    if (dom.dailyNew) dom.dailyNew.value = preferences.dailyNew;
    if (dom.dailyReview) dom.dailyReview.value = preferences.dailyReview;
    if (dom.cycleDays) dom.cycleDays.value = preferences.cycleDays;
    if (dom.lastSync) dom.lastSync.textContent = preferences.lastSync
      ? formatDateTime(preferences.lastSync)
      : '尚未同步';
  }

  function bindEvents() {
    dom.saveBtn &&
      dom.saveBtn.addEventListener('click', () => {
        const dailyNew = Number(dom.dailyNew.value) || 0;
        const dailyReview = Number(dom.dailyReview.value) || 0;
        const cycleDays = Number(dom.cycleDays.value) || 0;
        if (dailyNew <= 0 || dailyReview < 0 || cycleDays <= 0) {
          window.alert('请填写合理的数字：新词与周期需大于 0，复习数量不可为负。');
          return;
        }
        preferences = window.RuswordData.savePreferences({ dailyNew, dailyReview, cycleDays });
        renderSummary();
        renderRecommendations();
        hydrateInputs();
        window.alert('学习计划已保存，并同步到学习页。');
      });

    dom.syncBtn &&
      dom.syncBtn.addEventListener('click', () => {
        preferences = window.RuswordData.getPreferences();
        books = window.RuswordData.getBooks();
        renderSummary();
        renderRecommendations();
        hydrateInputs();
        window.alert('已和学习页最新进度同步。');
      });
  }

  function renderSummary() {
    if (!dom.summary) return;
    dom.summary.innerHTML = '';
    const totalDaily = preferences.dailyNew + preferences.dailyReview;
    const summaryItems = [
      { label: '每日新词', value: `${preferences.dailyNew} 个` },
      { label: '每日复习', value: `${preferences.dailyReview} 个` },
      { label: '日均总量', value: `${totalDaily} 个` },
      { label: '复习周期', value: `${preferences.cycleDays} 天` }
    ];
    summaryItems.forEach((item) => {
      const block = document.createElement('div');
      block.className = 'stat-card fade-in';
      block.innerHTML = `<h4>${item.label}</h4><p>${item.value}</p>`;
      dom.summary.appendChild(block);
      requestAnimationFrame(() => block.classList.add('visible'));
    });
  }

  function renderRecommendations() {
    if (!dom.recommendList) return;
    dom.recommendList.innerHTML = '';
    if (!books.length) {
      dom.recommendList.innerHTML = `<div class="empty-state">暂无词书，先去学习页上传一本吧！</div>`;
      return;
    }
    books.slice(0, 3).forEach((book) => {
      const totalWords = book.words ? book.words.length : book.totalWords || 0;
      const plan = window.RuswordData.computeStudyPlanStatus(totalWords);
      const item = document.createElement('div');
      item.className = 'card fade-in';
      item.innerHTML = `
        <div class="book-meta">
          <h3>${book.title}</h3>
          <span class="pill">${totalWords || '待补充'} 词</span>
        </div>
        <p>${book.description || '自定义词书'}</p>
        <div class="subtle-text">预计完成：${plan.totalDays ? `${plan.totalDays} 天` : '待定'}｜每日建议：${
        plan.wordsPerDay || '—'
      } 词</div>
        <div class="card-actions" style="margin-top:18px;">
          <a class="btn-primary" href="study.html#trainerSection">去背单词</a>
        </div>
      `;
      dom.recommendList.appendChild(item);
      requestAnimationFrame(() => item.classList.add('visible'));
    });
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '时间格式错误';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  }
});

