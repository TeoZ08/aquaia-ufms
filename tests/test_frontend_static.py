from pathlib import Path

import esprima


ROOT = Path(__file__).resolve().parents[1]


def test_script_is_valid_javascript():
    script = (ROOT / "script.js").read_text(encoding="utf-8")
    esprima.parseScript(script)


def test_home_contains_pitch_and_financial_sections():
    html = (ROOT / "index.html").read_text(encoding="utf-8")

    required_text = [
        "/assets/brand/aquaia_logo_horizontal_sem_tagline.svg",
        "/assets/brand/aquaia_simbolo_gota_pin.svg",
        "/assets/brand/aquaia_favicon_app_icon.svg",
        "Impacto financeiro real",
        "R$ 8,36 mi",
        "R$ 7,92 mi",
        "R$ 6,99 mi",
        "R$ 6,80 mi",
        "Base técnica e evidências",
        "PURA-UFMS",
        "Como calculamos",
        "Começa na UFMS, escala para a cidade",
        "ODS conectados",
    ]

    for text in required_text:
        assert text in html


def test_pura_ufms_is_not_in_home_before_about_section():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    home_before_about = html.split('<section id="sobre"', 1)[0]

    assert "PURA-UFMS" not in home_before_about


def test_frontend_has_financial_impact_constants():
    script = (ROOT / "script.js").read_text(encoding="utf-8")

    assert "const WATER_TARIFF_PER_M3 = 71.03;" in script
    assert "const WATER_TARIFF_LABEL = 'Tarifa estimada para cálculo do MVP';" in script
    assert "const LEAK_IMPACT_PARAMS" in script
    assert "function calculateFinancialImpact" in script
    assert "function renderImpactCalculationCard" in script
