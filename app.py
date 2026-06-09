import json
import os
import re
import sqlite3
import time
import unicodedata
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

from flask import Flask, abort, jsonify, render_template, request, send_from_directory
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

try:
    from google import genai
    from google.genai import types
except Exception:
    genai = None
    types = None

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "aquaia.db"
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
MAX_CONTENT_LENGTH = 8 * 1024 * 1024
MAX_FIELD_LENGTHS = {
    "local": 120,
    "ambiente": 60,
    "descricao": 600
}
VALID_STATUSES = {"Aberto", "Em análise", "Resolvido"}
VALID_GRAVITIES = {"Baixa", "Média", "Alta"}
VALID_PRIORITIES = {"Baixa", "Média", "Alta", "Urgente"}
VALID_CONFIDENCES = {"Baixa", "Média", "Alta"}
DEFAULT_TARIFF_PER_M3 = 71.03

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS ocorrencias (
                id TEXT PRIMARY KEY,
                local TEXT NOT NULL,
                ambiente TEXT NOT NULL,
                descricao TEXT NOT NULL,
                imagem_url TEXT,
                tipo_ocorrencia TEXT NOT NULL,
                gravidade TEXT NOT NULL,
                prioridade TEXT NOT NULL,
                litros_por_dia_estimados REAL NOT NULL,
                confianca TEXT NOT NULL,
                acao_sugerida TEXT NOT NULL,
                justificativa TEXT NOT NULL,
                observacao_tecnica TEXT NOT NULL DEFAULT '',
                fonte_analise TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Aberto',
                criado_em INTEGER NOT NULL
            )
            """
        )
        ensure_db_columns(conn)
        count = conn.execute("SELECT COUNT(*) AS total FROM ocorrencias").fetchone()["total"]
        if count == 0 and os.getenv("AQUAIA_SEED_DEMO", "true").lower() != "false":
            seed_demo(conn)


def ensure_db_columns(conn: sqlite3.Connection) -> None:
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(ocorrencias)").fetchall()}
    if "observacao_tecnica" not in columns:
        conn.execute("ALTER TABLE ocorrencias ADD COLUMN observacao_tecnica TEXT NOT NULL DEFAULT ''")


def seed_demo(conn: sqlite3.Connection) -> None:
    exemplos = [
        {
            "local": "Bloco 7, banheiro térreo",
            "ambiente": "Banheiro",
            "descricao": "Torneira pingando continuamente há dois dias.",
            "tipo_ocorrencia": "Vazamento em torneira",
            "gravidade": "Média",
            "prioridade": "Alta",
            "litros_por_dia_estimados": 40,
            "confianca": "Média",
            "acao_sugerida": "Verificar vedação, reparo de registro ou troca de componente da torneira.",
            "justificativa": "Gotejamento contínuo em ponto de uso frequente pode gerar desperdício acumulado.",
            "observacao_tecnica": "A estimativa considera gotejamento recorrente; confirmar vazão real durante a vistoria.",
            "fonte_analise": "Dados de demonstração"
        },
        {
            "local": "Laboratório 2, corredor lateral",
            "ambiente": "Laboratório",
            "descricao": "Mancha de umidade próxima à parede e possível infiltração.",
            "tipo_ocorrencia": "Possível infiltração",
            "gravidade": "Alta",
            "prioridade": "Urgente",
            "litros_por_dia_estimados": 250,
            "confianca": "Baixa",
            "acao_sugerida": "Encaminhar vistoria técnica para localizar a origem do vazamento.",
            "justificativa": "Infiltração pode indicar vazamento oculto e risco de dano estrutural ou elétrico.",
            "observacao_tecnica": "Priorizar inspeção visual e isolamento de pontos elétricos próximos até confirmar a origem.",
            "fonte_analise": "Dados de demonstração"
        },
        {
            "local": "Sala administrativa, aparelho de ar-condicionado",
            "ambiente": "Área administrativa",
            "descricao": "Água do ar-condicionado escorrendo para o chão sem reaproveitamento.",
            "tipo_ocorrencia": "Oportunidade de reaproveitamento",
            "gravidade": "Baixa",
            "prioridade": "Média",
            "litros_por_dia_estimados": 25,
            "confianca": "Média",
            "acao_sugerida": "Avaliar instalação de recipiente ou tubulação simples para reuso em limpeza ou irrigação, quando viável.",
            "justificativa": "A água condensada pode ser reaproveitada em usos não potáveis, reduzindo perda de recurso.",
            "observacao_tecnica": "Reuso deve ser limitado a fins não potáveis e com recipiente higienizado.",
            "fonte_analise": "Dados de demonstração"
        }
    ]
    for item in exemplos:
        conn.execute(
            """
            INSERT INTO ocorrencias (
                id, local, ambiente, descricao, imagem_url, tipo_ocorrencia, gravidade, prioridade,
                litros_por_dia_estimados, confianca, acao_sugerida, justificativa, observacao_tecnica,
                fonte_analise, status, criado_em
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid.uuid4()),
                item["local"],
                item["ambiente"],
                item["descricao"],
                None,
                item["tipo_ocorrencia"],
                item["gravidade"],
                item["prioridade"],
                item["litros_por_dia_estimados"],
                item["confianca"],
                item["acao_sugerida"],
                item["justificativa"],
                item["observacao_tecnica"],
                item["fonte_analise"],
                "Aberto",
                int(time.time())
            )
        )


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def normalize_label(value: Any, allowed: set[str], default: str) -> str:
    text = slug_text(value)
    for option in allowed:
        if text == slug_text(option):
            return option
    return default


