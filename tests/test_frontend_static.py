from pathlib import Path

import esprima


ROOT = Path(__file__).resolve().parents[1]


def test_script_is_valid_javascript():
    script = (ROOT / "script.js").read_text(encoding="utf-8")
    esprima.parseScript(script)


def test_home_contains_pitch_and_financial_sections():
    html = (ROOT / "index.html").read_text(encoding="utf-8")

    required_text = [
        "O PURA-UFMS mediu o problema",
        "Por que isso importa na UFMS?",
        "Impacto financeiro real",
        "R$ 8.369.678,68",
        "R$ 6.998.292,65",
        "Como calculamos",
        "Começa na UFMS, escala para a cidade",
        "ODS conectados",
    ]

    for text in required_text:
        assert text in html


def test_frontend_has_financial_impact_constants():
    script = (ROOT / "script.js").read_text(encoding="utf-8")

    assert "const WATER_TARIFF_PER_M3 = 71.03;" in script
    assert "const WATER_TARIFF_LABEL = 'Tarifa estimada para cálculo do MVP';" in script
    assert "const LEAK_IMPACT_PARAMS" in script
    assert "function calculateFinancialImpact" in script
    assert "function renderImpactCalculationCard" in script
