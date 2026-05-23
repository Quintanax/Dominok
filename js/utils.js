/* =========================================
   UTILS.JS — Utilities & Helpers
   ========================================= */
const Utils = {
  // Get local date string YYYY-MM-DD without UTC offset issues
  getLocalISODate(dateObj = new Date()) {
    const d = new Date(dateObj);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  },

  // Format date
  fmtDate(isoDate, format = 'short') {
    if (!isoDate) return '—';
    let d = new Date(isoDate);
  // Fix: if date is YYYY-MM-DD, parse it at noon local time to avoid timezone offset pushing it to previous day
    if (typeof isoDate === 'string' && isoDate.length === 10) {
      d = new Date(isoDate + 'T12:00:00');
    }
    
    if (format === 'short') return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (format === 'long') return d.toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' });
    if (format === 'relative') return this.relativeTime(d);
    if (format === 'month') return d.toLocaleDateString('es-VE', { month: 'short', year: 'numeric' });
    return d.toLocaleDateString('es-VE');
  },

  relativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    if (hours < 24) return `hace ${hours}h`;
    if (days < 7) return `hace ${days}d`;
    return this.fmtDate(date);
  },

  // Number formatters
  fmtNum(n) { return n?.toLocaleString('es-VE') ?? '0'; },
  fmtPct(n) { return `${n?.toFixed(1) ?? 0}%`; },
  fmtDiff(n) {
    const sign = n > 0 ? '+' : '';
    return `${sign}${n}`;
  },

  // Generate avatar initials
  initials(name) {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  },

  // Avatar color (deterministic from name)
  avatarColor(name) {
    const colors = [
      'linear-gradient(135deg,#6c63ff,#b44fff)',
      'linear-gradient(135deg,#00d4ff,#0099ff)',
      'linear-gradient(135deg,#00e5a0,#00b894)',
      'linear-gradient(135deg,#ffb800,#ff6b35)',
      'linear-gradient(135deg,#ff4d6d,#c0392b)',
      'linear-gradient(135deg,#fd79a8,#e84393)',
      'linear-gradient(135deg,#a29bfe,#6c5ce7)',
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash += name.charCodeAt(i);
    return colors[hash % colors.length];
  },

  // Create avatar element
  avatarEl(name, size = '') {
    const s = size ? ` avatar-${size}` : '';
    return `<div class="avatar${s}" style="background:${this.avatarColor(name)}">${this.initials(name)}</div>`;
  },

  // Get player name
  playerName(id) {
    const p = DB.getPlayerById(id);
    return p ? p.name : 'Desconocido';
  },
  playerAlias(id) {
    const p = DB.getPlayerById(id);
    return p ? (p.alias || p.name) : '?';
  },

  // Normalization and Fuzzy Match
  normalizeName(str) {
    if (!str) return '';
    return str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  },

  levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
          );
        }
      }
    }
    return matrix[b.length][a.length];
  },

  fuzzyMatch(query, players, maxDistance = 2) {
    if (!query) return null;
    const qNorm = this.normalizeName(query);
    
    // 1. Exact Name/Alias Match
    let p = players.find(x => this.normalizeName(x.name) === qNorm);
    if (p) return p;
    p = players.find(x => {
      const aliases = Array.isArray(x.aliases) ? x.aliases : (x.alias || '').split(',').map(a => a.trim()).filter(Boolean);
      return aliases.some(a => this.normalizeName(a) === qNorm);
    });
    if (p) return p;

    // 2. Partial/Starts With Match
    p = players.find(x => {
      const n = this.normalizeName(x.name);
      return n.length > 3 && (n.startsWith(qNorm) || qNorm.startsWith(n));
    });
    if (p) return p;

    // 3. Levenshtein Distance
    let bestMatch = null;
    let minDistance = Infinity;
    players.forEach(x => {
      const distName = this.levenshtein(qNorm, this.normalizeName(x.name));
      if (distName < minDistance) { minDistance = distName; bestMatch = x; }
      const aliases = Array.isArray(x.aliases) ? x.aliases : (x.alias || '').split(',').map(a => a.trim()).filter(Boolean);
      aliases.forEach(a => {
        const distAlias = this.levenshtein(qNorm, this.normalizeName(a));
        if (distAlias < minDistance) { minDistance = distAlias; bestMatch = x; }
      });
    });

    if (minDistance <= maxDistance) return bestMatch;
    return null;
  },

  // Debounce
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  },

  // Escape HTML
  escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  // Deep clone
  clone(obj) { return JSON.parse(JSON.stringify(obj)); },

  // Random int
  randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },

  // Export to CSV
  exportCSV(data, filename = 'export.csv') {
    if (!data || !data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map(row =>
      headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(',')
    )].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  },

  // Export to JSON
  exportJSON(data, filename = 'export.json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  },

  // Parse CSV simple
  parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g,'').trim().toLowerCase());
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.replace(/"/g,'').trim());
      const obj = {};
      headers.forEach((h, i) => obj[h] = vals[i] || '');
      return obj;
    });
  },

  // Animate number count up
  animateCount(el, target, duration = 800) {
    const start = 0;
    const startTime = performance.now();
    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(start + (target - start) * ease).toLocaleString('es-VE');
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  },

  // Table sort helper
  sortArray(arr, key, dir = 'asc') {
    return [...arr].sort((a, b) => {
      let av = key.split('.').reduce((o, k) => o?.[k], a);
      let bv = key.split('.').reduce((o, k) => o?.[k], b);
      if (av === undefined) av = ''; if (bv === undefined) bv = '';
      if (typeof av === 'number') return dir === 'asc' ? av - bv : bv - av;
      return dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  },

  // Paginate
  paginate(arr, page, perPage = 15) {
    const total = arr.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    return {
      items: arr.slice(start, start + perPage),
      total, totalPages, page, perPage,
      from: start + 1, to: Math.min(start + perPage, total)
    };
  },

  // Render pagination controls
  renderPagination(paginationData, onPage) {
    const { page, totalPages, total, from, to } = paginationData;
    const btns = [];
    btns.push(`<button class="page-btn" onclick="${onPage}(1)" ${page===1?'disabled':''}>«</button>`);
    btns.push(`<button class="page-btn" onclick="${onPage}(${page-1})" ${page===1?'disabled':''}>‹</button>`);
    for (let p = Math.max(1, page-2); p <= Math.min(totalPages, page+2); p++) {
      btns.push(`<button class="page-btn ${p===page?'active':''}" onclick="${onPage}(${p})">${p}</button>`);
    }
    btns.push(`<button class="page-btn" onclick="${onPage}(${page+1})" ${page===totalPages?'disabled':''}>›</button>`);
    btns.push(`<button class="page-btn" onclick="${onPage}(${totalPages})" ${page===totalPages?'disabled':''}>»</button>`);
    return `
      <div class="pagination">
        <span class="pagination-info">Mostrando ${from}–${to} de ${total}</span>
        <div class="pagination-btns">${btns.join('')}</div>
      </div>`;
  },

  // Copy to clipboard
  copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
  }
};

/* =========================================
   TOAST SYSTEM
   ========================================= */
const Toast = {
  show(message, type = 'info', duration = 3500) {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${icons[type] || 'ℹ️'}</span>
      <span>${Utils.escHtml(message)}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error'); },
  warning(msg) { this.show(msg, 'warning'); },
  info(msg) { this.show(msg, 'info'); }
};