def slug_text(value: Any) -> str:
    normalized = unicodedata.normalize("NFD", str(value or "").strip().lower())
    without_accents = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", without_accents).strip("-")


def coerce_liters(value: Any, default: float = 0) -> float:
    try:
        liters = float(value)
    except (TypeError, ValueError):
        liters = default
    return max(0.0, min(liters, 10000.0))


def estimated_tariff_per_m3() -> float:
    raw_value = os.getenv("TARIFA_M3_ESTIMADA", str(DEFAULT_TARIFF_PER_M3))
    try:
        return max(0.0, float(str(raw_value).replace(",", ".")))
    except (TypeError, ValueError):
        return DEFAULT_TARIFF_PER_M3


def calcular_impacto(litros_dia: Any, tarifa_m3: Optional[float] = None) -> Dict[str, float]:
    daily_liters = coerce_liters(litros_dia)
    tariff = estimated_tariff_per_m3() if tarifa_m3 is None else max(0.0, float(tarifa_m3))
    litros_mes = daily_liters * 30
    m3_mes = litros_mes / 1000
    custo_mes = m3_mes * tariff
    custo_ano = custo_mes * 12
    return {
        "litros_dia": daily_liters,
        "litros_mes": litros_mes,
        "m3_mes": m3_mes,
        "custo_mes": custo_mes,
        "custo_ano": custo_ano,
        "tarifa_m3": tariff,
    }


def campus_map_config() -> Dict[str, Any]:
    return {
        "nome": "Cidade Universitária UFMS",
        "cidade": "Campo Grande, MS",
        "lat": float(os.getenv("UFMS_MAP_LAT", "-20.5032738")),
        "lng": float(os.getenv("UFMS_MAP_LNG", "-54.6134936")),
        "zoom": int(os.getenv("UFMS_MAP_ZOOM", "16")),
    }


def occurrence_to_dict(row: sqlite3.Row | Dict[str, Any]) -> Dict[str, Any]:
    data = dict(row)
    data.update(calcular_impacto(data.get("litros_por_dia_estimados", 0)))
    return data


def clean_text_field(name: str, value: Any) -> str:
    text = str(value or "").strip()
    max_length = MAX_FIELD_LENGTHS[name]
    if len(text) > max_length:
        raise ValueError(f"O campo {name} deve ter no máximo {max_length} caracteres.")
    return text


def extract_json(text: str) -> Dict[str, Any]:
    if not text:
        raise ValueError("Resposta vazia da IA.")
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("Resposta da IA não contém JSON válido.")
    return json.loads(cleaned[start:end + 1])


