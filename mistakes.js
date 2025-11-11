// 错题页脚本
document.addEventListener('DOMContentLoaded', () => {
  if (!window.RuswordData) {
    console.warn('RuswordData 未加载，错题页无法工作');
    return;
  }

  const dom = {
    list: document.querySelector('#wrongList'),
    exportBtn: document.querySelector('#exportWrong'),
    clearBtn: document.querySelector('#clearWrong'),
    emptyState: document.querySelector('#wrongEmpty'),
    stats: document.querySelector('#wrongStats')
  };

  let wrongWords = [];

  init();

  function init() {
    wrongWords = window.RuswordData
      .getWrongWords()
      .slice()
      .sort((a, b) => b.count - a.count);
    renderList();
    bindEvents();
  }

  function renderList() {
    if (!dom.list) return;
    dom.list.innerHTML = '';
    if (!wrongWords.length) {
      if (dom.emptyState) dom.emptyState.hidden = false;
      if (dom.stats) dom.stats.textContent = '还没有错题记录，继续保持！';
      return;
    }
    if (dom.emptyState) dom.emptyState.hidden = true;
    if (dom.stats) {
      const total = wrongWords.reduce((sum, item) => sum + item.count, 0);
      dom.stats.textContent = `累计记录 ${wrongWords.length} 个单词，共 ${total} 次错误。集中火力，逐个突破！`;
    }

    wrongWords.forEach((word) => {
      const row = document.createElement('div');
      row.className = 'list-item fade-in';
      row.innerHTML = `
        <div>
          <strong>${word.ru}</strong>
          <div class="subtle-text">${word.zh}</div>
          <div class="subtle-text">来源：${word.bookTitle || '未记录'}｜最近一次：${formatDate(word.lastSeen)}</div>
        </div>
        <span>错误 ${word.count} 次</span>
      `;
      dom.list.appendChild(row);
      requestAnimationFrame(() => row.classList.add('visible'));
    });
  }

  function bindEvents() {
    dom.exportBtn &&
      dom.exportBtn.addEventListener('click', () => {
        if (!wrongWords.length) {
          window.alert('暂无错题可导出。');
          return;
        }
        exportWordsAsXlsx();
      });
    dom.clearBtn &&
      dom.clearBtn.addEventListener('click', () => {
        if (window.confirm('确定要清除所有错题记录吗？该操作不可恢复。')) {
          window.RuswordData.clearWrongWords();
          wrongWords = [];
          renderList();
        }
      });
  }

  function exportWordsAsXlsx() {
    const rows = wrongWords.map((item) => ({
      俄语单词: item.ru,
      中文释义: item.zh,
      错误次数: item.count,
      来源词书: item.bookTitle || '',
      最近出错时间: formatDate(item.lastSeen)
    }));

    if (window.XLSX && typeof window.XLSX.utils.json_to_sheet === 'function') {
      const worksheet = window.XLSX.utils.json_to_sheet(rows);
      const workbook = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(workbook, worksheet, '错题本');
      window.XLSX.writeFile(workbook, `错题本-${formatDate(new Date())}.xlsx`);
    } else {
      // 备用方案：导出 CSV，并提示用户手动保存为 xlsx
      const header = Object.keys(rows[0]).join(',');
      const body = rows
        .map((row) => Object.values(row).map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const csvContent = [header, body].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      triggerDownload(blob, `错题本-${formatDate(new Date())}.csv`);
      window.alert('未检测到 XLSX 库，已退回为 CSV 导出。可用 Excel 打开并另存为 .xlsx。');
    }
  }

  function triggerDownload(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1200);
  }

  function formatDate(value) {
    if (!value) return '未记录';
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return '未记录';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date
      .getDate()
      .padStart(2, '0'))}`;
  }
});

