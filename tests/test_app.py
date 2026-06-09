def test_static_routes_and_public_config(client):
    home = client.get("/")
    assert home.status_code == 200
    html = home.get_data(as_text=True)
    assert "static/dist/output.css" in html
    assert "static/dist/app.js" in html
    assert "Inteligência hídrica para um campus sustentável" in html

    assert client.get("/static/dist/output.css").status_code == 200
    assert client.get("/static/dist/app.js").status_code == 200
    assert client.get("/style.css").status_code == 200
    assert client.get("/script.js").status_code == 200
    assert client.get("/static/assets/maps/mapa-ufms-campo-grande-2026.png").status_code == 200
    assert client.get("/static/assets/logo/aquaia_logo_horizontal_sem_tagline.svg").status_code == 200
    assert client.get("/assets/mapa-ufms-campo-grande-2026.png").status_code == 200
    assert client.get("/assets/brand/aquaia_logo_horizontal_sem_tagline.svg").status_code == 200
    assert client.get("/assets/brand/aquaia_favicon_app_icon.svg").status_code == 200
    assert client.get("/assets/brand/aquaia_favicon_app_icon_256.png").status_code == 200
    assert client.get("/aquaia.db").status_code == 404

    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.get_json()["ok"] is True

    config = client.get("/api/config")
    assert config.status_code == 200
    body = config.get_json()
    assert body["mapa_provider"] == "openstreetmap_leaflet"
    assert body["mapa_cadastro"] == "nao_requerido"
    assert body["tarifa_m3_estimada"] == 71.03
    assert body["campus"]["nome"] == "Cidade Universitária UFMS"


def test_create_occurrence_uses_rule_fallback_and_updates_status(client):
    response = client.post(
        "/api/ocorrencias",
        data={
            "local": "Bloco 12 - banheiro térreo",
            "ambiente": "Banheiro",
            "descricao": "Descarga com fluxo contínuo sem parar.",
        },
    )

    assert response.status_code == 201
    created = response.get_json()
    assert created["fonte_analise"] == "Regras do MVP"
    assert created["status"] == "Aberto"
    assert created["prioridade"] == "Urgente"
    assert created["litros_por_dia_estimados"] > 0
    assert created["litros_mes"] == created["litros_por_dia_estimados"] * 30
    assert created["m3_mes"] == created["litros_mes"] / 1000
    assert created["custo_mes"] > 0
    assert created["custo_ano"] == created["custo_mes"] * 12
    assert created["tarifa_m3"] == 71.03
    assert created["observacao_tecnica"]

    patch = client.patch(
        f"/api/ocorrencias/{created['id']}/status",
        json={"status": "Em análise"},
    )
    assert patch.status_code == 200
    assert patch.get_json()["status"] == "Em análise"

    listed = client.get("/api/ocorrencias").get_json()
    listed_item = next(item for item in listed if item["id"] == created["id"])
    assert listed_item["status"] == "Em análise"
    assert listed_item["litros_mes"] == created["litros_mes"]
    assert listed_item["custo_mes"] == created["custo_mes"]


def test_occurrence_validation_and_invalid_status(client):
    missing_fields = client.post(
        "/api/ocorrencias",
        data={"local": "Bloco 7", "ambiente": "Banheiro"},
    )
    assert missing_fields.status_code == 400
    assert "Preencha" in missing_fields.get_json()["erro"]

    invalid_status = client.patch("/api/ocorrencias/inexistente/status", json={"status": "Fechado"})
    assert invalid_status.status_code == 400
    assert "Status inválido" in invalid_status.get_json()["erro"]


def test_reset_demo_is_disabled_by_default(client):
    assert client.post("/api/reset-demo").status_code == 404