def rule_based_analysis(local: str, ambiente: str, descricao: str) -> Dict[str, Any]:
    texto = f"{local} {ambiente} {descricao}".lower()

    if any(term in texto for term in ["cano rompido", "jorrando", "alagamento", "muita água", "muita agua"]):
        tipo = "Vazamento grave"
        gravidade = "Alta"
        prioridade = "Urgente"
        litros = 1000
        acao = "Isolar a área, fechar o registro mais próximo e acionar manutenção hidráulica imediatamente."
        justificativa = "Termos indicam vazamento intenso com possível desperdício elevado e risco operacional."
    elif any(term in texto for term in ["descarga", "vaso", "caixa acoplada"]):
        tipo = "Descarga com fluxo contínuo"
        gravidade = "Alta"
        prioridade = "Urgente"
        litros = 500
        acao = "Priorizar vistoria no sistema de descarga e corrigir mecanismo de acionamento ou vedação."
        justificativa = "Descarga com fluxo contínuo tende a gerar perda hídrica significativa em pouco tempo."
    elif any(term in texto for term in ["infiltra", "umidade", "mofo", "parede molhada", "teto molhado"]):
        tipo = "Possível infiltração"
        gravidade = "Alta"
        prioridade = "Alta"
        litros = 250
        acao = "Solicitar vistoria técnica para localizar origem do vazamento e prevenir dano estrutural."
        justificativa = "Sinais de umidade podem indicar vazamento oculto e exigem verificação preventiva."
    elif any(term in texto for term in ["torneira", "pingando", "gotejando", "registro"]):
        tipo = "Vazamento em torneira"
        gravidade = "Média"
        prioridade = "Alta"
        litros = 40
        acao = "Verificar vedação, registro, arejador ou necessidade de troca de componente."
        justificativa = "Gotejamento contínuo parece pequeno, mas gera desperdício acumulado."
    elif any(term in texto for term in ["bebedouro", "filtro", "purificador"]):
        tipo = "Perda de água em bebedouro"
        gravidade = "Média"
        prioridade = "Média"
        litros = 80
        acao = "Verificar mangueiras, conexões, pressão e sistema de escoamento do bebedouro."
        justificativa = "Bebedouros são pontos de uso coletivo e podem desperdiçar água de forma recorrente."
    elif any(term in texto for term in ["ar-condicionado", "ar condicionado", "condicionado", "condensado"]):
        tipo = "Oportunidade de reaproveitamento"
        gravidade = "Baixa"
        prioridade = "Média"
        litros = 25
        acao = "Avaliar captação da água condensada para uso não potável, como limpeza ou irrigação."
        justificativa = "A água do ar-condicionado pode ser reaproveitada quando houver viabilidade operacional."
    else:
        tipo = "Ocorrência hídrica não classificada"
        gravidade = "Média"
        prioridade = "Média"
        litros = 50
        acao = "Solicitar triagem manual da equipe responsável para confirmar tipo e gravidade."
        justificativa = "As informações indicam possível desperdício, mas não permitem classificação precisa no MVP."

    observacao = {
        "Vazamento grave": "Confirmar ponto de registro para reduzir perda antes da manutenção definitiva.",
        "Descarga com fluxo contínuo": "Verificar mecanismo interno, boia e vedação da caixa acoplada ou válvula.",
        "Possível infiltração": "Avaliar risco elétrico e dano estrutural antes de liberar uso normal do espaço.",
        "Vazamento em torneira": "Comparar vazão real com a estimativa e registrar peça substituída na ordem de serviço.",
        "Perda de água em bebedouro": "Checar conexões, pressão e drenagem para evitar reincidência em ponto de uso coletivo.",
        "Oportunidade de reaproveitamento": "Reuso deve ser não potável e depender de rotina simples de coleta e higienização."
    }.get(tipo, "Encaminhar para triagem técnica e complementar o registro com foto ou vistoria no local.")

    return {
        "tipo_ocorrencia": tipo,
        "gravidade": gravidade,
        "prioridade": prioridade,
        "litros_por_dia_estimados": litros,
        "confianca": "Média",
        "acao_sugerida": acao,
        "justificativa": justificativa,
        "observacao_tecnica": observacao,
        "fonte_analise": "Regras do MVP"
    }


