import { state } from '../state.js';
import { fmt, uid, clearFields, autoSave } from '../utils.js';
import { closeModal, openModal, openEditModal, resetModalToAdd } from '../modals.js';
import { updateSummary } from './summary.js';
import { openDetailSheet, refreshDetailSheet } from '../detail-sheet.js';

// ═══════════════════ ASSETS ═══════════════════

const PREVIEW_COUNT = 3;
const ASSET_TYPE_COLORS = {
  'Cash / Bank': 'tag-green', 'Investment': 'tag-blue', 'Real Estate': 'tag-yellow',
  'Vehicle': 'tag-purple', 'Retirement (401k/IRA)': 'tag-purple', 'Crypto': 'tag-yellow', 'Other': 'tag-purple'
};

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

function assetRowHtml(a) {
  return `<div class="list-row-wrap">
    <div class="list-row-top">
      <div class="list-row-main">
        <div class="list-row-title">${a.name}</div>
        <div class="list-row-meta">
          <span class="tag ${ASSET_TYPE_COLORS[a.type] || 'tag-purple'}">${a.type}</span>
          ${a.notes ? `<span>${a.notes}</span>` : ''}
        </div>
      </div>
      <div class="list-row-value green">${fmt(a.value)}</div>
    </div>
    <div class="list-row-extra">
      <div style="display:flex;gap:0.4rem;flex:1">
        <input type="number" placeholder="New value" id="aupd-${a.id}" style="flex:1" onkeydown="if(event.key==='Enter')updateAsset('${a.id}')">
        <button class="btn btn-ghost btn-sm" onclick="updateAsset('${a.id}')">Update</button>
      </div>
      <button class="ctx-btn" onclick="openCtx(event, () => editAsset('${a.id}'), () => { removeItem('assets','${a.id}',renderAssets,updateSummary); })">•••</button>
    </div>
  </div>`;
}

export function renderAssets() {
  const previewEl = document.getElementById('asset-preview-list');
  const viewAllBtn = document.getElementById('asset-view-all-btn');
  const total = state.assets.reduce((s, a) => s + a.value, 0);
  document.getElementById('total-assets-display').textContent = fmt(total);

  if (!state.assets.length) {
    previewEl.innerHTML = '<div class="empty"><span class="empty-icon">🏦</span>No assets added</div>';
    viewAllBtn.style.display = 'none';
  } else {
    previewEl.innerHTML = state.assets.slice(0, PREVIEW_COUNT).map(assetRowHtml).join('');
    viewAllBtn.style.display = state.assets.length > PREVIEW_COUNT ? '' : 'none';
    viewAllBtn.textContent = `View All (${state.assets.length})`;
  }
  refreshDetailSheet();
}

export function openAssetDetail() {
  openDetailSheet('All Assets', () => openModal('modal-add-asset'), renderAssetDetailBody);
}

function renderAssetDetailBody() {
  const body = document.getElementById('detail-sheet-body');
  body.innerHTML = state.assets.length
    ? state.assets.map(assetRowHtml).join('')
    : '<div class="empty"><span class="empty-icon">🏦</span>No assets added</div>';
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
