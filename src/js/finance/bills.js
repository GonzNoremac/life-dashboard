import { state, financeMonthStr } from '../state.js';
import { fmt, uid, clearFields, today } from '../utils.js';
import { closeModal, openEditModal, resetModalToAdd } from '../modals.js';
import { renderExpenses } from './expenses.js';
import { renderBudgets } from './budgets.js';
import { updateSummary } from './summary.js';
import { renderEvents, renderCalendar } from '../calendar.js';
import { saveStateLocal } from '../firebase/sync.js';
import { autoSave } from '../utils.js';

// ═══════════════════ BILLS ═══════════════════

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

export function renderBills() {
  const body = document.getElementById('bills-body');
  const todayStr = today();
  const viewMs = financeMonthStr(); // the month currently being viewed
  const realMs  = todayStr.slice(0, 7); // actual current real month
  const catColors = { Housing:'tag-blue', Utilities:'tag-yellow', Subscriptions:'tag-purple', Insurance:'tag-green', Transport:'tag-blue', 'Debt Payment':'tag-red', Other:'tag-purple' };

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
    body.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-4)">No bills added</td></tr>';
    return;
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

  body.innerHTML = state.bills.map(b => {
    const dueDate  = billDueDateForMonth(b, viewMs);
    const isPaid   = b.paidMonths.includes(viewMs);
    const dueInMonth = billDueInMonth(b, viewMs);

    // Status relative to viewed month
    let statusHtml;
    if (!dueInMonth) {
      statusHtml = `<span class="tag" style="background:var(--surface3);color:var(--text-4)">Not due</span>`;
    } else if (isPaid && b.autoPay) {
      statusHtml = `<span class="tag tag-green">⚡ Auto-paid</span>`;
    } else if (isPaid) {
      statusHtml = `<span class="tag tag-green">✓ Paid</span>`;
    } else if (viewMs === realMs) {
      // Only show overdue/soon for the real current month
      const isOverdue  = todayStr > dueDate;
      const isDueSoon  = !isOverdue && (new Date(dueDate) - new Date(todayStr)) / 86400000 <= 5;
      if (isOverdue)       statusHtml = `<span class="tag tag-red">⚠ Late</span>`;
      else if (isDueSoon)  statusHtml = `<span class="tag tag-yellow">⏰ Due soon</span>`;
      else                 statusHtml = `<span class="tag" style="background:var(--surface3);color:var(--text-3)">Upcoming</span>`;
    } else if (viewMs < realMs) {
      statusHtml = `<span class="tag tag-red">⚠ Unpaid</span>`;
    } else {
      statusHtml = `<span class="tag" style="background:var(--surface3);color:var(--text-3)">Upcoming</span>`;
    }

    const autoPayBadge = b.autoPay
      ? `<span style="font-size:10px;font-weight:600;color:var(--blue);background:var(--blue-mid);padding:1px 6px;border-radius:3px;margin-left:5px">AUTO</span>`
      : '';

    const cardObj = state.cards.find(c => c.id === b.card);
    const cardBadge = cardObj
      ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:2px 7px;border-radius:3px;background:${cardObj.color}18;color:${cardObj.color}"><span style="width:6px;height:6px;border-radius:50%;background:${cardObj.color};display:inline-block"></span>${cardObj.name}</span>`
      : '<span style="color:var(--text-4);font-size:12px">—</span>';

    const actionBtn = dueInMonth
      ? isPaid
        ? `<button class="btn btn-ghost btn-sm" onclick="unmarkBillPaid('${b.id}','${viewMs}')">Undo</button>`
        : `<button class="btn btn-ghost btn-sm" onclick="markBillPaid('${b.id}','${viewMs}')">Mark Paid</button>`
      : '';

    return `<tr>
      <td style="font-weight:600">${b.name}${autoPayBadge}</td>
      <td><span class="tag ${catColors[b.cat] || 'tag-purple'}">${b.cat}</span></td>
      <td style="font-weight:600;color:var(--red)">${fmt(b.amount)}</td>
      <td style="color:var(--text-3)">${dueInMonth ? dueDate : '—'}</td>
      <td style="color:var(--text-3)">${b.recur}</td>
      <td>${cardBadge}</td>
      <td>${statusHtml}</td>
      <td style="display:flex;gap:0.4rem;flex-wrap:wrap">
        ${actionBtn}
        <button class="ctx-btn" onclick="openCtx(event, () => editBill('${b.id}'), () => removeBill('${b.id}'))">•••</button>
      </td>
    </tr>`;
  }).join('');
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
