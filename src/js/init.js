import { today } from './utils.js';
import { updateFinanceMonthLabel } from './state.js';
import { renderCalendar } from './calendar.js';
import { renderMealSlots } from './meals/foods.js';
import { renderWater } from './meals/water.js';
import { renderCards, updateCardSelects } from './finance/cards.js';
import { checkAndAutoLogBills } from './finance/bills.js';
import { autoConnectFirebase } from './firebase/config.js';

// ── INIT ─────────────────────────────────────────────────
export function initApp() {
  renderCalendar();
  renderMealSlots();
  renderCards();
  updateCardSelects();
  renderWater();
  updateFinanceMonthLabel();
  document.getElementById('e-date').value = today();
  document.getElementById('ev-date').value = today();
  document.getElementById('w-date').value = today();
  document.getElementById('i-date').value = today();
  checkAndAutoLogBills();
  autoConnectFirebase();
}
