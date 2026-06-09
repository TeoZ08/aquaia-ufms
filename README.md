# AquaIA UFMS

Protótipo funcional para o Hackathon do Núcleo de Formação Cidadã da UFMS.

O AquaIA é um web app responsivo para registrar desperdício de água no campus, analisar a ocorrência com IA quando houver chave Gemini, priorizar atendimento e acompanhar impacto em painel e mapa.

## O que o MVP faz

- Cadastro de ocorrência com local, ambiente, descrição e imagem opcional.
- Análise automática com Gemini, se `GEMINI_API_KEY` estiver configurada.
- Fallback por regras quando não houver API key ou quando a consulta falhar.
- Painel de manutenção com prioridade, gravidade, litros/dia, custo estimado, status, busca e filtros.
- Mapa real com OpenStreetMap + Leaflet, sem Google Maps, Mapbox, cadastro ou token.
- Mapa oficial da Cidade Universitária UFMS de Campo Grande como apoio visual.
- Banco SQLite local, simples para MVP e deploy no Render.

## Stack

- Backend: Flask, SQLite, Gemini opcional e fallback por regras.
- Frontend: Jinja, Tailwind CSS v4, Stimulus e esbuild.
- Assets: SVGs oficiais do AquaIA em `static/assets/logo` e mapa oficial em `static/assets/maps`.
- Build frontend: `static/src` gera `static/dist/output.css` e `static/dist/app.js`.

## Rodando localmente

Use Python 3.13.x e Node 22.x. O deploy usa `.python-version` com `3.13.13` e `.node-version` com `22.16.0`.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
npm install
npm run build
cp .env.example .env
python app.py
```

No Windows, ative o ambiente com:

```bash
.venv\Scripts\activate
```

Acesse:

```text
http://localhost:5000
```

Para trabalhar no frontend, rode os watchers em terminais separados:

```bash
npm run dev:css
npm run dev:js
```

## Rodando testes

Instale as dependências de desenvolvimento:

```bash
pip install -r requirements-dev.txt
npm install
```

Execute build e suíte:

```bash
npm run build
pytest -q
```

Os testes usam banco SQLite temporário, não chamam o Gemini e validam endpoints principais, fallback por regras, status de ocorrência, impacto financeiro, templates Jinja, bundle JavaScript e componentes Tailwind gerados.

## Variáveis de ambiente

A chave Gemini é opcional. Sem ela, o sistema continua funcionando com análise por regras.

```text
GEMINI_API_KEY=sua_chave_do_gemini
GEMINI_MODEL=gemini-2.5-flash
AQUAIA_SEED_DEMO=true
AQUAIA_ENABLE_RESET=false
TARIFA_M3_ESTIMADA=71.03
UFMS_MAP_LAT=-20.5032738
UFMS_MAP_LNG=-54.6134936
UFMS_MAP_ZOOM=16
FLASK_DEBUG=false
```

`TARIFA_M3_ESTIMADA` é usada para converter litros/dia em custo mensal e anual no MVP:

```text
litros_mes = litros_dia x 30
m3_mes = litros_mes / 1000
custo_mes = m3_mes x TARIFA_M3_ESTIMADA
custo_ano = custo_mes x 12
```

## Deploy no Render

Use o `Procfile` já incluído:

```text
web: gunicorn app:app
```

O repositório também inclui `render.yaml` para Blueprint no Render. Ele define:

- runtime Python;
- plano free;
- branch `main`;
- build `pip install -r requirements.txt && npm ci && npm run build`;
- start `gunicorn app:app`;
- health check em `/api/health`;
- auto deploy quando checks passarem.

Build command equivalente, se criar o serviço manualmente:

```bash
pip install -r requirements.txt && npm ci && npm run build
```

No Render, configure Node a partir de `.node-version` e defina as variáveis necessárias em Environment. Para apresentação com dados de exemplo, mantenha `AQUAIA_SEED_DEMO=true`. Não configure `FLASK_DEBUG=true` em produção.

## Estrutura relevante

```text
app.py
templates/base.html
templates/index.html
static/src/input.css
static/src/app.js
static/src/controllers/
static/src/lib/
static/dist/
static/assets/logo/
static/assets/maps/
tests/
```

## Observações técnicas

Este MVP não treina um modelo novo com imagens. Ele usa o Gemini como modelo multimodal para interpretar imagem e descrição no momento do registro.

A chave do Gemini fica somente no backend. O mapa real não usa Google Maps nem Mapbox; o Leaflet carrega os blocos do OpenStreetMap diretamente no navegador. Se o mapa externo não carregar, o mapa oficial da UFMS segue disponível como fallback visual.
