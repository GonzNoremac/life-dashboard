import { renderCalendar } from './calendar.js';
import { renderYearOverview } from './year-overview.js';

// ═══════════════════ NAVIGATION ═══════════════════
export function setBottomTab(id) {
  document.querySelectorAll('.bottom-tab').forEach(t => t.classList.remove('active'));
  const el = document.getElementById('btab-' + id);
  if (el) el.classList.add('active');
}

export function showPage(id, tabEl) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  if (tabEl) tabEl.classList.add('active');
  setBottomTab(id);
  if (id === 'calendar') renderCalendar();
  if (id === 'year') renderYearOverview();
}
