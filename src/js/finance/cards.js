import { state } from '../state.js';
import { fmt, uid, clearFields, autoSave } from '../utils.js';
import { closeModal, openEditModal, resetModalToAdd } from '../modals.js';

// ═══════════════════ CARDS ═══════════════════

export function addCard() {
  const name  = document.getElementById('card-name').value.trim();
  const points = document.getElementById('card-points').value.trim();
  const color = document.getElementById('card-color').value;
  if (!name) return;
  state.cards.push({ id: uid(), name, points, color });
  clearFields(['card-name','card-points']);
  closeModal('modal-add-card');
  renderCards(); updateCardSelects();
}

export function updateCardSelects() {
  const opts = '<option value="">Cash / No Card</option>' +
    state.cards.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  ['e-card','bill-card'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) sel.innerHTML = opts;
  });
}

export function renderCards() {
  const el = document.getElementById('cards-list');
  if (!state.cards.length) {
    el.innerHTML = '<div class="empty"><span class="empty-icon">💳</span>No cards added — add a card to track spending per card</div>';
    return;
  }

  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  el.innerHTML = state.cards.map(c => {
    // All expenses on this card
    const cardExpenses = state.expenses.filter(e => e.card === c.id);
    // This month's unpaid expenses (not from a bill that's already tracked)
    const thisMonthTotal = cardExpenses
      .filter(e => e.date.startsWith(monthStr))
      .reduce((s, e) => s + e.amount, 0);
    const allTimeTotal = cardExpenses.reduce((s, e) => s + e.amount, 0);

    // Recent transactions (last 5)
    const recent = [...cardExpenses]
      .sort((a,b) => b.date.localeCompare(a.date))
      .slice(0, 5);

    const recentRows = recent.length ? recent.map(e =>
      `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid var(--border);font-size:13px">
        <div>
          <span style="font-weight:500">${e.desc}</span>
          <span style="color:var(--text-4);font-size:11px;margin-left:0.5rem">${e.date}</span>
        </div>
        <span style="font-weight:600;color:var(--red)">${fmt(e.amount)}</span>
      </div>`
    ).join('') : `<div style="color:var(--text-4);font-size:12px;padding:0.5rem 0">No transactions yet</div>`;

    return `<div style="margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
        <div style="display:flex;align-items:center;gap:0.75rem">
          <div style="width:40px;height:26px;border-radius:5px;background:${c.color};box-shadow:0 2px 6px ${c.color}55;display:flex;align-items:center;justify-content:center">
            <span style="font-size:11px;color:white;font-weight:800;letter-spacing:-0.5px">💳</span>
          </div>
          <div>
            <div style="font-weight:700;font-size:14px;letter-spacing:-0.2px">${c.name}</div>
            ${c.points ? `<div style="font-size:11px;color:var(--text-4);font-weight:500">${c.points}</div>` : ''}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;font-weight:600;color:var(--text-4);text-transform:uppercase;letter-spacing:0.04em">This Month</div>
          <div style="font-size:20px;font-weight:700;letter-spacing:-0.5px;color:var(--red);font-variant-numeric:tabular-nums">${fmt(thisMonthTotal)}</div>
          <div style="font-size:11px;color:var(--text-4)">All time: ${fmt(allTimeTotal)}</div>
        </div>
      </div>

      <div style="background:var(--surface2);border-radius:var(--radius-md);padding:0.85rem 1rem;margin-bottom:0.75rem">
        <div style="font-size:11px;font-weight:700;color:var(--text-4);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.4rem">Suggested Extra Payment This Month</div>
        <div style="font-size:22px;font-weight:800;letter-spacing:-0.8px;color:${c.color};font-variant-numeric:tabular-nums">${fmt(thisMonthTotal)}</div>
        <div style="font-size:11px;color:var(--text-4);margin-top:0.2rem">Pay this on top of your regular minimum to stay current</div>
      </div>

      <div style="font-size:11px;font-weight:700;color:var(--text-4);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.25rem">Recent Transactions</div>
      ${recentRows}

      <div style="margin-top:0.75rem">
        <button class="ctx-btn" onclick="openCtx(event, () => editCard('${c.id}'), () => removeItem('cards','${c.id}',renderCards,updateCardSelects))">•••</button>
      </div>
    </div>`;
  }).join('');
}

// ── CARD EDIT ─────────────────────────────────────────────

export function editCard(id) {
  const c = state.cards.find(x => x.id === id);
  if (!c) return;
  document.getElementById('card-name').value   = c.name;
  document.getElementById('card-points').value = c.points || '';
  document.getElementById('card-color').value  = c.color;
  openEditModal('modal-add-card', 'Edit Card', 'Save Changes', () => {
    c.name   = document.getElementById('card-name').value.trim()   || c.name;
    c.points = document.getElementById('card-points').value;
    c.color  = document.getElementById('card-color').value;
    closeModal('modal-add-card');
    resetModalToAdd('modal-add-card', 'Add Credit Card', 'Add Card', addCard);
    renderCards(); updateCardSelects(); autoSave();
  });
}
