import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["message"]

  connect() {
    this.timeout = null
  }

  show(event) {
    const message = event.detail?.message || "Operação concluída."
    this.messageTarget.textContent = message
    this.element.classList.remove("hidden")
    window.clearTimeout(this.timeout)
    this.timeout = window.setTimeout(() => this.hide(), 3600)
  }

  hide() {
    this.element.classList.add("hidden")
  }
}
