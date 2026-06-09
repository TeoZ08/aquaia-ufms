import { Controller } from "@hotwired/stimulus"

const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

export default class extends Controller {
  static targets = ["input", "preview", "previewImage", "removeButton", "error"]

  connect() {
    this.previewUrl = null
  }

  preview() {
    this.clearError()
    this.revokePreview()
    const file = this.inputTarget.files[0]
    if (!file) {
      this.clear()
      return
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      this.showError("Envie uma imagem JPG, PNG ou WEBP.")
      this.inputTarget.value = ""
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      this.showError("A imagem deve ter até 8 MB.")
      this.inputTarget.value = ""
      return
    }

    this.previewUrl = URL.createObjectURL(file)
    this.previewImageTarget.src = this.previewUrl
    this.previewTarget.classList.remove("hidden")
    if (this.hasRemoveButtonTarget) this.removeButtonTarget.classList.remove("hidden")
  }

  remove(event) {
    event.preventDefault()
    this.inputTarget.value = ""
    this.clear()
  }

  clear() {
    this.revokePreview()
    this.previewImageTarget.removeAttribute("src")
    this.previewTarget.classList.add("hidden")
    if (this.hasRemoveButtonTarget) this.removeButtonTarget.classList.add("hidden")
  }

  reset() {
    if (this.hasInputTarget) this.inputTarget.value = ""
    this.clear()
  }

  revokePreview() {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl)
      this.previewUrl = null
    }
  }

  showError(message) {
    if (!this.hasErrorTarget) return
    this.errorTarget.textContent = message
    this.errorTarget.classList.remove("hidden")
  }

  clearError() {
    if (!this.hasErrorTarget) return
    this.errorTarget.textContent = ""
    this.errorTarget.classList.add("hidden")
  }
}
