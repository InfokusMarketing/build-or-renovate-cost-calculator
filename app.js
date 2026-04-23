// Cost calculator micro‑app script

// Define application state
const state = {
  type: null,
  size: null,
  scope: null,
  site: null,
  finish: null,
  occupancy: null
};

// Size midpoints (m²)
const sizeMid = { s: 160, m: 270, l: 420, xl: 600 };

// Base $/m² [low, high] by project type and scope
const baseRates = {
  reno: {
    partial: [1400, 2600],
    full: [2400, 3900],
    whole: [3200, 5400]
  },
  rebuild: {
    partial: [3500, 5200],
    full: [4800, 7000],
    whole: [6000, 9500]
  },
  unsure: {
    partial: [2000, 4000],
    full: [3200, 5500],
    whole: [4200, 7200]
  }
};

// Multipliers for site complexity
const siteMult = {
  easy: [1.0, 1.0],
  moderate: [1.12, 1.22],
  complex: [1.30, 1.50]
};

// Multipliers for finish level
const finishMult = {
  quality: [1.0, 1.0],
  premium: [1.20, 1.30],
  bespoke: [1.45, 1.65]
};

/**
 * Format a number into a currency range string.
 * Rounds to nearest $5k for thousands and to 0.1M for millions.
 * @param {number} n
 * @returns {string}
 */
function fmt(n) {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return '$' + (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + 'M';
  }
  // round to nearest $5k
  const rounded = Math.round(n / 5000) * 5000;
  return '$' + rounded.toLocaleString('en-AU');
}

/**
 * Calculate cost ranges and soft costs based on current state.
 * Returns null if required selections are missing.
 */
function calculate() {
  const { type, size, scope, site, finish, occupancy } = state;
  if (!type || !size || !scope) return null;

  // Determine base construction cost range
  const mid = sizeMid[size];
  const base = baseRates[type][scope];
  const sm = siteMult[site] || [1, 1];
  const fm = finishMult[finish] || [1, 1];
  const lo = base[0] * mid * sm[0] * fm[0];
  const hi = base[1] * mid * sm[1] * fm[1];

  // Build list of soft cost items
  const softItems = [];
  // Design & documentation – 9–14% of construction
  const dLo = lo * 0.09;
  const dHi = hi * 0.14;
  softItems.push({ name: 'Design & documentation (external architect)', lo: dLo, hi: dHi, highlight: false });
  // Planning, permits & approvals – fixed range
  softItems.push({ name: 'Planning, permits & approvals', lo: 18000, hi: 55000, highlight: false });
  // Demolition & site clearance – only for rebuild
  if (type === 'rebuild') {
    softItems.push({ name: 'Demolition & site clearance', lo: 38000, hi: 95000, highlight: true });
  }
  // Structural & soil reports: excluded from calculation (covered by Latitude 37)
  // Landscaping & external works: excluded from calculation (budget separately)
  // Temporary accommodation – only when moving out
  if (occupancy === 'out') {
    softItems.push({ name: 'Temporary accommodation', lo: 36000, hi: 130000, highlight: true });
  }
  // Contingency – recommended 10–18% of construction
  const cLo = lo * 0.10;
  const cHi = hi * 0.18;
  softItems.push({ name: 'Contingency (recommended 10–18%)', lo: cLo, hi: cHi, highlight: false });

  // Sum soft costs
  const softLo = softItems.reduce((sum, item) => sum + item.lo, 0);
  const softHi = softItems.reduce((sum, item) => sum + item.hi, 0);

  return {
    lo,
    hi,
    softItems,
    softLo,
    softHi,
    totalLo: lo + softLo,
    totalHi: hi + softHi
  };
}

/**
 * Generate insights based on current selections.
 * Returns an array of strings.
 */
function getInsights() {
  const { type, scope, site, finish, occupancy } = state;
  const items = [];
  if (type === 'reno' && scope === 'whole') {
    items.push('A full structural renovation often approaches rebuild cost. It’s worth exploring both options before committing.');
  }
  if (type === 'rebuild') {
    items.push('Demolition, connection fees and site establishment are separate from the build rate — and frequently underestimated.');
  }
  if (site === 'complex') {
    items.push('High‑complexity sites can add 30–50% to construction costs due to engineering, shoring or heritage compliance.');
  }
  if (finish === 'bespoke') {
    items.push('Bespoke projects often have long lead times — custom joinery, stone and imported materials can affect programme as much as budget.');
  }
  if (occupancy === 'in') {
    items.push('Living in during works is rarely cheaper. Staging requirements can slow the programme and add cost in ways that aren’t obvious upfront.');
  }
  if (finish === 'premium' || finish === 'bespoke') {
    items.push('At premium and bespoke levels, styling, furnishing and AV/technology fit‑out are significant costs outside the build contract.');
  }
  items.push('Soft costs — design, permits, reports and contingency — typically represent 25–40% of total spend and are often underestimated.');
  return items.slice(0, 3);
}

