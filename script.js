const tabs = document.querySelectorAll('.tab');
const screens = document.querySelectorAll('.screen');
const form = document.querySelector('#occurrenceForm');
const resultCard = document.querySelector('#resultCard');
const analysisResult = document.querySelector('#analysisResult');
const occurrenceList = document.querySelector('#occurrenceList');
const stats = document.querySelector('#stats');
const homeStats = document.querySelector('#homeStats');
const impactStats = document.querySelector('#impactStats');
const mapLiters = document.querySelector('#mapLiters');
const refreshBtn = document.querySelector('#refreshBtn');
const searchInput = document.querySelector('#searchInput');
const statusFilter = document.querySelector('#statusFilter');
const toast = document.querySelector('#toast');
const imageInput = document.querySelector('input[name="imagem"]');
const imagePreview = document.querySelector('#imagePreview');
const geminiStatus = document.querySelector('#geminiStatus');
const descInput = document.querySelector('textarea[name="descricao"]');
const descCounter = document.querySelector('#descCounter');
const segments = document.querySelectorAll('.segment');

let occurrences = [];

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3200);
}

function setActiveTab(name) {
  screens.forEach(screen => screen.classList.toggle('active', screen.id === name));
  tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === name));

  if (['painel', 'dashboard', 'mapa'].includes(name)) {
    loadOccurrences();
  }
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
});

document.querySelectorAll('[data-tab-target]').forEach(button => {
  button.addEventListener('click', () => setActiveTab(button.dataset.tabTarget));
});

segments.forEach(segment => {
  segment.addEventListener('click', () => {
    segments.forEach(item => item.classList.remove('active'));
    segment.classList.add('active');
    statusFilter.value = segment.dataset.statusShort || '';
    renderDashboard();
  });
});

if (descInput && descCounter) {
  descInput.addEventListener('input', () => {
    descCounter.textContent = `${descInput.value.length}/300`;
  });
}

imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (!file) {
    imagePreview.classList.add('hidden');
    imagePreview.innerHTML = '';
    return;
  }
  const url = URL.createObjectURL(file);
  imagePreview.innerHTML = `<img src="${url}" alt="Prévia da ocorrência enviada" />`;
  imagePreview.classList.remove('hidden');
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Analisando...';

  try {
    const formData = new FormData(form);
    const response = await fetch('/api/ocorrencias', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.erro || 'Não foi possível registrar a ocorrência.');
    renderAnalysis(data);
    resultCard.classList.remove('hidden');
    form.reset();
    descCounter.textContent = '0/300';
    imagePreview.classList.add('hidden');
    imagePreview.innerHTML = '';
    await loadOccurrences();
    showToast('Ocorrência registrada e analisada com sucesso.');
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = '✨ Analisar com IA';
  }
});

function renderAnalysis(data) {
  analysisResult.innerHTML = `
    <div class="analysis-hero">
      <div class="analysis-drop">💧</div>
      <div>
        <small>Classificação</small>
        <strong>${escapeHtml(data.tipo_ocorrencia)}</strong>
        <p>${escapeHtml(data.justificativa)}</p>
      </div>
    </div>

    <div class="analysis-rows">
      <div class="analysis-row">
        <span>Gravidade</span>
        <strong class="status-pill ${slug(data.gravidade)}">${escapeHtml(data.gravidade)}</strong>
      </div>
      <div class="analysis-row">
        <span>Prioridade</span>
        <strong class="status-pill ${slug(data.prioridade)}">${escapeHtml(data.prioridade)}</strong>
      </div>
      <div class="analysis-row">
        <span>Litros estimados por dia</span>
        <strong class="status-pill blue">${formatNumber(data.litros_por_dia_estimados)} L/dia</strong>
      </div>
      <div class="analysis-row">
        <span>Fonte da análise</span>
        <strong>${escapeHtml(data.fonte_analise)}</strong>
      </div>
    </div>

    <div class="recommendation">
      <div class="tool-icon">🔧</div>
      <div>
        <strong>Sugestão de ação</strong>
        <p>${escapeHtml(data.acao_sugerida)}</p>
        <p class="justification">Confiança da análise: ${escapeHtml(data.confianca)}</p>
      </div>
    </div>
  `;
}

async function checkHealth() {
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    if (data.gemini_configurado) {
      geminiStatus.textContent = 'Gemini';
      geminiStatus.classList.add('on');
      geminiStatus.title = `Gemini ativo: ${data.modelo}`;
    } else {
      geminiStatus.textContent = 'MVP';
      geminiStatus.classList.add('off');
      geminiStatus.title = 'Modo fallback: regras do MVP';
    }
  } catch {
    geminiStatus.textContent = 'Off';
    geminiStatus.classList.add('off');
  }
}

async function loadOccurrences() {
  try {
    const response = await fetch('/api/ocorrencias');
    occurrences = await response.json();
    renderDashboard();
  } catch {
    showToast('Não foi possível carregar o painel.');
  }
}