def gemini_analysis(local: str, ambiente: str, descricao: str, image_path: Optional[Path], mime_type: Optional[str]) -> Optional[Dict[str, Any]]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or genai is None or types is None:
        return None

    prompt = f"""
Você é um assistente de triagem de sustentabilidade hídrica para um MVP universitário chamado AquaIA UFMS.
Analise a ocorrência abaixo e, se houver imagem, use a imagem apenas para apoiar a classificação do problema.
Não identifique pessoas. Não faça reconhecimento facial. Se aparecer pessoa na imagem, ignore e avalie somente infraestrutura.

Dados da ocorrência:
Local: {local}
Ambiente: {ambiente}
Descrição: {descricao}

Responda somente com JSON válido, sem markdown, seguindo exatamente estes campos:
{{
  "tipo_ocorrencia": "uma categoria curta",
  "gravidade": "Baixa, Média ou Alta",
  "prioridade": "Baixa, Média, Alta ou Urgente",
  "litros_por_dia_estimados": número,
  "confianca": "Baixa, Média ou Alta",
  "acao_sugerida": "ação objetiva para a manutenção",
  "justificativa": "explicação curta e útil para o painel",
  "observacao_tecnica": "risco, cuidado ou observação técnica curta"
}}

Regras:
- Seja conservador na estimativa de litros por dia.
- Se a imagem não permitir confirmação, reduza a confiança.
- Se parecer descarga com fluxo contínuo, vazamento intenso, cano rompido ou infiltração relevante, aumente prioridade.
- Se for água de ar-condicionado, trate como oportunidade de reaproveitamento, não como emergência.
""".strip()

    try:
        client = genai.Client(api_key=api_key)
        contents: list[Any] = []
        if image_path and image_path.exists():
            contents.append(types.Part.from_bytes(data=image_path.read_bytes(), mime_type=mime_type or "image/jpeg"))
        contents.append(prompt)
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=0.2,
                response_mime_type="application/json"
            )
        )
        data = extract_json(response.text)
        data["gravidade"] = normalize_label(data.get("gravidade"), VALID_GRAVITIES, "Média")
        data["prioridade"] = normalize_label(data.get("prioridade"), VALID_PRIORITIES, "Média")
        data["confianca"] = normalize_label(data.get("confianca"), VALID_CONFIDENCES, "Média")
        data["litros_por_dia_estimados"] = coerce_liters(data.get("litros_por_dia_estimados"))
        data["fonte_analise"] = "Gemini"
        return data
    except Exception as exc:
        print(f"[AquaIA] Falha ao consultar Gemini, usando fallback: {exc}")
        return None


def analyze_occurrence(local: str, ambiente: str, descricao: str, image_path: Optional[Path], mime_type: Optional[str]) -> Dict[str, Any]:
    data = gemini_analysis(local, ambiente, descricao, image_path, mime_type)
    if data is None:
        data = rule_based_analysis(local, ambiente, descricao)
    required = rule_based_analysis(local, ambiente, descricao)
    for key, value in required.items():
        if key not in data or data[key] in [None, ""]:
            data[key] = value
    data["tipo_ocorrencia"] = str(data.get("tipo_ocorrencia", "Ocorrência hídrica"))[:90]
    data["acao_sugerida"] = str(data.get("acao_sugerida", required["acao_sugerida"]))[:500]
    data["justificativa"] = str(data.get("justificativa", required["justificativa"]))[:500]
    data["observacao_tecnica"] = str(data.get("observacao_tecnica", required["observacao_tecnica"]))[:500]
    data["litros_por_dia_estimados"] = coerce_liters(data.get("litros_por_dia_estimados"), required["litros_por_dia_estimados"])
    return data


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify({"erro": "A imagem enviada ultrapassa o limite de 8 MB."}), 413


@app.route("/")
def home():
    return render_template(
        "index.html",
        tariff_per_m3=estimated_tariff_per_m3(),
        campus_map=campus_map_config(),
    )


@app.route("/style.css")
def legacy_style_file():
    return send_from_directory(BASE_DIR / "static" / "dist", "output.css")


@app.route("/script.js")
def legacy_script_file():
    return send_from_directory(BASE_DIR / "static" / "dist", "app.js")


@app.route("/assets/<path:filename>")
def asset_file(filename: str):
    static_assets = BASE_DIR / "static" / "assets"
    candidates = [static_assets / filename]
    if filename.startswith("brand/"):
        candidates.append(static_assets / "logo" / filename.removeprefix("brand/"))
    candidates.append(static_assets / "maps" / filename)

    for candidate in candidates:
        if candidate.is_file():
            return send_from_directory(candidate.parent, candidate.name)
    abort(404)


