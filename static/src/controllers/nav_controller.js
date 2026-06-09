import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["screen", "tab", "mobileMenu", "mobileButton"]

  connect() {
    this.showScreen("dashboard")
  }

  show(event) {
    const screen = event.currentTarget.dataset.screen
    if (!screen) return
    this.showScreen(screen)
  }

  showScreen(screen) {
    this.screenTargets.forEach((target) => {
      target.classList.toggle("is-active", target.id === screen)
    })

    this.tabTargets.forEach((target) => {
      target.classList.toggle("is-active", target.dataset.screen === screen)
    })

    this.closeMenu()
    window.dispatchEvent(new CustomEvent("aquaia:screen-changed", { detail: { screen } }))
  }

  toggleMenu() {
    if (!this.hasMobileMenuTarget) return
    const isOpen = this.mobileMenuTarget.classList.toggle("hidden") === false
    if (this.hasMobileButtonTarget) this.mobileButtonTarget.setAttribute("aria-expanded", String(isOpen))
  }

  closeMenu() {
    if (this.hasMobileMenuTarget) this.mobileMenuTarget.classList.add("hidden")
    if (this.hasMobileButtonTarget) this.mobileButtonTarget.setAttribute("aria-expanded", "false")
  }

  closeOnEscape(event) {
    if (event.key === "Escape") this.closeMenu()
  }
}
