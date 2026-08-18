import { state } from './state.js';
import { uid, clearFields, today, autoSave, showLoot } from './utils.js';
import { closeModal, openEditModal, resetModalToAdd } from './modals.js';

// ═══════════════════ CALENDAR / EVENTS ═══════════════════

export function addEvent() {
  const title = document.getElementById('ev-title').value.trim();
  const date = document.getElementById('ev-date').value || today();
  const time = document.getElementById('ev-time').value;
  const cat = document.getElementById('ev-cat').value;
  const notes = document.getElementById('ev-notes').value;
  if (!title) return;
  state.events.push({ id: uid(), title, date, time, cat, notes });
  clearFields(['ev-title','ev-date','ev-time','ev-notes']);
  closeModal('modal-add-event');
  renderEvents(); renderCalendar();
}

export function renderEvents(showAll) {
  const el = document.getElementById('event-list');
  if (!state.events.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">📅</div>No events yet</div>'; return; }
  const todayStr = today();
  const sorted = [...state.events]
    .sort((a,b) => a.date.localeCompare(b.date))
    .filter(ev => ev.date >= todayStr);
  const past = [...state.events].filter(ev => ev.date < todayStr).sort((a,b) => b.date.localeCompare(a.date));
  const all = [...sorted, ...past];
  const colors = { purple: 'var(--accent)', green: 'var(--green)', blue: 'var(--blue)', yellow: 'var(--yellow)', red: 'var(--red)' };
  const limit = showAll ? all.length : 3;
  const visible = all.slice(0, limit);
  const remaining = all.length - limit;

  const evHtml = visible.map(ev => `
    <div class="event-item">
      <div class="event-dot" style="background:${colors[ev.cat] || colors.purple}"></div>
      <div class="event-info">
        <div class="event-title">${ev.title}</div>
        <div class="event-meta">${ev.date}${ev.time ? ' · ' + ev.time : ''}</div>
        ${ev.notes ? `<div class="event-meta" style="margin-top:2px">${ev.notes}</div>` : ''}
      </div>
      <button class="ctx-btn" onclick="openCtx(event, ev.billId ? null : () => editEvent('${ev.id}'), () => { removeItem('events','${ev.id}',renderEvents,renderCalendar); })">•••</button>
    </div>`).join('');

  const moreBtn = !showAll && remaining > 0
    ? `<button class="btn btn-ghost btn-sm" style="width:100%;margin-top:0.75rem;justify-content:center" onclick="renderEvents(true)">Show ${remaining} more event${remaining > 1 ? 's' : ''} ↓</button>`
    : showAll && all.length > 3
    ? `<button class="btn btn-ghost btn-sm" style="width:100%;margin-top:0.75rem;justify-content:center" onclick="renderEvents(false)">Show less ↑</button>`
    : '';

  el.innerHTML = evHtml + moreBtn;
}

export function calNav(dir) {
  state.calMonth += dir;
  if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
  if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
  renderCalendar();
}

export function renderCalendar() {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('cal-title').textContent = months[state.calMonth] + ' ' + state.calYear;
  document.getElementById('cal-header').innerHTML = days.map(d => `<div class="cal-header-cell">${d}</div>`).join('');

  const firstDay = new Date(state.calYear, state.calMonth, 1).getDay();
  const daysInMonth = new Date(state.calYear, state.calMonth + 1, 0).getDate();
  const daysInPrev = new Date(state.calYear, state.calMonth, 0).getDate();
  const todayStr = today();

  // Separate bill events from regular events for different dot colors
  const billEventDates = new Set(state.events.filter(e => e.billId).map(e => e.date));
  const regularEventDates = new Set(state.events.filter(e => !e.billId).map(e => e.date));

  let cells = '';
  for (let i = 0; i < firstDay; i++) {
    const d = daysInPrev - firstDay + 1 + i;
    cells += `<div class="cal-cell other-month">${d}</div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${state.calYear}-${String(state.calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = ds === todayStr;
    const hasBill = billEventDates.has(ds);
    const hasEv = regularEventDates.has(ds);
    const dots = (hasBill || hasEv) ? `<div style="display:flex;gap:2px;margin-top:2px">${hasBill ? '<div style="width:4px;height:4px;border-radius:50%;background:var(--red)"></div>' : ''}${hasEv ? '<div style="width:4px;height:4px;border-radius:50%;background:var(--accent)"></div>' : ''}</div>` : '';
    cells += `<div class="cal-cell ${isToday ? 'today' : ''}" style="justify-content:center">${d}${dots}</div>`;
  }
  const totalCells = firstDay + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let d = 1; d <= remaining; d++) {
    cells += `<div class="cal-cell other-month">${d}</div>`;
  }
  document.getElementById('cal-body').innerHTML = cells;
}

// ── EVENT EDIT ────────────────────────────────────────────

export function editEvent(id) {
  const ev = state.events.find(x => x.id === id);
  if (!ev || ev.billId) return; // don't edit bill-generated events
  document.getElementById('ev-title').value = ev.title;
  document.getElementById('ev-date').value  = ev.date;
  document.getElementById('ev-time').value  = ev.time || '';
  document.getElementById('ev-cat').value   = ev.cat  || 'blue';
  document.getElementById('ev-notes').value = ev.notes || '';
  openEditModal('modal-add-event', 'Edit Event', 'Save Changes', () => {
    ev.title = document.getElementById('ev-title').value.trim() || ev.title;
    ev.date  = document.getElementById('ev-date').value  || ev.date;
    ev.time  = document.getElementById('ev-time').value;
    ev.cat   = document.getElementById('ev-cat').value;
    ev.notes = document.getElementById('ev-notes').value;
    closeModal('modal-add-event');
    resetModalToAdd('modal-add-event', 'Add Event', 'Add Event', addEvent);
    renderEvents(); renderCalendar(); autoSave();
  });
}

// Patch addEvent to show loot toast
const _origAddEvent = addEvent;
addEvent = function() {
  const prevLen = state.events.length;
  _origAddEvent();
  if (state.events.length > prevLen) { showLoot('Event added'); }
};
