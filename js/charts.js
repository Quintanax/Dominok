/* =========================================
   CHARTS.JS — Pure SVG Chart Library
   ========================================= */
const Charts = {
  // Line / Area Chart
  renderLineChart(containerId, datasets, options = {}) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const W = el.clientWidth || 400, H = options.height || 200;
    const pad = { top: 20, right: 20, bottom: 30, left: 40 };
    const iW = W - pad.left - pad.right, iH = H - pad.top - pad.bottom;

    const allVals = datasets.flatMap(d => d.data);
    const minV = options.min ?? Math.min(...allVals) * 0.9;
    const maxV = options.max ?? Math.max(...allVals) * 1.05;
    const labels = options.labels || datasets[0].data.map((_, i) => i);

    const xScale = i => pad.left + (i / (labels.length - 1)) * iW;
    const yScale = v => pad.top + iH - ((v - minV) / (maxV - minV)) * iH;

    const colors = ['#6366f1', '#10b981', '#00d4ff', '#ffb800', '#ff4d6d'];

    let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${H}px">
      <defs>
        ${datasets.map((d, di) => `
        <linearGradient id="grad${containerId}${di}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${colors[di % colors.length]}" stop-opacity="${di === 0 ? 0.2 : 0.15}"/>
          <stop offset="100%" stop-color="${colors[di % colors.length]}" stop-opacity="0"/>
        </linearGradient>`).join('')}
      </defs>`;

    // Grid lines
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = pad.top + (iH / gridLines) * i;
      const val = maxV - ((maxV - minV) / gridLines) * i;
      svg += `<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="4 4"/>`;
      svg += `<text x="${pad.left - 6}" y="${y + 4}" fill="#6B7280" font-size="11" text-anchor="end">${Math.round(val)}</text>`;
    }

    // X labels
    labels.forEach((lbl, i) => {
      if (labels.length > 8 && i % 2 !== 0) return;
      svg += `<text x="${xScale(i)}" y="${H - 4}" fill="#6B7280" font-size="11" text-anchor="middle">${lbl}</text>`;
    });

    // Datasets
    datasets.forEach((d, di) => {
      const pts = d.data.map((v, i) => `${xScale(i)},${yScale(v)}`);
      const color = colors[di % colors.length];
      // Area
      const areaPath = `M ${xScale(0)},${pad.top + iH} ` +
        d.data.map((v, i) => `L ${xScale(i)},${yScale(v)}`).join(' ') +
        ` L ${xScale(d.data.length - 1)},${pad.top + iH} Z`;
      svg += `<path d="${areaPath}" fill="url(#grad${containerId}${di})" opacity="0.8"/>`;
      // Line
      const linePath = `M ${pts.join(' L ')}`;
      svg += `<path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" class="chart-line"/>`;
      // Dots
      d.data.forEach((v, i) => {
        svg += `<circle cx="${xScale(i)}" cy="${yScale(v)}" r="4" fill="#ffffff" stroke="${color}" stroke-width="2" class="chart-point" style="transition:all 150ms;transform-origin:${xScale(i)}px ${yScale(v)}px;" onmouseover="this.setAttribute('r', '6')" onmouseout="this.setAttribute('r', '4')"/>`;
      });
    });

    svg += '</svg>';
    el.innerHTML = svg;
  },

  // Bar Chart
  renderBarChart(containerId, labels, datasets, options = {}) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const W = el.clientWidth || 400, H = options.height || 200;
    const pad = { top: 20, right: 16, bottom: 32, left: 40 };
    const iW = W - pad.left - pad.right, iH = H - pad.top - pad.bottom;
    const colors = ['#6c63ff', '#00e5a0', '#00d4ff', '#ffb800'];

    const allVals = datasets.flatMap(d => d.data);
    const maxV = Math.max(...allVals) * 1.1 || 1;
    const numGroups = labels.length;
    const numDs = datasets.length;
    const groupW = iW / numGroups;
    const barW = Math.min((groupW / numDs) - 4, 32);

    let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${H}px">
      <defs>${datasets.map((d, di) => `
        <linearGradient id="bgrad${containerId}${di}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${colors[di % colors.length]}" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="${colors[di % colors.length]}" stop-opacity="0.4"/>
        </linearGradient>`).join('')}
      </defs>`;

    // Grid
    [0, 0.25, 0.5, 0.75, 1].forEach(t => {
      const y = pad.top + iH * (1 - t);
      svg += `<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
      svg += `<text x="${pad.left - 6}" y="${y + 4}" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="end">${Math.round(maxV * t)}</text>`;
    });

    // Bars
    labels.forEach((lbl, gi) => {
      const gx = pad.left + gi * groupW;
      datasets.forEach((d, di) => {
        const val = d.data[gi] || 0;
        const barH = (val / maxV) * iH;
        const bx = gx + (groupW - numDs * (barW + 2)) / 2 + di * (barW + 2);
        const by = pad.top + iH - barH;
        svg += `<rect x="${bx}" y="${by}" width="${barW}" height="${barH}" rx="4" fill="url(#bgrad${containerId}${di})"/>`;
        if (barH > 20) svg += `<text x="${bx + barW/2}" y="${by - 4}" fill="rgba(255,255,255,0.6)" font-size="9" text-anchor="middle">${val}</text>`;
      });
      svg += `<text x="${gx + groupW/2}" y="${H - 4}" fill="rgba(255,255,255,0.35)" font-size="10" text-anchor="middle">${lbl}</text>`;
    });

    // Legend
    if (options.legend) {
      datasets.forEach((d, di) => {
        const lx = pad.left + di * 100;
        svg += `<rect x="${lx}" y="4" width="10" height="10" rx="2" fill="${colors[di % colors.length]}"/>`;
        svg += `<text x="${lx + 14}" y="13" fill="rgba(255,255,255,0.5)" font-size="10">${d.label}</text>`;
      });
    }

    svg += '</svg>';
    el.innerHTML = svg;
  },

  // Donut Chart
  renderDonut(containerId, segments, options = {}) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const size = options.size || 120;
    const cx = size / 2, cy = size / 2, r = size * 0.38, stroke = options.strokeW || 18;
    const total = segments.reduce((s, d) => s + d.value, 0);
    const colors = ['#6c63ff', '#00e5a0', '#00d4ff', '#ffb800', '#ff4d6d'];

    let svg = `<svg viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px">`;
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="${stroke}"/>`;

    let offset = -0.25 * Math.PI * 2 * r;
    segments.forEach((seg, i) => {
      const pct = seg.value / (total || 1);
      const dashLen = pct * Math.PI * 2 * r;
      const color = seg.color || colors[i % colors.length];
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
        stroke-dasharray="${dashLen} ${Math.PI * 2 * r}" stroke-dashoffset="${offset}" stroke-linecap="round" opacity="0.9"/>`;
      offset -= dashLen;
    });

    if (options.center) {
      svg += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-size="${size * 0.16}" font-weight="800">${options.center}</text>`;
      if (options.sub) svg += `<text x="${cx}" y="${cy + size*0.14}" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="${size * 0.09}">${options.sub}</text>`;
    }

    svg += '</svg>';
    el.innerHTML = svg;
  },

  // Horizontal Bar (for rankings / comparisons)
  renderHBar(containerId, items, options = {}) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const W = el.clientWidth || 350;
    const barH = 20, gap = 10, pad = { left: 90, right: 50, top: 8, bottom: 8 };
    const maxV = Math.max(...items.map(d => d.value), 1);
    const H = pad.top + items.length * (barH + gap) + pad.bottom;
    const colors = ['#6c63ff', '#00e5a0', '#00d4ff', '#ffb800', '#ff4d6d'];

    let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px">`;
    items.forEach((item, i) => {
      const y = pad.top + i * (barH + gap);
      const barW = (item.value / maxV) * (W - pad.left - pad.right);
      const color = item.color || colors[i % colors.length];
      svg += `<text x="${pad.left - 8}" y="${y + barH/2 + 4}" fill="rgba(255,255,255,0.7)" font-size="11" text-anchor="end">${item.label}</text>`;
      svg += `<rect x="${pad.left}" y="${y}" width="${W - pad.left - pad.right}" height="${barH}" rx="4" fill="rgba(255,255,255,0.04)"/>`;
      svg += `<rect x="${pad.left}" y="${y}" width="${barW}" height="${barH}" rx="4" fill="${color}" opacity="0.85"/>`;
      svg += `<text x="${pad.left + barW + 6}" y="${y + barH/2 + 4}" fill="rgba(255,255,255,0.7)" font-size="11">${options.fmt ? options.fmt(item.value) : item.value}</text>`;
    });
    svg += '</svg>';
    el.innerHTML = svg;
  },

  // Radar Chart (for player profiles)
  renderRadar(containerId, labels, values, options = {}) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const size = options.size || 200;
    const cx = size / 2, cy = size / 2, r = size * 0.38;
    const n = labels.length;
    const maxV = options.max || 100;

    const angle = (i) => (i / n) * Math.PI * 2 - Math.PI / 2;
    const pt = (i, scale) => {
      const a = angle(i);
      return { x: cx + Math.cos(a) * r * scale, y: cy + Math.sin(a) * r * scale };
    };

    let svg = `<svg viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px">`;

    // Grid circles
    [0.2, 0.4, 0.6, 0.8, 1].forEach(t => {
      const pts = Array(n).fill(0).map((_, i) => { const p = pt(i, t); return `${p.x},${p.y}`; }).join(' ');
      svg += `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
    });

    // Axes
    Array(n).fill(0).forEach((_, i) => {
      const p = pt(i, 1);
      svg += `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
    });

    // Data polygon
    const dataPts = values.map((v, i) => { const p = pt(i, v / maxV); return `${p.x},${p.y}`; }).join(' ');
    svg += `<polygon points="${dataPts}" fill="rgba(108,99,255,0.2)" stroke="#6c63ff" stroke-width="2"/>`;

    // Labels
    labels.forEach((lbl, i) => {
      const p = pt(i, 1.2);
      svg += `<text x="${p.x}" y="${p.y + 4}" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="10">${lbl}</text>`;
    });

    // Dots
    values.forEach((v, i) => {
      const p = pt(i, v / maxV);
      svg += `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#6c63ff"/>`;
    });

    svg += '</svg>';
    el.innerHTML = svg;
  }
};
