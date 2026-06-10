from pathlib import Path
import subprocess
import struct


ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def png_info(path):
    data = (ROOT / path).read_bytes()
    assert data.startswith(b"\x89PNG\r\n\x1a\n")
    assert data[12:16] == b"IHDR"
    width, height, bit_depth, color_type = struct.unpack(">IIBB", data[16:26])
    return width, height, bit_depth, color_type


def test_bundled_javascript_is_valid():
    bundle = ROOT / "static" / "dist" / "app.js"
    assert bundle.exists(), "Execute npm run build antes da suíte Python."
    result = subprocess.run(["node", "--check", str(bundle)], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr


def test_templates_contain_product_sections_and_brand_assets():
    base = read("templates/base.html")
    html = read("templates/index.html")

    required_text = [
        "assets/brand/02_logo_wordmark_waves_teal_ia.png",
        "assets/brand/06_icon_letter_a_wave.png",
        "assets/brand/07_map_marker_typographic_a.png",
        "dist/output.css",
        "dist/app.js",
        "O desperdício invisível",
        "aqua-hero-statement",
        "Inteligência",
        "hídrica",
        "aqua-hero-proof-title",
        "Impacto financeiro real",
        "R$ 8,36 mi",
        "R$ 7,92 mi",
        "R$ 6,99 mi",
        "R$ 6,80 mi",
        "Base técnica e evidências históricas",
        "PURA-UFMS",
        "Como calculamos",
        "Começa na UFMS, escala para prédios públicos",
        "ODS conectados",
    ]

    combined = f"{base}\n{html}"
    for text in required_text:
        assert text in combined
    assert "assets/brand/08_hero_title_inteligencia_hidrica.png" not in combined
    assert "assets/brand/09_hero_phrase_desperdicio_vira_dado.png" not in combined
    assert "assets/brand/03_logo_wordmark_clean_navbar.png" not in combined
    assert "assets/brand/05_logo_wordmark_stacked_editorial.png" not in combined


def test_pura_ufms_is_not_in_home_before_methodology_section():
    html = read("templates/index.html")
    home_before_methodology = html.split('<section id="metodologia"', 1)[0]

    assert "PURA-UFMS" not in home_before_methodology


def test_stimulus_controllers_and_targets_are_wired():
    app_js = read("static/src/app.js")
    index = read("templates/index.html")
    occurrence = read("static/src/controllers/occurrence_form_controller.js")
    dashboard = read("static/src/controllers/dashboard_controller.js")
    map_controller = read("static/src/controllers/map_controller.js")
    format_lib = read("static/src/lib/format.js")

    for controller in ["dashboard", "image-preview", "map", "nav", "occurrence-form", "toast"]:
        assert f'Stimulus.register("{controller}"' in app_js

    required_targets = [
        'data-dashboard-target="homeStats"',
        'data-dashboard-target="impactStats"',
        'data-dashboard-target="recentList"',
        'data-dashboard-target="campusPreview"',
        'data-dashboard-target="stats"',
        'data-dashboard-target="list"',
        'data-map-target="map"',
        'data-map-target="campusMarkers"',
        'data-occurrence-form-target="form"',
        'data-image-preview-target="previewImage"',
    ]
    for target in required_targets:
        assert target in index

    assert "WATER_TARIFF_LABEL" in format_lib
    assert "impactFor" in format_lib
    assert "renderAnalysis" in occurrence
    assert "litersPerMonth" in occurrence
    assert "filteredOccurrences" in dashboard
    assert "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" in map_controller


def test_tailwind_output_contains_project_components():
    css = read("static/dist/output.css")
    source_css = read("static/src/input.css")
    assert ".aqua-card" in css
    assert ".aqua-panel" in css
    assert ".aqua-screen" in css
    assert ".aqua-leaflet-marker" in css
    assert ".aqua-dashboard-surface" in css
    assert ".aqua-dashboard-container" in css
    assert ".aqua-wave-band" in css
    assert ".aqua-home-stats" in css
    assert ".aqua-hero-editorial" in css
    assert ".aqua-hero-statement" in css
    assert ".aqua-hero-statement-accent" in css
    assert ".aqua-hero-proof-title" in css
    assert ".aqua-hero-proof-title-accent" in css
    assert ".aqua-number-wall" in css
    assert ".aqua-metric" in css
    assert "repeat-x" in css
    assert "wave-loop-blue" in css
    assert "wave-loop-teal" in css
    assert "10_wave_divider_blue" not in css
    assert "11_wave_divider_teal" not in css
    assert "#0077b6" in css.lower()
    assert "#2437ff" not in css.lower()
    assert "#FFFDF2" in source_css
    assert "#0077B6" in source_css
    assert "#2437FF" not in source_css
    assert "linear-gradient(180deg, #f8fff9" not in source_css


def test_interface_design_system_documents_visual_rules():
    system = ROOT / ".interface-design" / "system.md"
    assert system.exists()
    text = system.read_text(encoding="utf-8")
    assert "02_logo_wordmark_waves_teal_ia.png" in text
    assert "#0077B6" in text
    assert "#2437FF" in text
    assert "wave-loop-blue.png" in text


def test_wave_loop_assets_are_transparent_rgba_tiles():
    for asset in ["static/assets/brand/wave-loop-blue.png", "static/assets/brand/wave-loop-teal.png"]:
        width, height, bit_depth, color_type = png_info(asset)
        assert (width, height) == (1440, 220)
        assert bit_depth == 8
        assert color_type == 6


def test_render_blueprint_matches_runtime_contract():
    blueprint = read("render.yaml")
    assert "runtime: python" in blueprint
    assert "plan: free" in blueprint
    assert "branch: main" in blueprint
    assert "pip install -r requirements.txt && npm ci && npm run build" in blueprint
    assert "startCommand: gunicorn app:app" in blueprint
    assert "healthCheckPath: /api/health" in blueprint
    assert "autoDeployTrigger: checksPass" in blueprint
    assert "TARIFA_M3_ESTIMADA" in blueprint
