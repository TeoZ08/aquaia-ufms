# AquaIA UFMS

Protótipo funcional para o Hackathon do Núcleo de Formação Cidadã da UFMS.

O AquaIA é um web app responsivo para registrar desperdício de água no campus, analisar a ocorrência com IA quando houver chave Gemini, priorizar atendimento e acompanhar impacto em painel e mapa.

## O que o MVP faz

- Cadastro de ocorrência com local, ambiente, descrição e imagem opcional.
- Análise automática com Gemini, se `GEMINI_API_KEY` estiver configurada.
- Fallback por regras quando não houver API key ou quando a consulta falhar.
- Painel de manutenção com prioridade, gravidade, litros/dia, status e busca.
- Mapa real com OpenStreetMap + Leaflet, sem Google Maps, Mapbox, cadastro ou token.
- Mapa oficial da Cidade Universitária UFMS de Campo Grande como apoio visual.
- Banco SQLite local, simples para MVP e deploy no Render.

## Rodando localmente

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
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

## Variáveis de ambiente

A chave Gemini é opcional. Sem ela, o sistema continua funcionando com análise por regras.

```text
GEMINI_API_KEY=sua_chave_do_gemini
GEMINI_MODEL=gemini-2.5-flash
AQUAIA_SEED_DEMO=true
AQUAIA_ENABLE_RESET=false
UFMS_MAP_LAT=-20.5032738
UFMS_MAP_LNG=-54.6134936
UFMS_MAP_ZOOM=16
FLASK_DEBUG=false
```

## Deploy no Render

Use o `Procfile` já incluído:

```text
web: gunicorn app:app
```

No Render, configure as variáveis necessárias em Environment. Para apresentação com dados de exemplo, mantenha `AQUAIA_SEED_DEMO=true`. Não configure `FLASK_DEBUG=true` em produção.

## Observações técnicas

Este MVP não treina um modelo novo com imagens. Ele usa o Gemini como modelo multimodal para interpretar imagem e descrição no momento do registro.

A chave do Gemini fica somente no backend. O mapa real não usa Google Maps nem Mapbox; o Leaflet carrega os blocos do OpenStreetMap diretamente no navegador. Se o mapa externo não carregar, o mapa oficial da UFMS segue disponível como fallback visual.
