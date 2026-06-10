# AquaIA UFMS - Sistema Visual

## Intent

Usuario principal: banca, equipe de manutencao e comunidade da UFMS.

Tarefa principal: registrar desperdicio de agua, priorizar atendimento e visualizar impacto no campus.

Sensacao desejada: tecnico, sustentavel, confiavel e institucional.

## Dominio

Agua, campus, manutencao, vazamento, mapa, alerta, priorizacao, impacto, custo, litros/dia.

## Assinatura

Mapa + ocorrencia + impacto estimado. A interface deve conectar territorio, urgencia e consequencia mensuravel.

## Defaults a rejeitar

- Dashboard generico com cards sem narrativa; preferir dados ligados a ocorrencias e impacto.
- Mapa sem funcao operacional; preferir mapa como eixo de localizacao e decisao.
- Visual decorativo de sustentabilidade; preferir linguagem institucional com agua como sistema e recurso.

## Direcao

O AquaIA UFMS deve parecer um produto institucional, editorial e funcional para registro, triagem e acompanhamento de desperdicio de agua no campus. A interface prioriza leitura rapida, confianca e clareza operacional.

## Logo Oficial

Use `static/assets/brand/02_logo_wordmark_waves_teal_ia.png` como wordmark oficial em toda a interface.

Nao use multiplas logos na mesma tela quando elas competirem pela hierarquia visual. A logo pode aparecer na navbar e como assinatura principal do hero; evite repetir outras variantes sem funcao clara.

## Paleta Oficial

- Fundo principal: `#FFFDF2`
- Superficie: `#FFFFFF`
- Texto principal: `#021225`
- Teal institucional: `#238689`
- Aqua IA: `#25C5E9`
- Azul editorial: `#0077B6`
- Linha suave: `#D9ECE5`
- Verde de apoio: `#E9FFF2`
- Alerta: `#F59E0B`
- Urgente: `#E5483F`

Regra: nao usar `#2437FF`. Destaques editoriais, numeros grandes, palavra "dado", fluxo operacional e waves fortes devem usar `#0077B6`.

## Waves

Use apenas os assets seamless:

- `static/assets/brand/wave-loop-blue.png`
- `static/assets/brand/wave-loop-teal.png`

As waves devem ter fundo transparente, repetir no eixo X com `background-repeat: repeat-x`, usar `background-position: left center` e `background-size: 1440px auto` ou tamanho fixo equivalente. Nao usar divisores antigos com corte seco.

## Background

O fundo principal do app e solido em `#FFFDF2`. Evite gradientes verdes no `body` ou em grandes areas de pagina.

## Componentes

Evite caixas flutuantes decorativas sem funcao. Cards, paineis e superficies devem existir para agrupamento funcional, leitura de dados, formulario, mapa ou listas.

Textos grandes editoriais devem ser HTML real sempre que possivel. PNGs tipograficos so devem ser usados quando forem assinatura de marca ou composicao aprovada que nao precise escalar como texto.

## Profundidade

Use mudancas de superficie e bordas sutis. Sombras devem apoiar leitura e hierarquia, nao competir com mapa, formulario ou dados de manutencao.

## Estados e acessibilidade

- Formularios precisam indicar erro e sucesso de envio.
- Status de ocorrencia deve ser legivel por texto e cor.
- Contraste deve funcionar em cards, mapa, botoes e alertas.
- No mobile, o fluxo deve priorizar registro de ocorrencia antes de paineis densos.
