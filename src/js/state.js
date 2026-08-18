import { renderExpenses } from './finance/expenses.js';
import { renderBudgets } from './finance/budgets.js';
import { renderIncome } from './finance/income.js';
import { renderBills } from './finance/bills.js';
import { renderCards } from './finance/cards.js';
import { updateSummary } from './finance/summary.js';
import { renderYearOverview } from './year-overview.js';

// ═══════════════════ STATE ═══════════════════
export const state = {
  budgets: [],
  expenses: [],
  savings: [],
  debts: [],
  assets: [],
  bills: [],
  income: [],
  events: [],
  workouts: [],
  foods: [],
  cards: [],
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth()
};

// ── Month filter state ──────────────────────────────────
export const financeView = {
  year:  new Date().getFullYear(),
  month: new Date().getMonth() // 0-indexed
};
export const yearView = { year: new Date().getFullYear() };

export function financeMonthStr() {
  return `${financeView.year}-${String(financeView.month + 1).padStart(2,'0')}`;
}

export function updateFinanceMonthLabel() {
  const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('finance-month-label').textContent = names[financeView.month] + ' ' + financeView.year;
  const now = new Date();
  const isCurrent = financeView.year === now.getFullYear() && financeView.month === now.getMonth();
  document.getElementById('finance-month-reset').style.display = isCurrent ? 'none' : 'inline-flex';
}

export function shiftFinanceMonth(dir) {
  financeView.month += dir;
  if (financeView.month > 11) { financeView.month = 0; financeView.year++; }
  if (financeView.month < 0)  { financeView.month = 11; financeView.year--; }
  updateFinanceMonthLabel();
  renderExpenses(); renderBudgets(); renderIncome(); renderBills(); renderCards(); updateSummary();
}

export function resetFinanceMonth() {
  financeView.year = new Date().getFullYear();
  financeView.month = new Date().getMonth();
  updateFinanceMonthLabel();
  renderExpenses(); renderBudgets(); renderIncome(); renderBills(); renderCards(); updateSummary();
}

export function shiftYear(dir) {
  yearView.year += dir;
  document.getElementById('year-label').textContent = yearView.year;
  renderYearOverview();
}
