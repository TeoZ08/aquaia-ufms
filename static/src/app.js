import { Application } from "@hotwired/stimulus"

import DashboardController from "./controllers/dashboard_controller"
import ImagePreviewController from "./controllers/image_preview_controller"
import MapController from "./controllers/map_controller"
import NavController from "./controllers/nav_controller"
import OccurrenceFormController from "./controllers/occurrence_form_controller"
import ToastController from "./controllers/toast_controller"

window.Stimulus = Application.start()

Stimulus.register("dashboard", DashboardController)
Stimulus.register("image-preview", ImagePreviewController)
Stimulus.register("map", MapController)
Stimulus.register("nav", NavController)
Stimulus.register("occurrence-form", OccurrenceFormController)
Stimulus.register("toast", ToastController)
