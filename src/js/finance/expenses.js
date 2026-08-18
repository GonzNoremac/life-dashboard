import { state, financeMonthStr } from '../state.js';
import { fmt, uid, clearFields, today, autoSave, showLoot } from '../utils.js';
import { closeModal, openEditModal, resetModalToAdd } from '../modals.js';
import { renderBudgets } from './budgets.js';
import { renderIncome } from './income.js';
import { renderCards } from './cards.js';
import { updateSummary } from './summary.js';

// ═══════════════════ FINANCE — EXPENSES ═══════════════════

export function addExpense() {
  const desc = document.getElementById('e-desc').value.trim();
  const amount = parseFloat(document.getElementById('e-amount').value) || 0;
  const cat = document.getElementById('e-cat').value;
  const date = document.getElementById('e-date').value || today();
  const card = document.getElementById('e-card').value;
  if (!desc || !amount) return;
  state.expenses.push({ id: uid(), desc, amount, cat, date, card });
  clearFields(['e-desc','e-amount','e-date']);
  closeModal('modal-add-expense');
  renderExpenses(); renderBudgets(); renderIncome(); renderCards(); updateSummary();
}

export const expenseExpanded = { open: false };

export function toggleExpenseExpand() {
  const wrap  = document.getElementById('expense-table-wrap');
  const fade  = document.getElementById('expense-fade');
  const label = document.getElementById('expense-see-more-label');
  expenseExpanded.open = !expenseExpanded.open;
  if (expenseExpanded.open) {
    wrap.style.maxHeight  = wrap.scrollHeight + 'px';
    fade.style.opacity    = '0';
    label.textContent     = 'See less';
  } else {
    wrap.style.maxHeight  = '320px';
    fade.style.opacity    = '1';
    label.textContent     = 'See more';
  }
}

export function updateExpenseOverflow() {
  const wrap    = document.getElementById('expense-table-wrap');
  const fade    = document.getElementById('expense-fade');
  const seeMore = document.getElementById('expense-see-more');
  if (!wrap) return;
  // Use scrollHeight vs the capped max to detect overflow
  const overflows = wrap.scrollHeight > 320;
  seeMore.style.display = overflows ? 'block' : 'none';
  fade.style.opacity    = (overflows && !expenseExpanded.open) ? '1' : '0';
  // If expanded, keep max-height in sync with real content height
  if (expenseExpanded.open) wrap.style.maxHeight = wrap.scrollHeight + 'px';
}

export function renderExpenses() {
  const body = document.getElementById('expense-body');
  const ms = financeMonthStr();
  const filtered = state.expenses.filter(e => e.date.startsWith(ms));

  // Update count badge
  const badge = document.getElementById('expense-count-badge');
  if (badge) badge.textContent = filtered.length;

  if (!filtered.length) {
    body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-4)">No expenses for this month</td></tr>';
    updateExpenseOverflow();
    return;
  }
  const sorted = [...filtered].sort((a,b) => b.date.localeCompare(a.date));
  body.innerHTML = sorted.map(e => {
    const cardObj = state.cards.find(c => c.id === e.card);
    const cardBadge = cardObj
      ? `<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;background:${cardObj.color}18;color:${cardObj.color}">
           <span style="width:7px;height:7px;border-radius:50%;background:${cardObj.color};display:inline-block"></span>${cardObj.name}
         </span>`
      : '<span style="color:var(--text-4);font-size:12px">—</span>';
    return `<tr>
      <td style="color:var(--text-3)">${e.date}</td>
      <td style="font-weight:500">${e.desc}</td>
      <td>${e.cat ? `<span class="tag tag-blue">${e.cat}</span>` : '<span style="color:var(--text-4)">—</span>'}</td>
      <td>${cardBadge}</td>
      <td style="font-weight:600;color:var(--red)">${fmt(e.amount)}</td>
      <td><button class="ctx-btn" onclick="openCtx(event, () => editExpense('${e.id}'), () => { removeItem('expenses','${e.id}',renderExpenses,renderBudgets,updateSummary,renderCards); })">•••</button></td>
    </tr>`;
  }).join('');
  // Defer overflow check so DOM has painted
  requestAnimationFrame(updateExpenseOverflow);
}

export function updateExpenseCategorySelect() {
  const sel = document.getElementById('e-cat');
  sel.innerHTML = '<option value="">Uncategorized</option>' + state.budgets.map(b => `<option value="${b.name}">${b.name}</option>`).join('');
}

// ── EXPENSE EDIT ──────────────────────────────────────────

export function editExpense(id) {
  const e = state.expenses.find(x => x.id === id);
  if (!e) return;
  document.getElementById('e-desc').value   = e.desc;
  document.getElementById('e-amount').value = e.amount;
  document.getElementById('e-cat').value    = e.cat || '';
  document.getElementById('e-date').value   = e.date;
  document.getElementById('e-card').value   = e.card || '';
  openEditModal('modal-add-expense', 'Edit Expense', 'Save Changes', () => {
    e.desc   = document.getElementById('e-desc').value.trim()   || e.desc;
    e.amount = parseFloat(document.getElementById('e-amount').value) || e.amount;
    e.cat    = document.getElementById('e-cat').value;
    e.date   = document.getElementById('e-date').value || e.date;
    e.card   = document.getElementById('e-card').value;
    closeModal('modal-add-expense');
    resetModalToAdd('modal-add-expense', 'Add Expense', 'Add Expense', addExpense);
    renderExpenses(); renderBudgets(); updateSummary(); renderCards();
    autoSave();
  });
}

// Patch addExpense to show loot toast — preserves original wrapping order
// (toast wrapper applied here; autosave wrapper applied later in main.js)
const _origAddExpense = addExpense;
addExpense = function() {
  const prevLen = state.expenses.length;
  _origAddExpense();
  if (state.expenses.length > prevLen) showLoot('Expense logged');
};
