# Fase 4B: Registro de peso e histórico

Sessão 8 de 17 · Tamanho: Média · Depende de: Fase 4A

## Antes de começar

1. Leia `AGENTS.md`, `docs/DECISOES.md` e `docs/PROGRESSO.md`.
2. Não leia a especificação inteira. Use só os trechos abaixo; se precisar de outro, busque pelo ID com `grep -n` em `docs/ESPECIFICACAO.md` e leia ao redor.
3. Se `docs/PROGRESSO.md` indicar um ponto de retomada para esta fase, comece dele.
4. Esta sessão mexe na interface: abra `docs/design/guia-de-design.png` (cores, tipografia, componentes e telas de referência) e siga a seção 6 da especificação, em especial as regras de contraste.

## Objetivo

Construir o registro de peso e o histórico, ligados aos repositórios locais.

## Escopo desta sessão

- Tela de registro: campo numérico grande, ajuste de ±0,1 kg, seletor de data (`v-date-picker` com o locale do app, sem datas futuras), um registro por dia (upsert).
- Valor inicial sugerido: último peso. Validação de 20 a 500 kg com mensagem amigável. Entrada com vírgula ou ponto (`parseDecimal`).
- Registro em no máximo 3 toques a partir da tela Hoje; a tela Hoje mostra o peso atual e o atalho de registro.
- Histórico em lista virtualizada, com data, peso, variação neutra em relação ao anterior; editar (peso, data sem duplicar, nota) e apagar com confirmação.
- Pontos de extensão deixados prontos (eventos ou slots) para o humor, a mensagem de acolhimento e a celebração de marco, que entram nas Fases 5 e 7.

## Fora desta sessão

- Gráfico, marcos, humor, mensagens de acolhimento.

## Trechos da especificação

Copiados de `docs/ESPECIFICACAO.md`. Em caso de divergência, vale o documento original.

**8.2 Registro de peso (M)**

- **RF-04** Tela direta com campo numérico grande, botões de ajuste de ±0,1 kg e botão Salvar. Aceitar vírgula ou ponto como separador decimal, em qualquer idioma (RN-16). Valor inicial sugerido: último peso registrado.
- **RF-05** Há no máximo um registro por dia. Salvar em um dia que já tem registro atualiza o existente (upsert).
- **RF-06** Permitir escolher a data do registro (padrão: hoje; não permitir datas futuras).
- **RF-07** Logo após salvar, oferecer a escolha opcional de humor (ver 8.8) e exibir, se aplicável, a mensagem de acolhimento (8.9) ou a celebração de meta (8.4).
- **Aceite:** registrar o peso de hoje exige no máximo 3 toques a partir da tela Hoje; valores fora de 20–500 kg são recusados com mensagem amigável.

**8.5 Histórico (M)**

- **RF-17** Lista em ordem decrescente de data, com data, peso, variação em relação ao registro anterior (texto neutro, sem setas vermelhas) e emoji de humor, se houver.
- **RF-18** Tocar em um item abre a edição de peso, data (sem duplicar dia), humor e nota. Deslizar ou botão de lixeira apaga, com confirmação.
- **RF-19** Apagar ou editar registros recalcula gráfico, marcos e streak. Marcos já alcançados não são “desfeitos” por edição posterior (a data de conquista permanece).
- **Aceite:** a lista com 1.000 registros rola sem travamentos (usar lista virtualizada).

**Regras**

- **RN-02 Peso atual de referência.** Para o progresso e os marcos, usar o **peso mais recente registrado** (não a média), para que a conquista seja percebida de forma concreta. A média é usada apenas no gráfico e nas comparações de tendência.
- **RN-05 Detecção de subida.** Há subida quando o peso registrado é maior que o registro imediatamente anterior ou maior que a média móvel calculada sem o novo registro. Em qualquer dos casos, exibir a mensagem de acolhimento uma vez por registro.
- **RN-08 Dia civil.** Todas as viradas de dia usam o fuso local do aparelho; ao abrir o app, recalcular “hoje” e atualizar a interface.
- **RN-16 Cálculo e formatação independentes.** Datas, horas e números só são formatados na camada de apresentação, com `Intl`; as regras RN-01 a RN-10 nunca dependem do idioma. Campos numéricos aceitam vírgula ou ponto em qualquer idioma (se houver os dois símbolos, o último é o decimal) e o valor é normalizado antes de validar e gravar. Datas nunca são digitadas em texto livre: usar seletor.

**Formatação**

- **RF-75 Datas e horas.** Todas as telas usam os formatadores centrais `formatDate`, `formatTime` e `formatRelative`, em `apps/web/src/i18n/format.ts`. É proibido espalhar `toLocaleDateString` ou `format` do date-fns com padrão fixo. Pontos a validar, um a um: histórico (RF-17), edição de registro (RF-18), seletor de data do registro de peso (RF-06), eixos e dicas do gráfico (RF-08), data de conquista dos marcos (RF-15), data da foto na galeria (RF-32), horário e dias do lembrete (RF-37 e RF-42), “Atualizado em” da landing (RF-67) e rótulos “hoje” e “ontem”. O seletor de data usa o `v-date-picker` do Vuetify com o mesmo locale e o primeiro dia da semana do idioma.

## Pronto quando

- Os critérios de aceite de 8.2 e 8.5 passam.
- Teste com 1.000 registros: a lista rola sem travar.
- Datas e números aparecem no formato de cada idioma em todas as telas desta fase; “hoje” e “ontem” usam `formatRelative`.
- Editar ou apagar um registro grava na fila de saída.

## Insumos que dependem do dono do projeto

- Nenhum.

## Ao terminar (obrigatório)

1. Rode `npm run lint`, `npm test` e `npm run build`; todos devem passar. Corrija o que falhar antes de seguir.
2. Revise o diff: nada fora do escopo, nenhuma dependência desnecessária, nenhum segredo, nenhum texto fixo em componente.
3. Atualize `docs/PROGRESSO.md` (marque a sessão) e `docs/DECISOES.md` (decisões novas).
4. Escreva `docs/relatorios/08-fase-04b-registro-historico.md` pelo modelo `docs/MODELO_RELATORIO.md` (máximo de 40 linhas).
5. Faça o commit: `fase 4B: <resumo curto>`.
6. Pare. Não comece a próxima sessão (prompts/09-fase-05-grafico-metas.md). Responda no chat só com o resumo de 5 linhas do relatório.
