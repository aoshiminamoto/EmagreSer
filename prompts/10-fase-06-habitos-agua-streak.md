# Fase 6: Hábitos, água e streak

Sessão 10 de 17 · Tamanho: Média · Depende de: Fase 4B

## Antes de começar

1. Leia `AGENTS.md`, `docs/DECISOES.md` e `docs/PROGRESSO.md`.
2. Não leia a especificação inteira. Use só os trechos abaixo; se precisar de outro, busque pelo ID com `grep -n` em `docs/ESPECIFICACAO.md` e leia ao redor.
3. Se `docs/PROGRESSO.md` indicar um ponto de retomada para esta fase, comece dele.
4. Esta sessão mexe na interface: abra `docs/design/guia-de-design.png` (cores, tipografia, componentes e telas de referência) e siga a seção 6 da especificação, em especial as regras de contraste.

## Objetivo

Construir o checklist de hábitos, o contador de água e o selo de consistência na tela Hoje.

## Escopo desta sessão

- Checklist do dia com os hábitos ativos, marcar e desmarcar com resposta tática leve; cada dia tem seu próprio registro.
- Textos dos hábitos padrão traduzidos pela chave; `label` só em hábitos personalizados (RF-79).
- Contador de água: +1 com animação simples, −1, indicador “X de Y copos”, meta editável (a tela de edição vem na Fase 10).
- Selo de streak com recorde, usando a função do domínio; dia ativo é qualquer ação (peso, hábito, água, humor).
- (Desejável) hábitos personalizados até o total de 8 e percentual dos últimos 30 dias.

## Fora desta sessão

- Humor (Fase 7) e tela de configurações (Fase 10).

## Trechos da especificação

Copiados de `docs/ESPECIFICACAO.md`. Em caso de divergência, vale o documento original.

**8.6 Consistência — streak (M)**

- **RF-20** Exibir na tela Hoje um selo com o número de dias seguidos e o recorde pessoal.
- **RF-21** Um dia é “ativo” se houver ao menos uma ação: peso registrado, hábito marcado, copo de água adicionado ou humor registrado.
- **RF-22** Regra de continuidade: se hoje ainda não é ativo mas ontem foi, o streak atual é mantido até o fim do dia de hoje; o streak só zera quando passa um dia inteiro sem ação.
- **Aceite:** testes unitários cobrem virada de dia, dias perdidos, edição retroativa e streak de 0 dias.

**8.7 Hábitos e água (M)**

- **RF-23** Checklist do dia com os hábitos ativos; tocar marca ou desmarca, com resposta tátil leve. Reinicia a cada novo dia (cada dia tem seu próprio registro).
- **RF-24** Contador de água: botão grande de +1 copo com animação simples de enchimento, botão de −1 e indicador “X de Y copos”. A meta padrão é 8 copos e é editável nas configurações.
- **RF-25 (D)** Permitir ativar, desativar e criar hábitos personalizados (até 8 no total).
- **RF-26 (D)** Tela de histórico de hábitos com percentual de dias cumpridos nos últimos 30 dias.
- **Aceite:** o estado de hoje persiste ao fechar e reabrir o app; mudar de dia à meia-noite zera a visualização sem apagar o histórico.

**Regras**

- **RN-06 Streak.** Conforme RF-20 a RF-22. Calcular a partir da união das datas com qualquer ação registrada.
- **RN-08 Dia civil.** Todas as viradas de dia usam o fuso local do aparelho; ao abrir o app, recalcular “hoje” e atualizar a interface.

**Idioma**

- **RF-77 Plural e gênero.** Mensagens com contagem (dias de streak, copos, marcos, “faltam X kg”) usam plural do `vue-i18n`. Testes de snapshot por idioma para 0, 1, 2 e valores maiores.
- **RF-79 Hábitos padrão e humor.** Traduzidos a partir da chave, sem gravar texto no banco. O campo `label` só existe em hábitos personalizados.

## Pronto quando

- Aceite de 8.6 e 8.7 passa.
- O estado de hoje persiste ao fechar e reabrir; à meia-noite a visualização zera sem apagar o histórico.
- Plurais corretos nos três idiomas para 0, 1, 2 e valores maiores (dias, copos).
- Cada ação grava na fila de saída e atualiza o streak.

## Insumos que dependem do dono do projeto

- Nenhum.

## Ao terminar (obrigatório)

1. Rode `npm run lint`, `npm test` e `npm run build`; todos devem passar. Corrija o que falhar antes de seguir.
2. Revise o diff: nada fora do escopo, nenhuma dependência desnecessária, nenhum segredo, nenhum texto fixo em componente.
3. Atualize `docs/PROGRESSO.md` (marque a sessão) e `docs/DECISOES.md` (decisões novas).
4. Escreva `docs/relatorios/10-fase-06-habitos-agua-streak.md` pelo modelo `docs/MODELO_RELATORIO.md` (máximo de 40 linhas).
5. Faça o commit: `fase 6: <resumo curto>`.
6. Pare. Não comece a próxima sessão (prompts/11-fase-07-humor-acolhimento.md). Responda no chat só com o resumo de 5 linhas do relatório.
