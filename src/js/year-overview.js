import { state, yearView } from './state.js';
import { fmt } from './utils.js';

// ═══════════════════ YEAR OVERVIEW ═══════════════════

export function renderYearOverview() {
  const yr = yearView.year;
  document.getElementById('year-label').textContent = yr;
  document.getElementById('year-subtitle').textContent = `Financial summary for ${yr}`;

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthData = MONTHS.map((name, m) => {
    const key = `${yr}-${String(m+1).padStart(2,'0')}`;
    const income    = state.income.filter(i => i.date.startsWith(key)).reduce((s,i) => s + i.amount, 0);
    // Manual expenses only — bill-logged expenses are tracked via paidMonths to avoid double-counting
    const expenses  = state.expenses.filter(e => e.date.startsWith(key) && !e.fromBill).reduce((s,e) => s + e.amount, 0);
    // Bills paid this month (from paidMonths — the source of truth)
    const bills     = state.bills.filter(b => b.paidMonths.includes(key)).reduce((s,b) => s + b.amount, 0);
    const totalSpent = expenses + bills;
    return { name, key, income, expenses, bills, totalSpent };
  });

  // Annual totals
  const totalIncome   = monthData.reduce((s,m) => s + m.income, 0);
  const totalExpenses = monthData.reduce((s,m) => s + m.expenses, 0);
  const totalBills    = monthData.reduce((s,m) => s + m.bills, 0);
  const totalSpent    = totalExpenses + totalBills;
  const surplus       = totalIncome - totalSpent;
  document.getElementById('year-income').textContent  = fmt(totalIncome);
  document.getElementById('year-spent').textContent   = fmt(totalSpent);
  document.getElementById('year-surplus').textContent = fmt(Math.abs(surplus));
  document.getElementById('year-surplus').className   = 'stat-value ' + (surplus >= 0 ? '' : 'red');
  document.getElementById('year-surplus-label').textContent = surplus >= 0 ? 'Surplus — great work!' : 'Deficit — expenses exceed income';

  // ── Area + Line chart ─────────────────────────────────
  const canvas = document.getElementById('year-bar-chart');
  const parent = canvas.parentElement;
  canvas.width  = parent.offsetWidth  || 600;
  canvas.height = window.innerWidth <= 480 ? 160 : (parent.offsetHeight || 220);
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const PAD = { top: 24, right: 20, bottom: 36, left: 58 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  ctx.clearRect(0, 0, W, H);

  const maxVal = Math.max(...monthData.flatMap(m => [m.income, m.totalSpent]), 1);
  const step = chartW / 11; // 12 points, 11 intervals

  // Helper: get x/y for a data point
  const px = i => PAD.left + i * step;
  const py = v => PAD.top + chartH - (v / maxVal) * chartH;

  // Helper: smooth bezier curve through points
  function drawSmooth(points, stroke, fill1, fill2) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const cp1x = (points[i].x + points[i+1].x) / 2;
      const cp1y = points[i].y;
      const cp2x = (points[i].x + points[i+1].x) / 2;
      const cp2y = points[i+1].y;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, points[i+1].x, points[i+1].y);
    }
    // Area fill
    if (fill1) {
      ctx.lineTo(points[points.length-1].x, PAD.top + chartH);
      ctx.lineTo(points[0].x, PAD.top + chartH);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + chartH);
      grad.addColorStop(0, fill1);
      grad.addColorStop(1, fill2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    // Redraw stroke only
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const cp1x = (points[i].x + points[i+1].x) / 2;
      const cp1y = points[i].y;
      const cp2x = (points[i].x + points[i+1].x) / 2;
      const cp2y = points[i+1].y;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, points[i+1].x, points[i+1].y);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  // Gridlines + Y-axis labels
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + chartH - (i / 4) * chartH;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + chartW, y); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.font = '10px Figtree, sans-serif';
    ctx.textAlign = 'right';
    const val = maxVal * i / 4;
    ctx.fillText(val >= 1000 ? '$' + (val/1000).toFixed(0) + 'k' : '$' + val.toFixed(0), PAD.left - 6, y + 3);
  }

  // Income area (draw first, behind)
  const incPts = monthData.map((m,i) => ({ x: px(i), y: py(m.income) }));
  drawSmooth(incPts, 'rgba(52,199,89,0.9)', 'rgba(52,199,89,0.18)', 'rgba(52,199,89,0.01)');

  // Expense area (draw on top)
  const expPts = monthData.map((m,i) => ({ x: px(i), y: py(m.totalSpent) }));
  drawSmooth(expPts, 'rgba(255,59,48,0.85)', 'rgba(255,59,48,0.14)', 'rgba(255,59,48,0.01)');

  // Running balance line (no fill)
  let bal = 0;
  const minB = monthData.reduce((acc, m) => { bal += m.income - m.totalSpent; return Math.min(acc, bal); }, 0);
  const maxB = monthData.reduce((acc, m, i) => { return Math.max(acc, monthData.slice(0,i+1).reduce((s,mm) => s + mm.income - mm.totalSpent, 0)); }, 0);
  const rangeB = Math.max(maxB - minB, 1);
  bal = 0;
  const balPts = monthData.map((m, i) => {
    bal += m.income - m.totalSpent;
    const y = PAD.top + chartH - ((bal - minB) / rangeB) * chartH * 0.72 - chartH * 0.1;
    return { x: px(i), y };
  });
  // Balance line (no area)
  ctx.beginPath();
  ctx.moveTo(balPts[0].x, balPts[0].y);
  for (let i = 0; i < balPts.length - 1; i++) {
    const cpx = (balPts[i].x + balPts[i+1].x) / 2;
    ctx.bezierCurveTo(cpx, balPts[i].y, cpx, balPts[i+1].y, balPts[i+1].x, balPts[i+1].y);
  }
  ctx.strokeStyle = 'rgba(0,122,255,0.75)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5,4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Dots on all three lines
  [[incPts, 'rgba(52,199,89,1)'], [expPts, 'rgba(255,59,48,1)'], [balPts, 'rgba(0,122,255,1)']].forEach(([pts, color]) => {
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  });

  // Month labels
  monthData.forEach((m, i) => {
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.font = '10px Figtree, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.name, px(i), H - PAD.bottom + 14);
  });

  // ── Top categories ────────────────────────────────────
  const catTotals = {};
  state.expenses.filter(e => e.date.startsWith(`${yr}-`)).forEach(e => {
    const k = e.cat || 'Uncategorized';
    catTotals[k] = (catTotals[k] || 0) + e.amount;
  });
  const sorted = Object.entries(catTotals).sort((a,b) => b[1]-a[1]).slice(0, 6);
  const maxCat = sorted[0]?.[1] || 1;
  const COLORS = ['fill-red','fill-blue','fill-purple','fill-yellow','fill-green','fill-accent'];
  const catEl = document.getElementById('year-categories');
  if (!sorted.length) {
    catEl.innerHTML = '<div class="empty"><span class="empty-icon">📊</span>No expense data for this year</div>';
  } else {
    catEl.innerHTML = sorted.map(([cat, amt], i) => `
      <div class="progress-wrap">
        <div class="progress-label">
          <span style="font-weight:500">${cat}</span>
          <span style="color:var(--text-3)">${fmt(amt)}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${COLORS[i % COLORS.length]}" style="width:${(amt/maxCat)*100}%"></div>
        </div>
      </div>`).join('');
  }

  // ── Bills paid summary ────────────────────────────────
  const billsEl = document.getElementById('year-bills-summary');
  const paidBills = state.bills.filter(b => b.paidMonths.some(p => p.startsWith(`${yr}-`)));
  if (!paidBills.length) {
    billsEl.innerHTML = '<div class="empty"><span class="empty-icon">💸</span>No bills paid this year</div>';
  } else {
    const billsByName = {};
    paidBills.forEach(b => {
      const months = b.paidMonths.filter(p => p.startsWith(`${yr}-`)).length;
      billsByName[b.name] = (billsByName[b.name] || 0) + b.amount * months;
    });
    billsEl.innerHTML = Object.entries(billsByName)
      .sort((a,b) => b[1]-a[1])
      .map(([name, amt]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid var(--border);font-size:13px">
          <span style="font-weight:500">${name}</span>
          <span style="font-weight:600;color:var(--red)">${fmt(amt)}</span>
        </div>`).join('') +
      `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 0;font-size:13px;font-weight:700">
        <span>Total</span><span style="color:var(--red)">${fmt(totalBills)}</span>
      </div>`;
  }

  // ── Month-by-month table ──────────────────────────────
  let runBalance = 0;
  const now = new Date();
  document.getElementById('year-month-body').innerHTML = monthData.map(m => {
    runBalance += m.income - m.totalSpent;
    const net = m.income - m.totalSpent;
    const savRate = m.income > 0 ? Math.round((net / m.income) * 100) : null;
    const isFuture = `${yr}-${String(MONTHS.indexOf(m.name)+1).padStart(2,'0')}` > `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const rowStyle = isFuture ? 'opacity:0.4' : '';
    const hasActivity = m.income > 0 || m.totalSpent > 0;
    return `<tr style="${rowStyle}">
      <td style="font-weight:600">${m.name}</td>
      <td style="color:var(--green);font-weight:500">${m.income > 0 ? fmt(m.income) : '—'}</td>
      <td style="color:var(--red);font-weight:500">${m.expenses > 0 ? fmt(m.expenses) : '—'}</td>
      <td style="color:var(--text-3)">${m.bills > 0 ? fmt(m.bills) : '—'}</td>
      <td style="font-weight:600;color:${net >= 0 ? 'var(--green)' : 'var(--red)'}">${hasActivity ? fmt(net) : '—'}</td>
      <td>${savRate !== null ? `<span class="tag ${savRate >= 20 ? 'tag-green' : savRate >= 0 ? 'tag-blue' : 'tag-red'}">${savRate}%</span>` : '—'}</td>
    </tr>`;
  }).join('') + `<tr style="border-top:2px solid var(--border-mid);font-weight:700">
    <td>Total</td>
    <td style="color:var(--green)">${fmt(totalIncome)}</td>
    <td style="color:var(--red)">${fmt(totalExpenses)}</td>
    <td style="color:var(--text-3)">${fmt(totalBills)}</td>
    <td style="color:${surplus>=0?'var(--green)':'var(--red)'}">${fmt(surplus)}</td>
    <td>${totalIncome > 0 ? `<span class="tag ${surplus/totalIncome >= 0.2 ? 'tag-green' : surplus >= 0 ? 'tag-blue' : 'tag-red'}">${Math.round((surplus/totalIncome)*100)}%</span>` : '—'}</td>
  </tr>`;
}
