# Relatório: Fase 4B (Registro de peso e histórico)
Data: 2026-11-26 · Commit: d19e762

## Resumo (3 linhas)
Registro de peso em até dois toques a partir do Hoje, com campo grande, ajuste de ±0,1 kg, seletor sem datas futuras e upsert por dia.
Histórico virtualizado com variação neutra, edição sem duplicar data e exclusão confirmada; escritas locais recalculam marcos e streak e vão para a fila.
Humor, acolhimento e celebração ficam em eventos tipados para as fases 5 e 7; os três catálogos foram atualizados juntos.

## Entregue
- RF-04/RN-16: campo numérico grande, ±0,1 kg e `parseDecimal` local (vírgula/ponto, último separador decimal).
- RF-05/RF-06: um registro por dia com upsert; data padrão hoje, sem datas futuras, no locale do app.
- RF-07/D-53: eventos `weight:saved`, `mood:prompt`, `welcome:prompt` e `milestone:evaluate` prontos para inscrição.
- RF-17/RF-75: lista `v-virtual-scroll` com data, `formatRelative` para hoje/ontem, peso e variação neutra; emoji de humor quando existe.
- RF-18/RF-19: edição preserva o id ao trocar a data, recusa dia ocupado, apaga com confirmação e grava na fila; marcos mantêm `achievedDate`.
- RN-01/RN-02/RN-05: média móvel, peso de referência e detecção de subida espelhados no web (D-51).

## Testes
- Comando: `npm run lint` → sem erros; `npm run i18n:check` → 131 chaves nos 3 idiomas.
- Comando: `npm test` → 154 passando, 0 falhas; `npm run build` → ok.
- Comando: `npm run test:e2e` → 9 passando, incluindo 1.000 registros com poucas linhas renderizadas.
- Verificação manual: fluxos conferidos no Chromium contra API, Postgres e Redis reais.

## Decisões tomadas
- D-51 a D-53 registradas em `docs/DECISOES.md`; nenhuma dependência nova.

## Pendências e adiado
- Gráfico, marcos visíveis, humor, mensagem de acolhimento e celebração ficam para as fases 5 e 7.

## Riscos e avisos
- O seletor de data usa o locale do app; en-US e es-419 continuam rascunho até revisão humana.

## Insumos necessários do dono
- nenhum

## Próxima sessão
- prompts/09-fase-05-grafico-metas.md
