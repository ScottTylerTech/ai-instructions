const state = { skills: [], query: '', domain: 'all' };
const list = document.querySelector('#skill-list');
const search = document.querySelector('#search');
const domainFilter = document.querySelector('#domain-filter');
const resultCount = document.querySelector('#result-count');
const emptyState = document.querySelector('#empty-state');
const dialog = document.querySelector('#raw-dialog');
const rawTitle = document.querySelector('#raw-title');
const rawContent = document.querySelector('#raw-content code');

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function render() {
  const query = state.query.toLowerCase();
  const filtered = state.skills.filter(skill => {
    const matchesDomain = state.domain === 'all' || skill.domain === state.domain;
    const matchesQuery = !query || `${skill.name} ${skill.description} ${skill.domain}`.toLowerCase().includes(query);
    return matchesDomain && matchesQuery;
  });
  resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'skill' : 'skills'} shown`;
  emptyState.hidden = filtered.length !== 0;
  list.innerHTML = filtered.map(skill => `<article class="skill-card">
    <div class="skill-top"><span class="skill-name">${escapeHtml(skill.name)}</span><span class="domain-tag">${escapeHtml(skill.domain)}</span></div>
    <p class="skill-description">${escapeHtml(skill.description)}</p>
    <button class="raw-button" data-skill="${escapeHtml(skill.name)}">View raw SKILL.md <span aria-hidden="true">↗</span></button>
  </article>`).join('');
}

async function showRaw(skillName) {
  rawTitle.textContent = `${skillName}/SKILL.md`;
  rawContent.textContent = 'Loading...';
  dialog.showModal();
  try {
    const response = await fetch(`skills/${encodeURIComponent(skillName)}/SKILL.md`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    rawContent.textContent = await response.text();
  } catch (error) {
    rawContent.textContent = 'The raw skill file could not be loaded. Open the source repository to inspect it.';
  }
}

document.querySelector('#skill-list').addEventListener('click', event => {
  const button = event.target.closest('[data-skill]');
  if (button) showRaw(button.dataset.skill);
});
search.addEventListener('input', event => { state.query = event.target.value; render(); });
domainFilter.addEventListener('change', event => { state.domain = event.target.value; render(); });
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
document.querySelectorAll('.copy-button').forEach(button => button.addEventListener('click', async () => {
  await navigator.clipboard.writeText(button.dataset.copy);
  const originalLabel = button.textContent;
  button.textContent = 'Copied';
  setTimeout(() => { button.textContent = originalLabel; }, 1400);
}));

Promise.all([fetch('version.json').then(response => response.json()), fetch('skills.json').then(response => response.json())])
  .then(([version, skills]) => {
    document.querySelector('#version').textContent = `v${version.version}`;
    document.querySelector('#skill-count').textContent = skills.length;
    state.skills = skills;
    render();
  })
  .catch(() => {
    document.querySelector('#version').textContent = 'Unavailable';
    resultCount.textContent = 'Skill catalog unavailable';
    emptyState.hidden = false;
    emptyState.textContent = 'The catalog is not available in this preview.';
  });
