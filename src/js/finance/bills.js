import { state, financeMonthStr } from '../state.js';
import { fmt, uid, clearFields, today, autoSave } from '../utils.js';
import { closeModal, openModal, openEditModal, resetModalToAdd } from '../modals.js';
import { renderExpenses } from './expenses.js';
import { renderBudgets } from './budgets.js';
import { updateSummary } from './summary.js';
import { renderEvents, renderCalendar } from '../calendar.js';
import { saveStateLocal } from '../firebase/sync.js';
import { openDetailSheet, refreshDetailSheet } from '../detail-sheet.js';

// ═══════════════════ BILLS ═══════════════════

const PREVIEW_COUNT = 3;
const BILL_CAT_COLORS = { Housing:'tag-blue', Utilities:'tag-yellow', Subscriptions:'tag-purple', Insurance:'tag-green', Transport:'tag-blue', 'Debt Payment':'tag-red', Other:'tag-purple' };

export function toggleBillAutopay() {
  const input = document.getElementById('bill-autopay');
  const toggle = document.getElementById('bill-autopay-toggle');
  const knob = document.getElementById('bill-autopay-knob');
  const on = input.value === '1';
  input.value = on ? '0' : '1';
  toggle.style.background = on ? 'var(--surface3)' : 'var(--blue)';
  knob.style.transform = on ? 'translateX(0)' : 'translateX(18px)';
}

export function resetBillAutopay() {
  document.getElementById('bill-autopay').value = '0';
  document.getElementById('bill-autopay-toggle').style.background = 'var(--surface3)';
  document.getElementById('bill-autopay-knob').style.transform = 'translateX(0)';
}

export function addBill() {
  const name = document.getElementById('bill-name').value.trim();
  const amount = parseFloat(document.getElementById('bill-amount').value) || 0;
  const day = parseInt(document.getElementById('bill-day').value) || 1;
  const cat = document.getElementById('bill-cat').value;
  const recur = document.getElementById('bill-recur').value;
  const card = document.getElementById('bill-card').value;
  const autoPay = document.getElementById('bill-autopay').value === '1';
  if (!name || !amount) return;
  const bill = { id: uid(), name, amount, day, cat, recur, card, autoPay, paidMonths: [] };
  state.bills.push(bill);
  clearFields(['bill-name','bill-amount','bill-day']);
  resetBillAutopay();
  closeModal('modal-add-bill');
  syncBillToCalendar(bill);
  checkAndAutoLogBills();
  renderBills();
  updateSummary();
}

export function billDueDateForMonth(bill, monthStr) {
  // monthStr = 'YYYY-MM', returns 'YYYY-MM-DD'
  const [yr, mo] = monthStr.split('-').map(Number);
  // Clamp day to last day of that month (e.g. day 31 in Feb → 28/29)
  const lastDay = new Date(yr, mo, 0).getDate();
  const day = Math.min(bill.day, lastDay);
  return `${monthStr}-${String(day).padStart(2,'0')}`;
}

// Legacy shim — used by calendar sync which always works from real current month
export function billDueDateThisMonth(bill) {
  const now = new Date();
  const ms = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  return billDueDateForMonth(bill, ms);
}

export function billMonthKey(bill) {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}

export function syncBillToCalendar(bill) {
  state.events = state.events.filter(e => e.billId !== bill.id);
  const now = new Date();
  const monthsAhead = bill.recur === 'Monthly' ? 12 : bill.recur === 'Bi-monthly' ? 6 : bill.recur === 'Quarterly' ? 4 : 1;
  for (let i = 0; i < monthsAhead; i++) {
    if (bill.recur === 'Bi-monthly' && i % 2 !== 0) continue;
    if (bill.recur === 'Quarterly' && i % 3 !== 0) continue;
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const ms = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const ds = billDueDateForMonth(bill, ms);
    state.events.push({
      id: uid(), billId: bill.id,
      title: `💳 ${bill.name} — ${fmt(bill.amount)}`,
      date: ds, time: '', cat: 'red',
      notes: `${bill.recur} bill · ${bill.cat}`
    });
  }
  renderEvents();
}

export function syncAllBillsToCalendar() {
  state.bills.forEach(b => syncBillToCalendar(b));
}

export function checkAndAutoLogBills() {
  const todayStr = today();
  const realMonthStr = todayStr.slice(0, 7); // 'YYYY-MM' of actual today
  state.bills.forEach(bill => {
    const dueDate = billDueDateForMonth(bill, realMonthStr);
    if (bill.autoPay && todayStr >= dueDate && !bill.paidMonths.includes(realMonthStr)) {
      bill.paidMonths.push(realMonthStr);
      state.expenses.push({
        id: uid(), desc: bill.name, amount: bill.amount,
        cat: bill.cat, card: bill.card || '', date: dueDate, fromBill: true
      });
    }
  });
  renderExpenses(); renderBudgets(); renderBills(); updateSummary();
  saveStateLocal();
}

