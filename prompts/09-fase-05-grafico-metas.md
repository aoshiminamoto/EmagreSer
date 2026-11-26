# Fase 5: Gráfico de tendência e metas

Sessão 9 de 17 · Tamanho: Média · Depende de: Fase 4B

## Antes de começar

1. Leia `AGENTS.md`, `docs/DECISOES.md` e `docs/PROGRESSO.md`.
2. Não leia a especificação inteira. Use só os trechos abaixo; se precisar de outro, busque pelo ID com `grep -n` em `docs/ESPECIFICACAO.md` e leia ao redor.
3. Se `docs/PROGRESSO.md` indicar um ponto de retomada para esta fase, comece dele.
4. Esta sessão mexe na interface: abra `docs/design/guia-de-design.png` (cores, tipografia, componentes e telas de referência) e siga a seção 6 da especificação, em especial as regras de contraste.

## Objetivo

Construir a tela Evolução com o gráfico e a tela Metas com a celebração.

## Escopo desta sessão

- Gráfico de linha em SVG (componente próprio, sem biblioteca externa pesada): pontos diários discretos, linha da média móvel, linhas do peso-alvo e do próximo marco, seletor de período (30 dias, 90 dias, 6 meses, tudo).
- Indicadores abaixo do gráfico e estado vazio com menos de 2 registros.
- Barra de progresso até o próximo marco na tela Hoje.
- Tela Metas com todos os marcos, alcançados (com data) e pendentes.
- Celebração em tela cheia, uma única vez por marco (`celebrated` só no aparelho), respeitando “reduzir movimento”; dois marcos de uma vez celebram o mais distante.
- Edição de meta ou passo regenera os marcos preservando os alcançados.

## Fora desta sessão

- IMC, humor, mensagens de acolhimento.

## Trechos da especificação

Copiados de `docs/ESPECIFICACAO.md`. Em caso de divergência, vale o documento original.

**8.3 Gráfico de tendência (M)**

- **RF-08** Gráfico de linha com duas séries: pontos de peso diário (discretos, em cinza suave) e linha de média móvel (destaque, cor primária).
- **RF-09** Seletor de período: 30 dias, 90 dias, 6 meses, tudo. Padrão: 30 dias.
- **RF-10** Exibir linhas horizontais tracejadas para o peso-alvo e para o próximo marco.
- **RF-11** Abaixo do gráfico, mostrar: peso atual, média móvel atual, variação total desde o início e variação na média dos últimos 7 dias.
- **RF-12** Estado vazio: com menos de 2 registros, mostrar ilustração e texto explicando que a tendência aparece com mais registros.
- **Aceite:** a linha de média usa exatamente a regra RN-01; o gráfico é legível em telas de 360 px de largura.

**8.4 Metas parciais e recompensas (M)**

- **RF-13** Mostrar na tela Hoje uma barra de progresso até o próximo marco, com o texto “Faltam X kg para o próximo passo”.
- **RF-14** Ao atingir um marco pela primeira vez, exibir uma celebração em tela cheia (animação simples de confete ou brilho, mensagem de parabéns e o marco alcançado). Cada marco é celebrado uma única vez.
- **RF-15** Tela Metas lista todos os marcos com estado: alcançado (com data) ou pendente.
- **RF-16** Se o usuário editar a meta ou o passo, regenerar os marcos conforme RN-03 preservando os já alcançados.
- **Aceite:** registrar um peso que cruza dois marcos de uma vez marca os dois como alcançados e celebra o mais distante, mencionando a quantidade de marcos conquistados.

**Regras**

- **RN-01 Média móvel de 7 dias.** Para cada data D com registro, a média é a média aritmética dos pesos registrados nos 7 dias de calendário terminados em D (D−6 até D). Dias sem registro são ignorados, sem preenchimento. A média existe se houver ao menos 1 registro na janela. Arredondar para 1 casa apenas na exibição.
- **RN-02 Peso atual de referência.** Para o progresso e os marcos, usar o **peso mais recente registrado** (não a média), para que a conquista seja percebida de forma concreta. A média é usada apenas no gráfico e nas comparações de tendência.
- **RN-03 Geração de marcos.** Dado peso inicial P, peso-alvo A e passo S, os marcos são P−S, P−2S, P−3S… enquanto o valor for maior que A, e o último marco é sempre A. Exemplo: P=90, A=80, S=4 gera 86, 82, 80. Um marco é considerado alcançado quando algum peso registrado for menor ou igual a ele.
- **RN-04 Progresso.** Percentual até a meta final = (P − peso atual) ÷ (P − A), limitado entre 0% e 100%.

**Formatação**

- **RF-75 Datas e horas.** Todas as telas usam os formatadores centrais `formatDate`, `formatTime` e `formatRelative`, em `apps/web/src/i18n/format.ts`. É proibido espalhar `toLocaleDateString` ou `format` do date-fns com padrão fixo. Pontos a validar, um a um: histórico (RF-17), edição de registro (RF-18), seletor de data do registro de peso (RF-06), eixos e dicas do gráfico (RF-08), data de conquista dos marcos (RF-15), data da foto na galeria (RF-32), horário e dias do lembrete (RF-37 e RF-42), “Atualizado em” da landing (RF-67) e rótulos “hoje” e “ontem”. O seletor de data usa o `v-date-picker` do Vuetify com o mesmo locale e o primeiro dia da semana do idioma.

## Pronto quando

- Aceite de 8.3 e 8.4 passa; a linha de média usa exatamente a regra RN-01 (teste comparando com o pacote de domínio).
- O gráfico é legível em 360 px de largura, nos três idiomas, com datas e números no formato do idioma.
- Celebração aparece uma só vez por marco, inclusive depois de reiniciar o app.

## Insumos que dependem do dono do projeto

- Nenhum.

## Ao terminar (obrigatório)

1. Rode `npm run lint`, `npm test` e `npm run build`; todos devem passar. Corrija o que falhar antes de seguir.
2. Revise o diff: nada fora do escopo, nenhuma dependência desnecessária, nenhum segredo, nenhum texto fixo em componente.
3. Atualize `docs/PROGRESSO.md` (marque a sessão) e `docs/DECISOES.md` (decisões novas).
4. Escreva `docs/relatorios/09-fase-05-grafico-metas.md` pelo modelo `docs/MODELO_RELATORIO.md` (máximo de 40 linhas).
5. Faça o commit: `fase 5: <resumo curto>`.
6. Pare. Não comece a próxima sessão (prompts/10-fase-06-habitos-agua-streak.md). Responda no chat só com o resumo de 5 linhas do relatório.
