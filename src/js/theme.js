// ═══════════════════ THEME ═══════════════════
export function toggleDarkMode() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  setDarkMode(!isDark);
}

export function setDarkMode(on) {
  document.documentElement.setAttribute('data-theme', on ? 'dark' : 'light');
  localStorage.setItem('dashboard-theme', on ? 'dark' : 'light');
  syncDarkModeToggle(on);
}

export function syncDarkModeToggle(on) {
  const toggle = document.getElementById('darkmode-toggle');
  const knob   = document.getElementById('darkmode-knob');
  const label  = document.getElementById('darkmode-label');
  if (!toggle) return;
  toggle.style.background = on ? 'var(--accent)' : 'var(--surface3)';
  knob.style.transform    = on ? 'translateX(18px)' : 'translateX(0)';
  if (label) label.textContent = on ? 'ON' : 'OFF';
}

// Apply saved theme immediately on load
(function() {
  const saved = localStorage.getItem('dashboard-theme');
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
})();
