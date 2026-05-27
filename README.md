# AquaIA UFMS

Protótipo funcional para o Hackathon do Núcleo de Formação Cidadã da UFMS.

A aplicação permite registrar ocorrências relacionadas ao desperdício de água, enviar imagem, analisar com Gemini quando a API key estiver configurada e acompanhar as ocorrências em um painel de manutenção.

## O que o MVP faz

- Cadastro de ocorrência com local, ambiente, descrição e imagem.
- Análise automática com Gemini, se `GEMINI_API_KEY` estiver configurada.
- Fallback por regras quando não houver API key ou quando a consulta falhar.
- Painel com ocorrências, prioridade, gravidade, estimativa de litros/dia e status.
- Banco SQLite local.
- Pronto para deploy no Render.

## Rodando localmente

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edite o arquivo `.env` e coloque sua chave:

```bash
GEMINI_API_KEY=sua_chave_do_gemini
GEMINI_MODEL=gemini-2.5-flash
```

Depois rode:

```bash
python app.py
```

Acesse:

```text
http://localhost:5000
```

## Deploy no Render

1. Suba estes arquivos para um repositório no GitHub.
2. No Render, crie um novo Web Service.
3. Selecione o repositório.
4. Configure:

```text
Build Command: pip install -r requirements.txt
Start Command: gunicorn app:app
```

5. Em Environment, adicione:

```text
GEMINI_API_KEY = sua_chave_do_gemini
GEMINI_MODEL = gemini-2.5-flash
```

6. Faça o deploy.

## Observação importante

Este MVP não treina um modelo novo com imagens. Ele usa o Gemini como modelo multimodal para interpretar imagem e descrição no momento do registro. Para hackathon, isso é melhor do que treinar do zero, porque reduz tempo, custo e risco técnico.

## Segurança

Nunca coloque sua chave Gemini diretamente no frontend. Ela fica somente no backend, como variável de ambiente.
