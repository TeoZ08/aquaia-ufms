import { Controller } from "@hotwired/stimulus"
import {
  WATER_TARIFF_LABEL,
  badgeClass,
  escapeHtml,
  formatCurrency,
  formatDecimal,
  formatNumber,
  impactFor,
} from "../lib/format"

export default class extends Controller {
  static targets = ["form", "submitButton", "resultCard", "result", "status", "requiredField", "counter"]
  static values = {
    endpoint: { type: String, default: "/api/ocorrencias" },
    tariff: { type: Number, default: 71.03 },
  }

  connect() {
    this.resetCounter()
  }

  async submit(event) {
    event.preventDefault()
    if (!this.validateRequiredFields()) return

    this.setLoading(true)
    this.setStatus("Enviando ocorrência para análise...")

    try {
      const response = await fetch(this.endpointValue, {
        method: "POST",
        body: new FormData(this.formTarget),
      })
      const payload = await this.parseJson(response)

      if (!response.ok) {
        throw new Error(payload.erro || "Não foi possível registrar a ocorrência.")
      }

      this.renderAnalysis(payload)
      this.formTarget.reset()
      this.resetCounter()
      window.dispatchEvent(new CustomEvent("aquaia:form-reset"))
      window.dispatchEvent(new CustomEvent("aquaia:occurrence-created", { detail: { occurrence: payload } }))
      window.dispatchEvent(new CustomEvent("aquaia:toast", { detail: { message: "Ocorrência registrada e analisada." } }))
      this.setStatus("Ocorrência registrada com sucesso.")
    } catch (error) {
      this.setStatus(error.message, true)
      window.dispatchEvent(new CustomEvent("aquaia:toast", { detail: { message: error.message } }))
    } finally {
      this.setLoading(false)
    }
  }

  countDescription(event) {
    if (!this.hasCounterTarget) return
    const maxLength = Number(event.currentTarget.getAttribute("maxlength") || 600)
    const currentLength = String(event.currentTarget.value || "").length
    this.counterTarget.textContent = `${currentLength}/${maxLength}`
  }

  resetCounter() {
    if (this.hasCounterTarget) this.counterTarget.textContent = "0/600"
  }

  async parseJson(response) {
    const text = await response.text()
    if (!text) return {}
    try {
      return JSON.parse(text)
    } catch (_error) {
      return { erro: "Resposta inesperada do servidor." }
    }
  }

  validateRequiredFields() {
    const missing = this.requiredFieldTargets.find((field) => !String(field.value || "").trim())
    if (!missing) return true
    missing.focus()
    this.setStatus("Preencha local, ambiente e descrição antes de enviar.", true)
    return false
  }

  setLoading(isLoading) {
    if (!this.hasSubmitButtonTarget) return
    this.submitButtonTarget.disabled = isLoading
    this.submitButtonTarget.textContent = isLoading ? "Analisando..." : "Analisar ocorrência"
  }

  setStatus(message, isError = false) {
    if (!this.hasStatusTarget) return
    this.statusTarget.textContent = message
    this.statusTarget.classList.toggle("text-red-700", isError)
    this.statusTarget.classList.toggle("text-aqua-cyan", !isError)
  }

  renderAnalysis(data) {
    if (!this.hasResultTarget || !this.hasResultCardTarget) return
    const impact = impactFor(data, this.tariffValue)
    const observation = data.observacao_tecnica
      ? `<div class="aqua-panel p-4"><strong class="text-sm">Observação técnica</strong><p class="mt-1 text-sm aqua-muted">${escapeHtml(data.observacao_tecnica)}</p></div>`
      : ""

    this.resultTarget.innerHTML = `
      <div class="grid gap-4">
        <div class="aqua-panel p-4">
          <span class="text-xs font-extrabold uppercase tracking-[0.14em] text-aqua-cyan">Classificação</span>
          <h3 class="mt-2 text-xl font-extrabold">${escapeHtml(data.tipo_ocorrencia)}</h3>
          <p class="mt-2 text-sm aqua-muted">${escapeHtml(data.justificativa)}</p>
        </div>
        <div class="grid gap-3 md:grid-cols-4">
          <div class="aqua-panel p-4"><span class="text-xs aqua-muted">Gravidade</span><strong class="${badgeClass(data.gravidade)} mt-2">${escapeHtml(data.gravidade)}</strong></div>
          <div class="aqua-panel p-4"><span class="text-xs aqua-muted">Prioridade</span><strong class="${badgeClass(data.prioridade)} mt-2">${escapeHtml(data.prioridade)}</strong></div>
          <div class="aqua-panel p-4"><span class="text-xs aqua-muted">Litros/dia</span><strong class="mt-2 block text-lg">${formatNumber(impact.litersPerDay)} L</strong></div>
          <div class="aqua-panel p-4"><span class="text-xs aqua-muted">Fonte</span><strong class="mt-2 block text-sm">${escapeHtml(data.fonte_analise)}</strong></div>
        </div>
        <div class="aqua-panel p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <strong>Como calculamos o impacto</strong>
              <p class="mt-1 text-xs aqua-muted">${escapeHtml(WATER_TARIFF_LABEL)}. Estimativa inicial para triagem.</p>
            </div>
            <span class="${badgeClass(data.confianca)}">${escapeHtml(data.confianca)} confiança</span>
          </div>
          <div class="mt-4 grid gap-2 md:grid-cols-5">
            <div class="rounded-2xl bg-white p-3 text-sm"><span class="block text-xs aqua-muted">Parâmetro</span><strong>${formatNumber(impact.litersPerDay)} L/dia</strong></div>
            <div class="rounded-2xl bg-white p-3 text-sm"><span class="block text-xs aqua-muted">Litros/mês</span><strong>${formatNumber(impact.litersPerMonth)} L</strong></div>
            <div class="rounded-2xl bg-white p-3 text-sm"><span class="block text-xs aqua-muted">m³/mês</span><strong>${formatDecimal(impact.cubicMetersPerMonth)} m³</strong></div>
            <div class="rounded-2xl bg-white p-3 text-sm"><span class="block text-xs aqua-muted">Custo/mês</span><strong>${formatCurrency(impact.costPerMonth)}</strong></div>
            <div class="rounded-2xl bg-white p-3 text-sm"><span class="block text-xs aqua-muted">Custo/ano</span><strong>${formatCurrency(impact.costPerYear)}</strong></div>
          </div>
        </div>
        <div class="aqua-panel p-4">
          <strong>Sugestão de ação</strong>
          <p class="mt-2 text-sm aqua-muted">${escapeHtml(data.acao_sugerida)}</p>
        </div>
        ${observation}
      </div>
    `
    this.resultCardTarget.classList.remove("hidden")
    this.resultCardTarget.scrollIntoView({ behavior: "smooth", block: "start" })
  }
}
