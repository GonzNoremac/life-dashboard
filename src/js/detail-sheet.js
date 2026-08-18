// ═══════════════════ DETAIL SHEET ═══════════════════
// A generic full-screen list view used by the finance tables (Expenses,
// Bills, Income, Assets) so the main Finance page can show a short preview
// instead of a whole desktop table. Each domain module supplies its own
// row markup + a render function; this just owns the open/close/refresh
// mechanics so all four behave identically.

let activeRenderer = null;

export function openDetailSheet(title, addOnClick, renderBody) {
  document.getElementById('detail-sheet-title').textContent = title;
  const addBtn = document.getElementById('detail-sheet-add-btn');
  if (addOnClick) {
    addBtn.style.display = '';
    addBtn.onclick = addOnClick;
  } else {
    addBtn.style.display = 'none';
  }
  activeRenderer = renderBody;
  renderBody();
  document.getElementById('detail-sheet').classList.add('open');
}

export function closeDetailSheet() {
  document.getElementById('detail-sheet').classList.remove('open');
  activeRenderer = null;
}

// Called at the end of each domain's render*() so edits/deletes/adds made
// elsewhere (or synced down from Firebase) keep an open sheet in sync.
export function refreshDetailSheet() {
  if (activeRenderer) activeRenderer();
}
