import { Controller } from "@hotwired/stimulus"
import { buildMapData, getMostCriticalItem } from "../lib/campus_points"
import {
  STATUSES,
  badgeClass,
  escapeHtml,
  formatCurrency,
  formatDate,
  formatDatetime,
  formatNumber,
  impactFor,
  normalizeSearch,
  shortText,
} from "../lib/format"

export default class extends Controller {
  static targets = [
    "homeStats",
    "impactStats",
    "recentList",
    "campusPreview",
    "stats",
    "list",
    "search",
    "statusFilter",
    "priorityFilter",
    "statusSegment",
  ]
  static values = {
    endpoint: { type: String, default: "/api/ocorrencias" },
    tariff: { type: Number, default: 71.03 },
  }

  connect() {
    this.occurrences = []
    this.request = null
    this.load()
  }

  handleScreenChange(event) {
    if (["dashboard", "painel", "mapa"].includes(event.detail?.screen)) this.load()
  }

  reload() {
    this.load(true)
  }

  async load(force = false) {
    if (this.request && !force) return this.request
    this.request = fetch(this.endpointValue)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Não foi possível carregar ocorrências.")))
      .then((payload) => {
        this.occurrences = Array.isArray(payload) ? payload : []
        this.render()
        window.dispatchEvent(new CustomEvent("aquaia:occurrences-updated", { detail: { occurrences: this.occurrences } }))
      })
      .catch((error) => {
        window.dispatchEvent(new CustomEvent("aquaia:toast", { detail: { message: error.message } }))
      })
      .finally(() => {
        this.request = null
      })
    return this.request
  }

  filter() {
    this.renderPanel()
  }

  setStatus(event) {
    const status = event.params.status || ""
    if (this.hasStatusFilterTarget) this.statusFilterTarget.value = status
    this.statusSegmentTargets.forEach((button) => {
      button.classList.toggle("is-active", (button.dataset.dashboardStatusParam || "") === status)
    })
    this.renderPanel()
  }

