import { state, financeMonthStr } from '../state.js';
import { fmt, uid, clearFields, today, autoSave } from '../utils.js';
import { closeModal, openEditModal, resetModalToAdd } from '../modals.js';
import { updateExpenseCategorySelect } from './expenses.js';
import { updateSummary } from './summary.js';

// ═══════════════════ FINANCE — BUDGETS ═══════════════════

export function addBudgetCategory() {
  const name = document.getElementById('b-name').value.trim();
  const limit = parseFloat(document.getElementById('b-limit').value) || 0;
  const color = document.getElementById('b-color').value;
  if (!name || !limit) return;
  state.budgets.push({ id: uid(), name, limit, color });
  clearFields(['b-name','b-limit']);
  closeModal('modal-add-budget');
  renderBudgets(); updateExpenseCategorySelect(); updateSummary();
}

export function renderBudgets() {
  const el = document.getElementById('budget-list');
  const monthKey = financeMonthStr();
  const todayStr = today();

  // Tally all bills by category — paid and upcoming both count toward the budget
  const billPaidByCat = {};
  const billUpcomingByCat = {};
  state.bills.forEach(b => {
    const isPaid = b.paidMonths.includes(monthKey);
    if (isPaid) {
      billPaidByCat[b.cat] = (billPaidByCat[b.cat] || 0) + b.amount;
    } else {
      // Upcoming or overdue — still counts as committed budget
      billUpcomingByCat[b.cat] = (billUpcomingByCat[b.cat] || 0) + b.amount;
    }
  });

  if (!state.budgets.length && !state.bills.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📊</div>No budget categories yet</div>';
    return;
  }

  // Collect bill cats that have a matching budget (so we know which are truly unbudgeted)
  const budgetedCats = new Set(state.budgets.map(b => b.name));

  let html = '';
  html += state.budgets.map(b => {
    // Regular expenses (not from bills) in this category
    const expenseSpent = state.expenses.filter(e => e.cat === b.name && !e.fromBill && e.date.startsWith(monthKey)).reduce((s,e) => s + e.amount, 0);
    const billPaid     = billPaidByCat[b.name]     || 0;
    const billUpcoming = billUpcomingByCat[b.name] || 0;

    // Total spent = regular expenses + paid bills
    const totalSpent = expenseSpent + billPaid;
    // Total committed = spent + upcoming bills
    const totalCommitted = totalSpent + billUpcoming;

    const pct          = Math.min(100, (totalSpent     / b.limit) * 100);
    const committedPct = Math.min(100, (totalCommitted / b.limit) * 100);
    const overBudget   = totalCommitted > b.limit;

    const billDetail = (billPaid > 0 || billUpcoming > 0) ? `
      <div style="display:flex;gap:1rem;margin-top:0.3rem;font-size:10px">
        ${billPaid     > 0 ? `<span style="color:var(--red)">✓ ${fmt(billPaid)} bills paid</span>`       : ''}
        ${billUpcoming > 0 ? `<span style="color:var(--orange)">⏰ ${fmt(billUpcoming)} upcoming</span>` : ''}
      </div>` : '';

    return `<div class="progress-wrap">
      <div class="progress-label">
        <span style="display:flex;align-items:center;gap:0.5rem">
          ${b.name}
          <button class="ctx-btn" style="width:22px;height:22px;font-size:12px" onclick="openCtx(event, () => editBudget('${b.id}'), () => removeItem('budgets','${b.id}',renderBudgets,updateExpenseCategorySelect,updateSummary))">•••</button>
        </span>
        <span class="${overBudget ? 'red' : 'muted'}">${fmt(totalCommitted)} / ${fmt(b.limit)}</span>
      </div>
      <div class="progress-bar" style="position:relative">
        ${billUpcoming > 0 ? `<div class="progress-fill" style="width:${committedPct}%;background:rgba(255,149,0,0.18);position:absolute;top:0;left:0;height:100%;border-radius:2px"></div>` : ''}
        <div class="progress-fill fill-${overBudget ? 'red' : b.color}" style="width:${pct}%;position:relative"></div>
      </div>
      ${billDetail}
    </div>`;
  }).join('');

  // Unbudgeted bills — bills whose category has no matching budget
  const allBillCats = [...new Set(state.bills.map(b => b.cat))];
  const unmatchedCats = allBillCats.filter(cat => !budgetedCats.has(cat));
  if (unmatchedCats.length) {
    html += `<div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)">
      <div style="font-size:10px;color:var(--text-4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.75rem">Unbudgeted Bills</div>`;
    html += unmatchedCats.map(cat => {
      const catBills = state.bills.filter(b => b.cat === cat);
      const paid     = catBills.filter(b =>  b.paidMonths.includes(monthKey)).reduce((s,b) => s + b.amount, 0);
      const upcoming = catBills.filter(b => !b.paidMonths.includes(monthKey)).reduce((s,b) => s + b.amount, 0);
      const total    = paid + upcoming;
      return `<div class="progress-wrap">
        <div class="progress-label">
          <span style="color:var(--text-3)">${cat}</span>
          <span style="color:var(--text-3)">${fmt(total)}/mo — <span style="font-size:10px">no budget set</span></span>
        </div>
        <div style="font-size:10px;margin-top:0.2rem;display:flex;gap:1rem">
          ${paid     > 0 ? `<span style="color:var(--green)">✓ ${fmt(paid)} paid</span>`         : ''}
          ${upcoming > 0 ? `<span style="color:var(--orange)">⏰ ${fmt(upcoming)} upcoming</span>` : ''}
        </div>
      </div>`;
    }).join('');
    html += '</div>';
  }

  el.innerHTML = html || '<div class="empty"><div class="empty-icon">📊</div>No budget categories yet</div>';

  // ── Budget totals summary bar ─────────────────────────
  const totalsEl = document.getElementById('budget-totals');
  if (!state.budgets.length) {
    totalsEl.style.display = 'none';
    return;
  }
  const totalBudgeted = state.budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpentAll = state.budgets.reduce((s, b) => {
    const expenseSpent = state.expenses.filter(e => e.cat === b.name && !e.fromBill && e.date.startsWith(monthKey)).reduce((a, e) => a + e.amount, 0);
    const billPaid     = billPaidByCat[b.name] || 0;
    const billUpcoming = billUpcomingByCat[b.name] || 0;
    return s + expenseSpent + billPaid + billUpcoming;
  }, 0);
  const totalLeft = totalBudgeted - totalSpentAll;
  const overAll   = totalLeft < 0;
  const pctUsed   = Math.min(100, (totalSpentAll / totalBudgeted) * 100) || 0;

  document.getElementById('bt-budgeted').textContent = fmt(totalBudgeted);
  document.getElementById('bt-spent').textContent    = fmt(totalSpentAll);
  document.getElementById('bt-spent').style.color    = overAll ? 'var(--red)' : 'var(--text)';
  document.getElementById('bt-left').textContent     = (overAll ? '-' : '') + fmt(Math.abs(totalLeft));
  document.getElementById('bt-left').style.color     = overAll ? 'var(--red)' : 'var(--green)';
  const bar = document.getElementById('bt-bar');
  bar.style.width      = pctUsed + '%';
  bar.style.background = overAll ? 'var(--red)' : pctUsed > 80 ? 'var(--orange)' : 'var(--accent)';
  totalsEl.style.display = 'block';
}

// ── BUDGET EDIT ───────────────────────────────────────────

export function editBudget(id) {
  const b = state.budgets.find(x => x.id === id);
  if (!b) return;
  document.getElementById('budget-name').value  = b.name;
  document.getElementById('budget-limit').value = b.limit;
  document.getElementById('budget-color').value = b.color;
  openEditModal('modal-add-budget', 'Edit Budget', 'Save Changes', () => {
    b.name  = document.getElementById('budget-name').value.trim()  || b.name;
    b.limit = parseFloat(document.getElementById('budget-limit').value) || b.limit;
    b.color = document.getElementById('budget-color').value;
    closeModal('modal-add-budget');
    resetModalToAdd('modal-add-budget', 'Add Budget Category', 'Add Category', addBudgetCategory);
    renderBudgets(); updateExpenseCategorySelect(); updateSummary(); autoSave();
  });
}