export function markBillPaid(id, monthStr) {
  const bill = state.bills.find(b => b.id === id);
  if (!bill) return;
  const ms = monthStr || financeMonthStr();
  if (!bill.paidMonths.includes(ms)) {
    bill.paidMonths.push(ms);
    const dueDate = billDueDateForMonth(bill, ms);
    state.expenses.push({
      id: uid(), desc: bill.name, amount: bill.amount,
      cat: bill.cat, card: bill.card || '', date: dueDate, fromBill: true
    });
    renderExpenses(); renderBudgets(); updateSummary();
    saveStateLocal();
  }
  renderBills();
}

export function unmarkBillPaid(id, monthStr) {
  const bill = state.bills.find(b => b.id === id);
  if (!bill) return;
  const ms = monthStr || financeMonthStr();
  bill.paidMonths = bill.paidMonths.filter(m => m !== ms);
  const dueDate = billDueDateForMonth(bill, ms);
  state.expenses = state.expenses.filter(e => !(e.fromBill && e.desc === bill.name && e.date === dueDate));
  renderExpenses(); renderBudgets(); renderBills(); updateSummary();
  saveStateLocal();
}

// Determine if bill is due in the viewed month (respects recurrence)
function billDueInMonth(bill, ms) {
  if (bill.recur === 'Monthly') return true;
  // For non-monthly, check if this month falls on a cycle from the first bill month
  const [yr, mo] = ms.split('-').map(Number);
  const [firstYr, firstMo] = [new Date().getFullYear(), new Date().getMonth() + 1];
  const monthDiff = (yr - firstYr) * 12 + (mo - firstMo);
  if (bill.recur === 'Bi-monthly') return monthDiff % 2 === 0;
  if (bill.recur === 'Quarterly')  return monthDiff % 3 === 0;
  if (bill.recur === 'Annually')   return monthDiff % 12 === 0;
  return true;
}

function billStatusHtml(dueInMonth, isPaid, b, dueDate, viewMs, realMs, todayStr) {
  if (!dueInMonth) return `<span class="tag" style="background:var(--surface3);color:var(--text-4)">Not due</span>`;
  if (isPaid && b.autoPay) return `<span class="tag tag-green">⚡ Auto-paid</span>`;
  if (isPaid) return `<span class="tag tag-green">✓ Paid</span>`;
  if (viewMs === realMs) {
    // Only show overdue/soon for the real current month
    const isOverdue = todayStr > dueDate;
    const isDueSoon = !isOverdue && (new Date(dueDate) - new Date(todayStr)) / 86400000 <= 5;
    if (isOverdue) return `<span class="tag tag-red">⚠ Late</span>`;
    if (isDueSoon) return `<span class="tag tag-yellow">⏰ Due soon</span>`;
    return `<span class="tag" style="background:var(--surface3);color:var(--text-3)">Upcoming</span>`;
  }
  if (viewMs < realMs) return `<span class="tag tag-red">⚠ Unpaid</span>`;
  return `<span class="tag" style="background:var(--surface3);color:var(--text-3)">Upcoming</span>`;
}

function billRowHtml(b) {
  const todayStr = today();
  const viewMs = financeMonthStr();
  const realMs = todayStr.slice(0, 7);
  const dueDate = billDueDateForMonth(b, viewMs);
  const isPaid = b.paidMonths.includes(viewMs);
  const dueInMonth = billDueInMonth(b, viewMs);
  const statusHtml = billStatusHtml(dueInMonth, isPaid, b, dueDate, viewMs, realMs, todayStr);

  const autoPayBadge = b.autoPay
    ? `<span class="mini-badge" style="background:var(--blue-mid);color:var(--blue)">AUTO</span>`
    : '';

  const cardObj = state.cards.find(c => c.id === b.card);
  const cardBadge = cardObj
    ? `<span class="mini-badge" style="background:${cardObj.color}18;color:${cardObj.color}"><span class="mini-dot" style="background:${cardObj.color}"></span>${cardObj.name}</span>`
    : '';

  const actionBtn = dueInMonth
    ? isPaid
      ? `<button class="btn btn-ghost btn-sm" onclick="unmarkBillPaid('${b.id}','${viewMs}')">Undo</button>`
      : `<button class="btn btn-ghost btn-sm" onclick="markBillPaid('${b.id}','${viewMs}')">Mark Paid</button>`
    : '';

  return `<div class="list-row-wrap">
    <div class="list-row-top">
      <div class="list-row-main">
        <div class="list-row-title">${b.name}${autoPayBadge}</div>
        <div class="list-row-meta">
          <span class="tag ${BILL_CAT_COLORS[b.cat] || 'tag-purple'}">${b.cat}</span>
          ${dueInMonth ? `<span>${dueDate}</span>` : ''}
          <span>${b.recur}</span>
          ${cardBadge}
        </div>
      </div>
      <div class="list-row-value red">${fmt(b.amount)}</div>
    </div>
    <div class="list-row-extra">
      <div style="display:flex;align-items:center;gap:0.5rem">${statusHtml}${actionBtn}</div>
      <button class="ctx-btn" onclick="openCtx(event, () => editBill('${b.id}'), () => removeBill('${b.id}'))">•••</button>
    </div>
  </div>`;
}

