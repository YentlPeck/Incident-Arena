/* Paired invoice results; these never change the original leak-case verdict. */
(function (root) {
  'use strict';
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const count = (n) => Number.isInteger(n) && n >= 0 ? n : 0;
  const names = {alone: 'Alone', sonnet: 'Sonnet', opus: 'Opus', sol: 'Sol', placebo: 'Fake playbook'};
  const keys = ['alone', 'placebo', 'sonnet', 'opus', 'sol'];
  const players = ['haiku', 'luna'];
  const who = (p) => p === 'haiku' ? 'Haiku' : 'Luna';
  const color = (p) => p === 'haiku' ? 'var(--haiku)' : 'var(--luna)';

  function chart(groups, conditions, label) {
    const W = 900, L = 158, R = 112, pw = W - L - R, row = 34;
    let y = 24, svg = '';
    for (const group of groups) {
      const n = count(group.n), c = color(group.player);
      svg += `<text class="lbl" x="0" y="${y}">${who(group.player)}</text>`
        + `<text x="${L}" y="${y}">${n} of ${count(group.planned)} shared cases checked</text>`;
      y += 14;
      for (const key of conditions) {
        const solved = Math.min(n, count(group.solved?.[key])), width = n ? solved / n * pw : 0;
        const outlined = key === 'alone' || key === 'placebo';
        svg += `<text x="0" y="${y + 16}">${esc(names[key] || key)}</text>`
          + `<g><title>${who(group.player)}, ${esc(names[key] || key)}: ${solved} solved of ${n} checked cases</title>`
          + `<rect x="${L}" y="${y}" width="${pw}" height="22" rx="4" fill="#1d1d1d"/>`
          + (width ? `<rect x="${L + 1}" y="${y + 1}" width="${Math.max(2, width - 2)}" height="20" rx="3" fill="${outlined ? 'none' : c}" stroke="${c}" stroke-width="2"${key === 'placebo' ? ' stroke-dasharray="5 4"' : ''}/>` : '')
          + `</g><text class="val" x="${L + pw + 12}" y="${y + 16}">${n ? `${solved} of ${n}` : 'pending'}</text>`;
        y += row;
      }
      y += 24;
    }
    return `<svg viewBox="0 0 ${W} ${y}" role="img" aria-label="${esc(label)}">${svg}</svg>`;
  }

  function render(data = {}) {
    const planned = count(data.planned) || 55, perAI = data.per_ai || {};
    const comparisons = players.map((player) => ({player, ...(perAI[player]?.comparisons?.sonnet || {})}));
    const ready = comparisons.every((g) => g.complete === true && g.n === planned);
    const primary = comparisons.map((g) => ({player: g.player, n: g.n, planned,
      solved: {alone: g.solved?.alone, sonnet: g.solved?.playbook}}));
    const shared = players.map((player) => ({player, planned, ...(perAI[player]?.shared || {})}));
    const valid = players.reduce((sum, player) => sum + Object.values(perAI[player]?.conditions || {}).reduce((n, g) => n + count(g.n), 0), 0);
    const total = planned * players.length * keys.length;
    // Verdict rule fixed before the transfer test finished; identical to the leak-case rule:
    // both AIs need p <= 0.025 (one-sided exact paired sign test); "Yes" also needs a gain of >= 15 points for both.
    const ALPHA = 0.025, BIG = 0.15;
    const pass = comparisons.every((g) => typeof g.p === 'number' && g.p <= ALPHA);
    const verdict = !ready ? 'Too early' : pass ? (comparisons.every((g) => g.gain >= BIG) ? 'Yes' : 'A little') : 'Not yet';
    const meaning = {
      'Too early': 'In progress — no verdict yet.',
      'Yes': 'Yes: for both AIs the Sonnet lessons help on the new case too, by a large margin that luck would rarely produce.',
      'A little': 'A little: for both AIs the gain is very unlikely to be luck, but small for at least one of them.',
      'Not yet': 'Not yet: for at least one AI the gain on the new case could still be luck.',
    }[verdict];
    const detail = ready ? ' ' + comparisons.map((g) => `${who(g.player)}: ${count(g.solved?.alone)} → ${count(g.solved?.playbook)} of ${planned} (solved only with the playbook ${count(g.wins)}, only alone ${count(g.losses)}).`).join(' ') : '';
    const title = meaning;
    // Do not interpret significance from a growing sample. Teacher comparisons are descriptive.
    return `<p class="takeaway"><strong>${esc(title)}</strong>${esc(detail)} ${valid} of ${total} planned games checked.</p>`
      + `<div class="framed chart"><p class="chart-title">New incident, same Sonnet lessons</p>`
      + `<p class="chart-sub">Within each AI, both bars use exactly the same invoice cases. Solved = correct person, method and evidence.</p>`
      + chart(primary, ['alone', 'sonnet'], 'Invoice cases solved alone and with the frozen Sonnet playbook') + '</div>'
      + `<p class="note">${ready ? 'The main transfer comparison is complete. The other playbooks are a side comparison.' : 'We wait for all 55 pairs per AI before interpreting the main transfer comparison.'} Usage-limit and interrupted attempts do not count as losses; valid wrong answers and games that run out of commands do.</p>`
      + `<details style="margin-top:24px"><summary>Compare all four playbooks</summary><div class="framed chart">`
      + `<p class="chart-title">Every bar uses the same checked cases</p><p class="chart-sub">This view waits for all five versions of a case. The dashed bar is the fake playbook.</p>`
      + chart(shared, keys, 'Descriptive invoice comparison of all frozen playbooks on shared cases') + '</div></details>';
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = {render, chart};
  if (typeof document !== 'undefined') {
    const target = document.getElementById('transfer');
    if (target) target.innerHTML = render(root.PF_STORY2 || {});
  }
})(typeof window !== 'undefined' ? window : globalThis);