/**
 * Provide explanatory notes about programme timing, cost escalation and land holding costs.
 * These notes are static and shown to all users once a result is displayed.
 * @returns {string[]}
 */
function getAdditionalNotes() {
  return [
    '<strong>Programme timing:</strong> from a decision today to handover typically spans around 2.5 years (26–34 months). This encompasses design, documentation, approvals and construction.',
    '<strong>Cost escalation:</strong> allowances are typically around 4% per year. Historically escalation has been closer to 6% but is currently slowing.',
    '<strong>Reports:</strong> structural and soil reports are not included here; Latitude 37 covers these costs within our service.',
    '<strong>Landscaping:</strong> landscaping and external works are excluded from this estimate and should be budgeted separately.',
    '<strong>Worth understanding:</strong> a home of this scale isn’t just construction — it’s design, documentation, approvals and coordination. Early decisions have a compounding impact on overall timing.'
  ];
}

/**
 * Render results to the DOM.
 */
function updateResults() {
  const results = calculate();
  const placeholder = document.getElementById('placeholder');
  const resultsEl = document.getElementById('results');
  if (!results) {
    placeholder.hidden = false;
    resultsEl.hidden = true;
    return;
  }
  placeholder.hidden = true;
  resultsEl.hidden = false;

  // Construction range and note
  const constructionRange = document.getElementById('construction-range');
  const constructionNote = document.getElementById('construction-note');
  constructionRange.textContent = `${fmt(results.lo)} – ${fmt(results.hi)}`;
  constructionNote.textContent = `${state.type === 'unsure' ? 'Estimate based on typical renovation/rebuild mix' : ''}`;

  // Soft costs
  const softList = document.getElementById('soft-costs-list');
  softList.innerHTML = '';
  results.softItems.forEach(item => {
    const li = document.createElement('li');
    li.className = item.highlight ? 'highlight' : '';
    const nameSpan = document.createElement('span');
    nameSpan.textContent = item.name;
    const valueSpan = document.createElement('span');
    valueSpan.textContent = `${fmt(item.lo)} – ${fmt(item.hi)}`;
    li.appendChild(nameSpan);
    li.appendChild(valueSpan);
    softList.appendChild(li);
  });

  // Total
  document.getElementById('total-range').textContent = `${fmt(results.totalLo)} – ${fmt(results.totalHi)}`;

  // Insights
  const insightsEl = document.getElementById('insights');
  const insights = getInsights();
  insightsEl.innerHTML = '';
  const ul = document.createElement('ul');
  insights.forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    ul.appendChild(li);
  });
  insightsEl.appendChild(ul);

  // Additional notes (static explanatory content)
  const notesEl = document.getElementById('notes');
  if (notesEl) {
    const notes = getAdditionalNotes();
    // Render as separate paragraphs for clarity
    notesEl.innerHTML = '';
    notes.forEach(note => {
      const p = document.createElement('p');
      // Use innerHTML so that strong tags are rendered as bold
      p.innerHTML = note;
      notesEl.appendChild(p);
    });
  }
}

/**
 * Generate a plain‑text summary of the selections and results.
 */
function generateSummary() {
  const results = calculate();
  if (!results) return 'No estimate available — please select your project details.';
  let summary = 'Project cost estimate:\n';
  summary += `Construction: ${fmt(results.lo)} – ${fmt(results.hi)}\n`;
  summary += 'Soft costs:\n';
  results.softItems.forEach(item => {
    summary += `  • ${item.name}: ${fmt(item.lo)} – ${fmt(item.hi)}\n`;
  });
  summary += `Total: ${fmt(results.totalLo)} – ${fmt(results.totalHi)}\n`;
  const insights = getInsights();
  if (insights.length) {
    summary += '\nInsights:\n';
    insights.forEach(line => { summary += `  • ${line}\n`; });
  }
  return summary;
}

/**
 * Copy the summary to clipboard.
 */
async function copySummary() {
  const text = generateSummary();
  try {
    await navigator.clipboard.writeText(text);
    alert('Summary copied to clipboard.');
  } catch (err) {
    console.error('Copy failed', err);
    alert('Copy not supported in this browser.');
  }
}

/**
 * Select an option and update state.
 */
function handleOptionClick(e) {
  const btn = e.currentTarget;
  const group = btn.closest('.question').dataset.group;
  const value = btn.dataset.value;
  // Update state
  state[group] = value;
  // Mark selected button within its group
  const buttons = btn.parentElement.querySelectorAll('.option-btn');
  buttons.forEach(b => b.classList.toggle('selected', b === btn));
  // Update results
  updateResults();
}

// Attach events after DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  // Option buttons
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', handleOptionClick);
  });
  // Print
  document.getElementById('print-btn').addEventListener('click', () => {
    window.print();
  });
  // Copy
  document.getElementById('copy-btn').addEventListener('click', copySummary);
});