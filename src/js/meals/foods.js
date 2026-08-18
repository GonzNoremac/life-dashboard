import { state } from '../state.js';
import { uid, clearFields, autoSave } from '../utils.js';
import { closeModal, openEditModal, resetModalToAdd } from '../modals.js';

// ═══════════════════ MEALS — FOODS ═══════════════════

export function addFood() {
  const name = document.getElementById('f-name').value.trim();
  const meal = document.getElementById('f-meal').value;
  const cal = parseInt(document.getElementById('f-cal').value) || 0;
  const protein = parseInt(document.getElementById('f-protein').value) || 0;
  const carbs = parseInt(document.getElementById('f-carbs').value) || 0;
  const fats = parseInt(document.getElementById('f-fats').value) || 0;
  if (!name) return;
  state.foods.push({ id: uid(), name, meal, cal, protein, carbs, fats });
  clearFields(['f-name','f-cal','f-protein','f-carbs','f-fats']);
  closeModal('modal-add-meal');
  renderFoods(); renderMealSlots(); updateNutritionSummary();
}

export function renderFoods() {
  const body = document.getElementById('food-log-body');
  document.getElementById('food-count-badge').textContent = state.foods.length + ' items';
  if (!state.foods.length) { body.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-dim)">No foods logged</td></tr>'; return; }
  body.innerHTML = state.foods.map(f => `
    <tr>
      <td style="font-weight:600">${f.name}</td>
      <td><span class="tag tag-purple">${f.meal}</span></td>
      <td class="yellow">${f.cal}</td>
      <td class="muted" style="font-size:11px">${f.protein}/${f.carbs}/${f.fats}g</td>
      <td><button class="ctx-btn" onclick="openCtx(event, () => editFood('${f.id}'), () => { removeItem('foods','${f.id}',renderFoods,renderMealSlots,updateNutritionSummary); })">•••</button></td>
    </tr>`).join('');
}

export function renderMealSlots() {
  const meals = ['Breakfast','Lunch','Dinner','Snack'];
  const colors = { Breakfast: 'yellow', Lunch: 'green', Dinner: 'blue', Snack: 'accent' };
  document.getElementById('meal-slots').innerHTML = meals.map(m => {
    const items = state.foods.filter(f => f.meal === m);
    const mCal = items.reduce((s,x) => s + x.cal, 0);
    return `<div class="meal-slot">
      <div class="meal-slot-header">
        <span>${m}</span>
        <span class="${colors[m]}">${mCal} kcal</span>
      </div>
      ${items.length ? items.map(f => `<div class="meal-item-line">
        <span>${f.name}</span>
        <span class="muted">${f.cal} kcal · ${f.protein}p</span>
      </div>`).join('') : '<div class="muted" style="font-size:11px">Nothing logged</div>'}
    </div>`;
  }).join('');
}

export function updateNutritionSummary() {
  const total = state.foods.reduce((s,f) => ({ cal: s.cal+f.cal, p: s.p+f.protein, c: s.c+f.carbs, f: s.f+f.fats }), {cal:0,p:0,c:0,f:0});
  const goal = parseInt(document.getElementById('cal-goal-input').value) || 2000;
  document.getElementById('cal-today').textContent = total.cal;
  document.getElementById('cal-bar').style.width = Math.min(100, (total.cal / goal) * 100) + '%';
  document.getElementById('macro-p').textContent = total.p + 'g';
  document.getElementById('macro-c').textContent = total.c + 'g';
  document.getElementById('macro-f').textContent = total.f + 'g';
}

export function updateCalGoal() {
  document.getElementById('cal-goal').textContent = document.getElementById('cal-goal-input').value || 2000;
  updateNutritionSummary();
}

// ── FOOD EDIT ─────────────────────────────────────────────

export function editFood(id) {
  const f = state.foods.find(x => x.id === id);
  if (!f) return;
  document.getElementById('f-name').value    = f.name;
  document.getElementById('f-meal').value    = f.meal;
  document.getElementById('f-cal').value     = f.cal;
  document.getElementById('f-protein').value = f.protein;
  document.getElementById('f-carbs').value   = f.carbs;
  document.getElementById('f-fats').value    = f.fats;
  openEditModal('modal-add-meal', 'Edit Food', 'Save Changes', () => {
    f.name    = document.getElementById('f-name').value.trim()    || f.name;
    f.meal    = document.getElementById('f-meal').value;
    f.cal     = parseInt(document.getElementById('f-cal').value)     || 0;
    f.protein = parseInt(document.getElementById('f-protein').value) || 0;
    f.carbs   = parseInt(document.getElementById('f-carbs').value)   || 0;
    f.fats    = parseInt(document.getElementById('f-fats').value)    || 0;
    closeModal('modal-add-meal');
    resetModalToAdd('modal-add-meal', 'Log Food', 'Log Food', addFood);
    renderFoods(); renderMealSlots(); updateNutritionSummary(); autoSave();
  });
}