function renderDashboard() {
  const filtered = getFilteredOccurrences();
  const total = occurrences.length;
  const open = occurrences.filter(item => item.status !== 'Resolvido').length;
  const liters = occurrences.reduce((sum, item) => sum + Number(item.litros_por_dia_estimados || 0), 0);
  const urgent = occurrences.filter(item => ['Urgente', 'Alta'].includes(item.prioridade)).length;
  const resolved = occurrences.filter(item => item.status === 'Resolvido').length;
  const estimatedSavings = Math.round(liters * 0.022);

  renderHomeStats(open, liters, urgent, resolved, estimatedSavings);

  stats.innerHTML = `
    <div class="stat"><strong>Total</strong><p>${total}</p></div>
    <div class="stat"><strong>Abertas</strong><p>${open}</p></div>
    <div class="stat"><strong>Litros</strong><p>${formatNumber(liters)}</p></div>
    <div class="stat"><strong>Críticas</strong><p>${urgent}</p></div>
  `;

  if (!filtered.length) {
    occurrenceList.innerHTML = '<div class="empty-state">Nenhuma ocorrência encontrada para o filtro atual.</div>';
    return;
  }

  occurrenceList.innerHTML = filtered.map(item => {
    const priorityClass = slug(item.prioridade);
    const statusClass = slug(item.status);
    const iconContent = item.imagem_url ? `<img src="${item.imagem_url}" alt="Imagem da ocorrência" />` : iconForOccurrence(item.tipo_ocorrencia);
    return `
      <article class="occurrence-card ${priorityClass}">
        <div class="occurrence-icon">${iconContent}</div>
        <div class="occurrence-content">
          <h3>${escapeHtml(item.local)}</h3>
          <p>${escapeHtml(item.tipo_ocorrencia)}</p>
          <p>${escapeHtml(shortText(item.descricao, 86))}</p>
          <div class="occurrence-meta">
            <span class="badge ${priorityClass}">${escapeHtml(item.prioridade)} prioridade</span>
            <span class="badge blue">${formatNumber(item.litros_por_dia_estimados)} L/dia</span>
          </div>
        </div>
        <span class="card-status badge ${statusClass}">${escapeHtml(item.status)}</span>
        <select class="status-select" data-id="${item.id}" aria-label="Atualizar status da ocorrência">
          ${['Aberto', 'Em análise', 'Resolvido'].map(status => `<option ${item.status === status ? 'selected' : ''}>${status}</option>`).join('')}
        </select>
      </article>
    `;
  }).join('');

  document.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', async () => {
      await updateStatus(select.dataset.id, select.value);
    });
  });
}

function renderHomeStats(open, liters, urgent, resolved, estimatedSavings) {
  if (homeStats) {
    homeStats.innerHTML = `
      <article class="metric-card"><span class="metric-icon blue">💧</span><strong>${open}</strong><p>Ocorrências abertas</p></article>
      <article class="metric-card"><span class="metric-icon green">♻</span><strong>${formatNumber(liters)} L</strong><p>Litros mapeados no painel</p></article>
      <article class="metric-card"><span class="metric-icon orange">⚠</span><strong>${urgent}</strong><p>Pontos críticos em atenção</p></article>
      <article class="metric-card"><span class="metric-icon blue">📈</span><strong>92%</strong><p>Índice visual do MVP</p></article>
    `;
  }

  if (impactStats) {
    impactStats.innerHTML = `
      <div><strong>${formatNumber(liters * 7)} L</strong><span>Litros mapeados</span></div>
      <div><strong>R$ ${formatNumber(estimatedSavings)}</strong><span>Economia estimada</span></div>
      <div><strong>${resolved}</strong><span>Ocorrências resolvidas</span></div>
    `;
  }

  if (mapLiters) {
    mapLiters.textContent = `${formatNumber(liters * 7)} L`;
  }
}

function getFilteredOccurrences() {
  const query = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  return occurrences.filter(item => {
    const text = `${item.local} ${item.tipo_ocorrencia} ${item.status} ${item.descricao}`.toLowerCase();
    const queryOk = !query || text.includes(query);
    const statusOk = !status || item.status === status;
    return queryOk && statusOk;
  });
}

async function updateStatus(id, status) {
  try {
    const response = await fetch(`/api/ocorrencias/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!response.ok) throw new Error('Erro ao atualizar status.');
    await loadOccurrences();
    showToast('Status atualizado.');
  } catch (error) {
    showToast(error.message);
  }
}

function iconForOccurrence(type) {
  const value = slug(type);
  if (value.includes('infiltra')) return '▧';
  if (value.includes('reaproveitamento')) return '♻';
  if (value.includes('descarga')) return '⚠';
  if (value.includes('bebedouro')) return '◌';
  return '💧';
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

function shortText(value, maxLength) {
  const text = String(value || '');
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function slug(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-');
}

refreshBtn.addEventListener('click', loadOccurrences);
searchInput.addEventListener('input', renderDashboard);
statusFilter.addEventListener('change', renderDashboard);

checkHealth();
loadOccurrences();
