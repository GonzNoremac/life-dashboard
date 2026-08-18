import { openSettingsModal } from './firebase/settings.js';

// ═══════════════════ MODALS ═══════════════════
export function openModalRaw(id) { document.getElementById(id).classList.add('open'); }
export function closeModal(id) { document.getElementById(id).classList.remove('open'); }

export function openModal(id) {
  if (id === 'modal-settings') { openSettingsModal(); return; }
  openModalRaw(id);
}

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

// ═══════════════════ CONTEXT MENU ═══════════════════
export const CTX = { action: null, deleteAction: null };

export function openCtx(e, editFn, deleteFn) {
  e.stopPropagation();
  const menu = document.getElementById('ctx-menu');
  CTX.editFn   = editFn;
  CTX.deleteFn = deleteFn;
  // Hide edit option if no edit function provided
  document.getElementById('ctx-edit').style.display = editFn ? 'flex' : 'none';
  document.getElementById('ctx-divider') && (document.getElementById('ctx-divider').style.display = editFn ? 'block' : 'none');
  menu.classList.add('open');
  // Position near the button
  const rect = e.currentTarget.getBoundingClientRect();
  const menuW = 150, menuH = 90;
  let left = rect.right - menuW;
  let top  = rect.bottom + 4;
  if (left < 8) left = 8;
  if (top + menuH > window.innerHeight - 8) top = rect.top - menuH - 4;
  menu.style.left = left + 'px';
  menu.style.top  = top  + 'px';
}

export function ctxEdit()   { closeCtxMenu(); if (CTX.editFn)   CTX.editFn(); }
export function ctxDelete() { closeCtxMenu(); if (CTX.deleteFn) CTX.deleteFn(); }
export function closeCtxMenu() { document.getElementById('ctx-menu').classList.remove('open'); }

document.addEventListener('click', e => {
  if (!e.target.closest('#ctx-menu') && !e.target.closest('.ctx-btn')) closeCtxMenu();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCtxMenu(); });

// ── EDIT MODAL HELPERS ────────────────────────────────────

export function openEditModal(modalId, title, submitLabel, submitFn) {
  // Swap modal into edit mode
  const modal = document.getElementById(modalId);
  const titleEl = modal.querySelector('.modal-title');
  const submitBtn = modal.querySelector('.btn-primary');
  if (titleEl) titleEl.textContent = title;
  if (submitBtn) {
    submitBtn.textContent = submitLabel;
    submitBtn._editFn = submitFn;
    submitBtn.onclick = () => submitBtn._editFn();
  }
  openModal(modalId);
}

export function resetModalToAdd(modalId, title, submitLabel, submitFn) {
  const modal = document.getElementById(modalId);
  const titleEl = modal.querySelector('.modal-title');
  const submitBtn = modal.querySelector('.btn-primary');
  if (titleEl) titleEl.textContent = title;
  if (submitBtn) { submitBtn.textContent = submitLabel; submitBtn.onclick = submitFn; }
}