@app.route("/uploads/<path:filename>")
def uploaded_file(filename: str):
    return send_from_directory(UPLOAD_DIR, filename)


@app.route("/api/health")
def health():
    return jsonify({
        "ok": True,
        "gemini_configurado": bool(os.getenv("GEMINI_API_KEY")) and genai is not None,
        "modelo": os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    })


@app.route("/api/config")
def client_config():
    return jsonify({
        "mapa_provider": "openstreetmap_leaflet",
        "mapa_cadastro": "nao_requerido",
        "tarifa_m3_estimada": estimated_tariff_per_m3(),
        "campus": campus_map_config()
    })


@app.route("/api/ocorrencias", methods=["GET"])
def list_occurrences():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM ocorrencias ORDER BY criado_em DESC").fetchall()
        data = [occurrence_to_dict(row) for row in rows]
    return jsonify(data)


@app.route("/api/ocorrencias", methods=["POST"])
def create_occurrence():
    try:
        local = clean_text_field("local", request.form.get("local"))
        ambiente = clean_text_field("ambiente", request.form.get("ambiente"))
        descricao = clean_text_field("descricao", request.form.get("descricao"))
    except ValueError as exc:
        return jsonify({"erro": str(exc)}), 400

    if not local or not ambiente or not descricao:
        return jsonify({"erro": "Preencha local, ambiente e descrição."}), 400

    image_path = None
    imagem_url = None
    mime_type = None
    file = request.files.get("imagem")
    if file and file.filename:
        if not allowed_file(file.filename):
            return jsonify({"erro": "Envie imagem em PNG, JPG, JPEG ou WEBP."}), 400
        ext = file.filename.rsplit(".", 1)[1].lower()
        final_name = f"{uuid.uuid4().hex}.{ext}"
        image_path = UPLOAD_DIR / final_name
        file.save(image_path)
        imagem_url = f"/uploads/{final_name}"
        mime_type = file.mimetype or f"image/{ext}"
        if ext == "jpg":
            mime_type = "image/jpeg"

    analysis = analyze_occurrence(local, ambiente, descricao, image_path, mime_type)
    occurrence_id = str(uuid.uuid4())
    created_at = int(time.time())

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO ocorrencias (
                id, local, ambiente, descricao, imagem_url, tipo_ocorrencia, gravidade, prioridade,
                litros_por_dia_estimados, confianca, acao_sugerida, justificativa, observacao_tecnica,
                fonte_analise, status, criado_em
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                occurrence_id,
                local,
                ambiente,
                descricao,
                imagem_url,
                analysis["tipo_ocorrencia"],
                analysis["gravidade"],
                analysis["prioridade"],
                float(analysis["litros_por_dia_estimados"]),
                analysis["confianca"],
                analysis["acao_sugerida"],
                analysis["justificativa"],
                analysis["observacao_tecnica"],
                analysis["fonte_analise"],
                "Aberto",
                created_at
            )
        )

    result = {
        "id": occurrence_id,
        "local": local,
        "ambiente": ambiente,
        "descricao": descricao,
        "imagem_url": imagem_url,
        "status": "Aberto",
        "criado_em": created_at,
        **analysis
    }
    result.update(calcular_impacto(analysis["litros_por_dia_estimados"]))
    return jsonify(result), 201


@app.route("/api/ocorrencias/<occurrence_id>/status", methods=["PATCH"])
def update_status(occurrence_id: str):
    body = request.get_json(silent=True) or {}
    status = str(body.get("status", "")).strip()
    if status not in VALID_STATUSES:
        return jsonify({"erro": "Status inválido."}), 400
    with get_db() as conn:
        cur = conn.execute("UPDATE ocorrencias SET status = ? WHERE id = ?", (status, occurrence_id))
        if cur.rowcount == 0:
            return jsonify({"erro": "Ocorrência não encontrada."}), 404
    return jsonify({"ok": True, "status": status})


@app.route("/api/reset-demo", methods=["POST"])
def reset_demo():
    if os.getenv("AQUAIA_ENABLE_RESET", "false").lower() != "true":
        abort(404)
    with get_db() as conn:
        conn.execute("DELETE FROM ocorrencias")
        seed_demo(conn)
    return jsonify({"ok": True})


init_db()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
