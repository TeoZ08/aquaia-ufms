# Case Study — AquaIA UFMS

## Problema

Desperdicios de agua no campus podem passar despercebidos, demorar para chegar ate a manutencao e gerar impacto ambiental e financeiro sem visibilidade clara.

## Publico-alvo

Banca do hackathon, comunidade UFMS e equipes que precisam registrar, priorizar e acompanhar ocorrencias de manutencao relacionadas a agua.

## Solucao

Web app responsivo para registrar ocorrencias de desperdicio de agua, analisar prioridade com Gemini quando configurado ou fallback por regras, mostrar impacto estimado e localizar pontos no mapa.

## Minha contribuicao

A confirmar no detalhe. Pelo repositorio, o projeto inclui backend Flask, frontend Jinja/Tailwind/Stimulus, regras de fallback, integracao opcional com Gemini, mapa Leaflet/OpenStreetMap, painel de manutencao, testes e deploy no Render.

## Stack

- Flask
- SQLite
- Gemini opcional
- Jinja
- Tailwind CSS v4
- Stimulus
- esbuild
- Leaflet/OpenStreetMap
- Render

## Arquitetura

Aplicacao Flask com banco SQLite local. O registro de ocorrencia passa por analise multimodal com Gemini quando ha chave configurada; se a API estiver indisponivel, o MVP usa fallback por regras. O frontend usa templates Jinja, assets compilados em `static/dist`, controladores Stimulus e mapa Leaflet.

## Funcionalidades principais

- Cadastro de ocorrencia com local, ambiente, descricao e imagem opcional.
- Analise por Gemini ou fallback por regras.
- Priorizacao por gravidade, litros/dia e custo estimado.
- Painel de manutencao com status, busca e filtros.
- Mapa real com OpenStreetMap + Leaflet.
- Mapa oficial da Cidade Universitaria UFMS como apoio visual.
- Testes automatizados para backend, fallback e assets frontend.

## Decisoes tecnicas

- Nao depender de Google Maps ou Mapbox para evitar token, cadastro e custo.
- Manter Gemini opcional para garantir funcionamento sem API externa.
- Usar SQLite para MVP e deploy simples.
- Estimar impacto com tarifa configuravel em variavel de ambiente.

## Desafios

- Criar um MVP apresentavel para banca sem depender totalmente de IA.
- Transformar ocorrencias em dados priorizaveis.
- Comunicar impacto social, ambiental e operacional de forma clara.

## Resultado atual

Protótipo funcional para hackathon com registro, analise, painel, mapa, fallback por regras, deploy configurado e testes automatizados.

## Demonstracao

A confirmar.

## Proximos passos

- Validar dados reais de manutencao e tarifa.
- Melhorar fluxo de triagem para equipe responsavel.
- Avaliar historico, responsaveis e anexos por ocorrencia.
- Definir caminho de producao com banco persistente e autenticacao.

## Como este projeto entra no portfolio

Projeto principal de impacto social e IA aplicada, com narrativa forte de sustentabilidade, confiabilidade tecnica e uso responsavel de fallback quando a IA nao esta disponivel.
