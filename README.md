# AquaIA UFMS

Protótipo funcional para o Hackathon do Núcleo de Formação Cidadã da UFMS.

A aplicação registra ocorrências relacionadas ao desperdício de água, permite envio de imagem, analisa com Gemini quando a API key estiver configurada, acompanha as ocorrências em um painel de manutenção e exibe os pontos em mapa real sem cadastro.

## O que o MVP faz

- Cadastro de ocorrência com local, ambiente, descrição e imagem.
- Análise automática com Gemini, se `GEMINI_API_KEY` estiver configurada.
- Fallback por regras quando não houver API key ou quando a consulta falhar.
- Painel com ocorrências, prioridade, gravidade, estimativa de litros/dia e status.
- Mapa real com OpenStreetMap + Leaflet, sem necessidade de cadastro ou token.
- Mapa oficial da Cidade Universitária UFMS de Campo Grande como apoio visual.
- Marcadores dinâmicos agrupados por local no mapa real e no mapa oficial.
- Banco SQLite local.
- Pronto para deploy no Render.

## Rodando localmente

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

No Windows:

```bash
.venv\Scripts\activate
```

Edite o arquivo `.env` e coloque sua chave Gemini:

```bash
GEMINI_API_KEY=sua_chave_do_gemini
GEMINI_MODEL=gemini-2.5-flash
```

O mapa real usa OpenStreetMap + Leaflet e não precisa de chave de API. Estes campos são opcionais e servem apenas para ajustar o centro inicial:

```bash
UFMS_MAP_LAT=-20.5032738
UFMS_MAP_LNG=-54.6134936
UFMS_MAP_ZOOM=16
```

Depois rode:

```bash
python app.py
```

Acesse:

```text
http://localhost:5000
```


5. Em Environment, adicione:

```text
GEMINI_API_KEY = sua_chave_do_gemini
GEMINI_MODEL = gemini-2.5-flash
AQUAIA_SEED_DEMO = true
UFMS_MAP_LAT = -20.5032738
UFMS_MAP_LNG = -54.6134936
UFMS_MAP_ZOOM = 16
```

6. Faça o deploy.

## Observações técnicas

Este MVP não treina um modelo novo com imagens. Ele usa o Gemini como modelo multimodal para interpretar imagem e descrição no momento do registro.

A chave do Gemini fica somente no backend. O mapa real não usa Google Maps nem Mapbox, portanto não exige cadastro. O Leaflet carrega os blocos de mapa do OpenStreetMap diretamente no navegador.

Caso o mapa externo não carregue por bloqueio de rede, o sistema ainda mantém o mapa oficial da UFMS como visual de apoio.