export function renderBills() {
  const todayStr = today();
  const realMs = todayStr.slice(0, 7); // actual current real month
  const previewEl = document.getElementById('bills-preview-list');
  const viewAllBtn = document.getElementById('bills-view-all-btn');

  const monthlyTotal = state.bills.reduce((s,b) => {
    const factor = b.recur === 'Monthly' ? 1 : b.recur === 'Bi-monthly' ? 0.5 : b.recur === 'Quarterly' ? 1/3 : 1/12;
    return s + b.amount * factor;
  }, 0);
  document.getElementById('total-bills-display').textContent = fmt(monthlyTotal) + '/mo';

  // Overdue badge only counts real current month unpaid non-autopay bills
  const overdueBills = state.bills.filter(b => {
    const dueDate = billDueDateForMonth(b, realMs);
    return !b.autoPay && todayStr > dueDate && !b.paidMonths.includes(realMs);
  });
  const badge = document.getElementById('bills-due-badge');
  if (overdueBills.length) {
    badge.textContent = overdueBills.length + ' due';
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }

  if (!state.bills.length) {
    previewEl.innerHTML = '<div class="empty"><span class="empty-icon">🧾</span>No bills added</div>';
    viewAllBtn.style.display = 'none';
    refreshDetailSheet();
    return;
  }

  // Preview order: overdue/due-soon/unpaid first, then everything else, capped
  const viewMs = financeMonthStr();
  const priority = b => {
    const dueDate = billDueDateForMonth(b, viewMs);
    const isPaid = b.paidMonths.includes(viewMs);
    if (!billDueInMonth(b, viewMs) || isPaid) return 2;
    if (viewMs === realMs && todayStr > dueDate) return 0; // late
    if (viewMs < realMs) return 0; // unpaid past month
    return 1; // upcoming/due soon
  };
  const sorted = [...state.bills].sort((a, b) => priority(a) - priority(b));

  previewEl.innerHTML = sorted.slice(0, PREVIEW_COUNT).map(billRowHtml).join('');
  viewAllBtn.style.display = sorted.length > PREVIEW_COUNT ? '' : 'none';
  viewAllBtn.textContent = `View All (${sorted.length})`;
  refreshDetailSheet();
}

export function openBillDetail() {
  openDetailSheet('All Bills', () => openModal('modal-add-bill'), renderBillDetailBody);
}

function renderBillDetailBody() {
  const body = document.getElementById('detail-sheet-body');
  body.innerHTML = state.bills.length
    ? state.bills.map(billRowHtml).join('')
    : '<div class="empty"><span class="empty-icon">🧾</span>No bills added</div>';
}

export function removeBill(id) {
  state.events = state.events.filter(e => e.billId !== id);
  state.bills = state.bills.filter(b => b.id !== id);
  renderBills(); renderEvents(); renderCalendar(); updateSummary();
}

// ── BILL EDIT ─────────────────────────────────────────────

export function editBill(id) {
  const b = state.bills.find(x => x.id === id);
  if (!b) return;
  document.getElementById('bill-name').value   = b.name;
  document.getElementById('bill-amount').value = b.amount;
  document.getElementById('bill-day').value    = b.day;
  document.getElementById('bill-cat').value    = b.cat;
  document.getElementById('bill-recur').value  = b.recur;
  document.getElementById('bill-card').value   = b.card || '';
  // Set autopay toggle
  document.getElementById('bill-autopay').value = b.autoPay ? '1' : '0';
  const t = document.getElementById('bill-autopay-toggle');
  const k = document.getElementById('bill-autopay-knob');
  if (t) t.style.background = b.autoPay ? 'var(--blue)' : 'var(--surface3)';
  if (k) k.style.transform  = b.autoPay ? 'translateX(18px)' : 'translateX(0)';
  openEditModal('modal-add-bill', 'Edit Bill', 'Save Changes', () => {
    b.name    = document.getElementById('bill-name').value.trim()   || b.name;
    b.amount  = parseFloat(document.getElementById('bill-amount').value) || b.amount;
    b.day     = parseInt(document.getElementById('bill-day').value)  || b.day;
    b.cat     = document.getElementById('bill-cat').value;
    b.recur   = document.getElementById('bill-recur').value;
    b.card    = document.getElementById('bill-card').value;
    b.autoPay = document.getElementById('bill-autopay').value === '1';
    closeModal('modal-add-bill');
    resetModalToAdd('modal-add-bill', 'Add Bill', 'Add Bill', addBill);
    syncBillToCalendar(b);
    renderBills(); renderBudgets(); updateSummary(); autoSave();
  });
}
