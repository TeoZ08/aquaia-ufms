const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.tab-panel');
const form = document.querySelector('#occurrenceForm');
const resultCard = document.querySelector('#resultCard');
const analysisResult = document.querySelector('#analysisResult');
const occurrenceList = document.querySelector('#occurrenceList');
const stats = document.querySelector('#stats');
const refreshBtn = document.querySelector('#refreshBtn');
const searchInput = document.querySelector('#searchInput');
const statusFilter = document.querySelector('#statusFilter');
const toast = document.querySelector('#toast');
const imageInput = document.querySelector('input[name="imagem"]');
const imagePreview = document.querySelector('#imagePreview');
const geminiStatus = document.querySelector('#geminiStatus');

let occurrences = [];

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3200);
}

function setActiveTab(name) {
  tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === name));
  panels.forEach(panel => panel.classList.toggle('active', panel.id === name));
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    setActiveTab(tab.dataset.tab);
    if (tab.dataset.tab === 'painel') loadOccurrences();
  });
});

document.querySelectorAll('[data-scroll]').forEach(button => {
  button.addEventListener('click', () => {
    const target = document.getElementById(button.dataset.scroll);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

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
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    form.reset();
    imagePreview.classList.add('hidden');
    imagePreview.innerHTML = '';
    await loadOccurrences();
    showToast('Ocorrência registrada e analisada com sucesso.');
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Analisar com IA';
  }
});

function renderAnalysis(data) {
  const items = [
    ['Classificação', data.tipo_ocorrencia],
    ['Gravidade', data.gravidade],
    ['Prioridade', data.prioridade],
    ['Estimativa', `${Number(data.litros_por_dia_estimados).toLocaleString('pt-BR')} L/dia`],
    ['Confiança', data.confianca],
    ['Fonte da análise', data.fonte_analise],
    ['Ação sugerida', data.acao_sugerida, 'wide'],
    ['Justificativa', data.justificativa, 'wide']
  ];
  analysisResult.innerHTML = items.map(([label, value, wide]) => `
    <div class="analysis-item ${wide || ''}">
      <strong>${label}</strong>
      <p>${escapeHtml(value)}</p>
    </div>
  `).join('');
}

async function checkHealth() {
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    if (data.gemini_configurado) {
      geminiStatus.textContent = `Gemini ativo: ${data.modelo}`;
      geminiStatus.classList.add('on');
    } else {
      geminiStatus.textContent = 'Modo fallback: regras do MVP';
      geminiStatus.classList.add('off');
    }
  } catch {
    geminiStatus.textContent = 'Status indisponível';
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

  stats.innerHTML = `
    <div class="stat"><strong>Total</strong><p>${total}</p></div>
    <div class="stat"><strong>Em aberto</strong><p>${open}</p></div>
    <div class="stat"><strong>Estimativa</strong><p>${liters.toLocaleString('pt-BR')} L/dia</p></div>
    <div class="stat"><strong>Alta prioridade</strong><p>${urgent}</p></div>
  `;

  if (!filtered.length) {
    occurrenceList.innerHTML = '<div class="occurrence"><p>Nenhuma ocorrência encontrada para o filtro atual.</p></div>';
    return;
  }

  occurrenceList.innerHTML = filtered.map(item => `
    <article class="occurrence">
      <div class="thumb">${item.imagem_url ? `<img src="${item.imagem_url}" alt="Imagem da ocorrência" />` : 'H₂O'}</div>
      <div>
        <h3>${escapeHtml(item.tipo_ocorrencia)}</h3>
        <p><strong>Local:</strong> ${escapeHtml(item.local)}</p>
        <p><strong>Descrição:</strong> ${escapeHtml(item.descricao)}</p>
        <p><strong>Ação:</strong> ${escapeHtml(item.acao_sugerida)}</p>
        <div class="badges">
          <span class="badge ${slug(item.gravidade)}">Gravidade: ${escapeHtml(item.gravidade)}</span>
          <span class="badge ${slug(item.prioridade)}">Prioridade: ${escapeHtml(item.prioridade)}</span>
          <span class="badge">${Number(item.litros_por_dia_estimados).toLocaleString('pt-BR')} L/dia</span>
          <span class="badge ${slug(item.status)}">${escapeHtml(item.status)}</span>
          <span class="badge">${escapeHtml(item.fonte_analise)}</span>
        </div>
      </div>
      <select class="status-select" data-id="${item.id}">
        ${['Aberto', 'Em análise', 'Resolvido'].map(status => `<option ${item.status === status ? 'selected' : ''}>${status}</option>`).join('')}
      </select>
    </article>
  `).join('');

  document.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', async () => {
      await updateStatus(select.dataset.id, select.value);
    });
  });
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
  } catch (error) {
    showToast(error.message);
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function slug(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

refreshBtn.addEventListener('click', loadOccurrences);
searchInput.addEventListener('input', renderDashboard);
statusFilter.addEventListener('change', renderDashboard);

checkHealth();
loadOccurrences();
