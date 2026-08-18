import { state, financeMonthStr } from '../state.js';
import { fmt } from '../utils.js';

// ═══════════════════ FINANCE SUMMARY ═══════════════════

export function updateSummary() {
  // Net Worth
  const totalSavings = state.savings.reduce((s,x) => s + x.current, 0);
  const totalAssets = state.assets.reduce((s,x) => s + x.value, 0);
  const totalDebt = state.debts.reduce((s,x) => s + x.remaining, 0);
  const netWorth = totalSavings + totalAssets - totalDebt;
  document.getElementById('net-worth').textContent = fmt(netWorth);
  document.getElementById('net-worth').className = 'stat-value ' + (netWorth >= 0 ? '' : 'red');
  document.getElementById('net-worth-change').textContent = netWorth >= 0 ? '▲ Positive net worth' : '▼ Negative net worth';

  const ms = financeMonthStr();
  const totalBudget = state.budgets.reduce((s,x) => s + x.limit, 0);

  // Income this month
  const thisMonthIncome = state.income.filter(i => i.date.startsWith(ms)).reduce((s,i) => s + i.amount, 0);

  // All expenses this month (regular + bill-logged)
  const thisMonthAllSpent = state.expenses.filter(e => e.date.startsWith(ms)).reduce((s,e) => s + e.amount, 0);

  // Bills paid this month that weren't auto-logged as expenses (manual Mark Paid)
  // Note: markBillPaid already pushes to state.expenses with fromBill:true so they're included above

  // Balance = income − total spent
  const balance = thisMonthIncome - thisMonthAllSpent;
  const isNegative = balance < 0;

  document.getElementById('balance-value').textContent = (isNegative ? '-' : '') + fmt(Math.abs(balance));
  document.getElementById('balance-value').style.color = isNegative ? 'rgba(255,180,180,1)' : '#fff';
  document.getElementById('balance-label').textContent = isNegative ? 'Over budget' : thisMonthIncome > 0 ? 'Remaining balance' : 'Log income to see balance';
  document.getElementById('balance-income-label').textContent = `Income: ${fmt(thisMonthIncome)}`;
  document.getElementById('balance-spent-label').textContent  = `Spent: ${fmt(thisMonthAllSpent)}`;

  // Progress bar = % of income spent (capped at 100)
  const pct = thisMonthIncome > 0 ? Math.min(100, (thisMonthAllSpent / thisMonthIncome) * 100) : 0;
  const balBar = document.getElementById('balance-bar');
  balBar.style.width = pct + '%';
  balBar.style.background = pct > 100 ? 'rgba(255,100,100,0.9)' : pct > 80 ? 'rgba(255,200,50,0.9)' : 'rgba(255,255,255,0.9)';

  // Kept for budget card and year view calculations
  const thisMonthRegularSpent = state.expenses.filter(e => e.date.startsWith(ms) && !e.fromBill).reduce((s,e) => s + e.amount, 0);
  const budgetedCatNames = new Set(state.budgets.map(b => b.name));
  const thisMonthBudgetedBills = state.bills.filter(b => budgetedCatNames.has(b.cat)).reduce((s,b) => s + b.amount, 0);
  const thisMonthUnbudgetedBillsPaid = state.bills.filter(b => !budgetedCatNames.has(b.cat) && b.paidMonths.includes(ms)).reduce((s,b) => s + b.amount, 0);
  const thisMonthBudgetSpent = thisMonthRegularSpent + thisMonthBudgetedBills;

  document.getElementById('total-debt').textContent = fmt(totalDebt);
  const totalOriginal = state.debts.reduce((s,x) => s + x.total, 0);
  const totalPaid = totalOriginal - totalDebt;
  document.getElementById('debt-paid').textContent = totalPaid > 0 ? `${fmt(totalPaid)} paid off total` : 'Track payments below';
}