  async updateStatus(event) {
    const id = event.currentTarget.dataset.id
    const status = event.currentTarget.value
    if (!id) return

    try {
      const response = await fetch(`/api/ocorrencias/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.erro || "Não foi possível atualizar o status.")
      await this.load(true)
      window.dispatchEvent(new CustomEvent("aquaia:toast", { detail: { message: "Status atualizado." } }))
    } catch (error) {
      window.dispatchEvent(new CustomEvent("aquaia:toast", { detail: { message: error.message } }))
    }
  }

  render() {
    this.renderHome()
    this.renderRecent()
    this.renderCampusPreview()
    this.renderPanel()
  }

  renderHome() {
    const total = this.occurrences.length
    const open = this.occurrences.filter((item) => item.status !== "Resolvido").length
    const urgent = this.occurrences.filter((item) => ["Urgente", "Alta"].includes(item.prioridade)).length
    const resolved = this.occurrences.filter((item) => item.status === "Resolvido").length
    const liters = this.occurrences.reduce((sum, item) => sum + Number(item.litros_por_dia_estimados || 0), 0)
    const impact = impactFor({ litros_por_dia_estimados: liters }, this.tariffValue)
    const responseIndex = total ? Math.max(45, Math.min(99, 100 - (open * 4) - (urgent * 8) + (resolved * 5))) : 100

    if (this.hasHomeStatsTarget) {
      this.homeStatsTarget.innerHTML = `
        ${this.metricCard("Ocorrências abertas", open, "Demandas aguardando manutenção")}
        ${this.metricCard("Litros/dia monitorados", `${formatNumber(liters)} L`, "Potencial de desperdício em atenção")}
        ${this.metricCard("Pontos críticos", urgent, "Prioridade alta ou urgente")}
        ${this.metricCard("Índice de resposta", `${responseIndex}%`, "Relação entre abertas e resolvidas")}
      `
    }

    if (this.hasImpactStatsTarget) {
      this.impactStatsTarget.innerHTML = `
        ${this.impactCell(`${formatNumber(impact.litersPerMonth)} L`, "Litros/mês estimados")}
        ${this.impactCell(formatCurrency(impact.costPerMonth), "Custo estimado/mês")}
        ${this.impactCell(String(resolved), "Ocorrências resolvidas")}
      `
    }
  }

  metricCard(label, value, help) {
    return `
      <article class="aqua-metric">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <p>${escapeHtml(help)}</p>
      </article>
    `
  }

  impactCell(value, label) {
    return `<div class="aqua-impact-cell"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`
  }

  renderRecent() {
    if (!this.hasRecentListTarget) return
    const latest = [...this.occurrences]
      .sort((a, b) => Number(b.criado_em || 0) - Number(a.criado_em || 0))
      .slice(0, 3)

    if (!latest.length) {
      this.recentListTarget.innerHTML = this.emptyState("Nenhuma ocorrência registrada ainda.", "Registre o primeiro ponto de atenção hídrica do campus.")
      return
    }

    this.recentListTarget.innerHTML = latest.map((item) => `
      <article class="aqua-panel p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <strong class="block text-sm">${escapeHtml(item.local)}</strong>
            <p class="mt-1 text-xs aqua-muted">${escapeHtml(item.tipo_ocorrencia)}</p>
          </div>
          <span class="${badgeClass(item.prioridade)}">${escapeHtml(item.prioridade)}</span>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <span class="aqua-badge aqua-badge-blue">${formatNumber(item.litros_por_dia_estimados)} L/dia</span>
          <span class="${badgeClass(item.status)}">${escapeHtml(item.status)}</span>
        </div>
      </article>
    `).join("")
  }

  renderCampusPreview() {
    if (!this.hasCampusPreviewTarget) return
    const points = buildMapData(this.occurrences)
      .filter((point) => point.count > 0)
      .sort((a, b) => b.urgent - a.urgent || b.count - a.count || b.liters - a.liters)
      .slice(0, 3)

    if (!points.length) {
      this.campusPreviewTarget.innerHTML = this.emptyState("Mapa pronto para receber dados.", "Os pontos críticos aparecem aqui quando houver registros.")
      return
    }

    this.campusPreviewTarget.innerHTML = points.map((point, index) => {
      const critical = getMostCriticalItem(point.items)
      return `
        <article class="aqua-panel p-4">
          <div class="flex gap-3">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-aqua-cyan text-sm font-extrabold text-white">${index + 1}</span>
            <div>
              <strong class="block text-sm">${escapeHtml(point.label)}</strong>
              <p class="mt-1 text-xs aqua-muted">${point.count} ocorrência(s), ${formatNumber(point.liters)} L/dia</p>
              <small class="mt-2 block text-xs text-aqua-cyan">${critical ? `${escapeHtml(critical.prioridade)} prioridade em ${escapeHtml(shortText(critical.tipo_ocorrencia, 42))}` : "Sem ocorrência crítica"}</small>
            </div>
          </div>
        </article>
      `
    }).join("")
  }

  renderPanel() {
    const filtered = this.filteredOccurrences()
    const total = this.occurrences.length
    const open = this.occurrences.filter((item) => item.status !== "Resolvido").length
    const critical = this.occurrences.filter((item) => ["Urgente", "Alta"].includes(item.prioridade)).length
    const liters = this.occurrences.reduce((sum, item) => sum + Number(item.litros_por_dia_estimados || 0), 0)

    if (this.hasStatsTarget) {
      this.statsTarget.innerHTML = `
        ${this.statCard("Total", total)}
        ${this.statCard("Abertas", open)}
        ${this.statCard("Litros/dia", formatNumber(liters))}
        ${this.statCard("Críticas", critical)}
      `
    }

    if (!this.hasListTarget) return
    if (!filtered.length) {
      this.listTarget.innerHTML = this.emptyState("Nenhuma ocorrência encontrada com estes filtros.", "Ajuste busca, prioridade ou status para ampliar a lista.")
      return
    }

    this.listTarget.innerHTML = filtered.map((item) => this.occurrenceCard(item)).join("")
  }

  statCard(label, value) {
    return `<div class="aqua-panel p-3 text-center"><strong class="block text-[0.68rem] uppercase tracking-[0.12em] aqua-muted">${escapeHtml(label)}</strong><p class="mt-1 text-lg font-extrabold">${escapeHtml(value)}</p></div>`
  }

  occurrenceCard(item) {
    const impact = impactFor(item, this.tariffValue)
    return `
      <article class="aqua-card p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="max-w-2xl">
            <h3 class="text-base font-extrabold">${escapeHtml(item.local)}</h3>
            <p class="mt-1 text-sm aqua-muted">${escapeHtml(item.tipo_ocorrencia)}</p>
            <p class="mt-2 text-sm text-slate-600">${escapeHtml(shortText(item.descricao, 130))}</p>
          </div>
          <span class="${badgeClass(item.status)}">${escapeHtml(item.status)}</span>
        </div>
        <div class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <span class="${badgeClass(item.prioridade)}">${escapeHtml(item.prioridade)} prioridade</span>
          <span class="${badgeClass(item.gravidade)}">${escapeHtml(item.gravidade)}</span>
          <span class="aqua-badge aqua-badge-blue">${formatNumber(impact.litersPerDay)} L/dia</span>
          <span class="aqua-badge aqua-badge-green">${formatCurrency(impact.costPerMonth)}/mês</span>
        </div>
        <div class="mt-4 grid gap-3 rounded-2xl bg-aqua-mint/60 p-3 text-sm md:grid-cols-4">
          <div><span class="block text-xs aqua-muted">Litros/mês</span><strong>${formatNumber(impact.litersPerMonth)} L</strong></div>
          <div><span class="block text-xs aqua-muted">m³/mês</span><strong>${formatNumber(impact.cubicMetersPerMonth, 2)} m³</strong></div>
          <div><span class="block text-xs aqua-muted">Custo/ano</span><strong>${formatCurrency(impact.costPerYear)}</strong></div>
          <div><span class="block text-xs aqua-muted">Fonte</span><strong>${escapeHtml(item.fonte_analise)}</strong></div>
        </div>
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
          <time class="text-xs aqua-muted" datetime="${formatDatetime(item.criado_em)}">${formatDate(item.criado_em)}</time>
          <select class="aqua-input max-w-56 text-sm font-bold" data-id="${escapeHtml(item.id)}" data-action="change->dashboard#updateStatus" aria-label="Atualizar status da ocorrência">
            ${STATUSES.map((status) => `<option ${item.status === status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
        </div>
      </article>
    `
  }

  filteredOccurrences() {
    const query = normalizeSearch(this.hasSearchTarget ? this.searchTarget.value : "")
    const status = this.hasStatusFilterTarget ? this.statusFilterTarget.value : ""
    const priority = this.hasPriorityFilterTarget ? this.priorityFilterTarget.value : ""

    return this.occurrences.filter((item) => {
      const text = normalizeSearch(`${item.local} ${item.tipo_ocorrencia} ${item.status} ${item.descricao} ${item.gravidade} ${item.prioridade}`)
      const queryOk = !query || text.includes(query)
      const statusOk = !status || item.status === status
      const priorityOk = !priority || item.prioridade === priority
      return queryOk && statusOk && priorityOk
    })
  }

  emptyState(title, text) {
    return `
      <div class="aqua-panel grid min-h-40 place-items-center p-6 text-center">
        <div>
          <img src="/static/assets/brand/06_icon_letter_a_wave.png" alt="" class="mx-auto h-12 w-24 object-contain" />
          <strong class="mt-3 block">${escapeHtml(title)}</strong>
          <p class="mt-2 max-w-md text-sm aqua-muted">${escapeHtml(text)}</p>
        </div>
      </div>
    `
  }
}
