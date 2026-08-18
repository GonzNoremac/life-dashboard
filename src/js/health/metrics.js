// ═══════════════════ HEALTH — BODY METRICS ═══════════════════

export function updateMetrics() {
  const weight = parseFloat(document.getElementById('metric-weight').value);
  const height = parseFloat(document.getElementById('metric-height').value);
  const bf = parseFloat(document.getElementById('metric-bf').value);
  let html = '';
  if (weight && height) {
    const bmi = (weight / ((height/100) ** 2)).toFixed(1);
    const cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
    const col = bmi < 18.5 ? 'blue' : bmi < 25 ? 'green' : bmi < 30 ? 'yellow' : 'red';
    html += `<div style="margin-bottom:0.5rem">BMI: <span class="${col}" style="font-weight:600">${bmi}</span> <span class="muted">(${cat})</span></div>`;
  }
  if (weight && bf) {
    const lbm = (weight * (1 - bf/100)).toFixed(1);
    const fatMass = (weight * bf / 100).toFixed(1);
    html += `<div style="margin-bottom:0.25rem">Lean Body Mass: <span class="green" style="font-weight:600">${lbm} kg</span></div>`;
    html += `<div>Fat Mass: <span class="yellow" style="font-weight:600">${fatMass} kg</span></div>`;
  }
  if (!html) html = 'Enter metrics to see calculations.';
  document.getElementById('metric-results').innerHTML = html;
}
