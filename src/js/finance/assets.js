import { state } from '../state.js';
import { fmt, uid, clearFields, autoSave } from '../utils.js';
import { closeModal, openEditModal, resetModalToAdd } from '../modals.js';
import { updateSummary } from './summary.js';

// ═══════════════════ ASSETS ═══════════════════

export function addAsset() {
  const name = document.getElementById('a-name').value.trim();
  const type = document.getElementById('a-type').value;
  const value = parseFloat(document.getElementById('a-value').value) || 0;
  const notes = document.getElementById('a-notes').value.trim();
  if (!name || !value) return;
  state.assets.push({ id: uid(), name, type, value, notes });
  clearFields(['a-name','a-value','a-notes']);
  closeModal('modal-add-asset');
  renderAssets(); updateSummary();
}

export function renderAssets() {
  const body = document.getElementById('asset-body');
  const total = state.assets.reduce((s, a) => s + a.value, 0);
  document.getElementById('total-assets-display').textContent = fmt(total);
  const typeColors = {
    'Cash / Bank': 'green', 'Investment': 'blue', 'Real Estate': 'yellow',
    'Vehicle': 'purple', 'Retirement (401k/IRA)': 'accent', 'Crypto': 'yellow', 'Other': 'purple'
  };
  const tagClass = { 'green':'tag-green','blue':'tag-blue','yellow':'tag-yellow','purple':'tag-purple','accent':'tag-purple' };
  if (!state.assets.length) { body.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-dim)">No assets added</td></tr>'; return; }
  body.innerHTML = state.assets.map(a => {
    const col = typeColors[a.type] || 'purple';
    return `<tr>
      <td style="font-weight:600">${a.name}</td>
      <td><span class="tag ${tagClass[col] || 'tag-purple'}">${a.type}</span></td>
      <td class="green">${fmt(a.value)}</td>
      <td class="muted">${a.notes || '—'}</td>
      <td>
        <div style="display:flex;gap:0.4rem;align-items:center">
          <input type="number" placeholder="New value" id="aupd-${a.id}" style="width:110px;padding:0.3rem 0.5rem;font-size:11px" onkeydown="if(event.key==='Enter')updateAsset('${a.id}')">
          <button class="btn btn-ghost btn-sm" onclick="updateAsset('${a.id}')">Update</button>
          <button class="ctx-btn" onclick="openCtx(event, () => editAsset('${a.id}'), () => { removeItem('assets','${a.id}',renderAssets,updateSummary); })">•••</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

export function updateAsset(id) {
  const input = document.getElementById('aupd-' + id);
  const val = parseFloat(input.value);
  if (!isNaN(val) && val >= 0) {
    const a = state.assets.find(x => x.id === id);
    if (a) { a.value = val; input.value = ''; }
  }
  renderAssets(); updateSummary();
}

// ── ASSET EDIT ────────────────────────────────────────────

export function editAsset(id) {
  const a = state.assets.find(x => x.id === id);
  if (!a) return;
  document.getElementById('a-name').value  = a.name;
  document.getElementById('a-type').value  = a.type;
  document.getElementById('a-value').value = a.value;
  document.getElementById('a-notes').value = a.notes || '';
  openEditModal('modal-add-asset', 'Edit Asset', 'Save Changes', () => {
    a.name  = document.getElementById('a-name').value.trim()  || a.name;
    a.type  = document.getElementById('a-type').value;
    a.value = parseFloat(document.getElementById('a-value').value) || a.value;
    a.notes = document.getElementById('a-notes').value;
    closeModal('modal-add-asset');
    resetModalToAdd('modal-add-asset', 'Add Asset', 'Add Asset', addAsset);
    renderAssets(); updateSummary(); autoSave();
  });
}
