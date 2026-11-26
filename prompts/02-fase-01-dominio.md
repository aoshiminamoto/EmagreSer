# Fase 1: Domínio puro (regras de negócio)

Sessão 2 de 17 · Tamanho: Média · Depende de: Fase 0

## Antes de começar

1. Leia `AGENTS.md`, `docs/DECISOES.md` e `docs/PROGRESSO.md`.
2. Não leia a especificação inteira. Use só os trechos abaixo; se precisar de outro, busque pelo ID com `grep -n` em `docs/ESPECIFICACAO.md` e leia ao redor.
3. Se `docs/PROGRESSO.md` indicar um ponto de retomada para esta fase, comece dele.

## Objetivo

Implementar em `packages/domain` todas as regras de negócio como funções puras, com testes unitários.

## Escopo desta sessão

- Média móvel (RN-01), peso de referência (RN-02), marcos (RN-03), progresso (RN-04), subida de peso (RN-05) e streak (RN-06, com RF-20 a RF-22).
- IMC e faixas (RN-09), peso mínimo e aviso de peso-alvo (RN-10).
- Classificação de dispositivo como função pura que recebe os sinais do navegador (RN-11).
- Resolução de idioma como função pura que recebe preferências e flags (RN-15).
- `parseDecimal` (vírgula ou ponto, RN-16) e helpers de data de calendário `YYYY-MM-DD` (dia civil, diferença de dias).
- Tipos TypeScript exportados para as entidades (peso, marco, hábito, etc.).

## Fora desta sessão

- Vue, rede, IndexedDB, telas. Nada fora de `packages/domain` (exceto ajustes de configuração).

## Trechos da especificação

Copiados de `docs/ESPECIFICACAO.md`. Em caso de divergência, vale o documento original.

**Regras de negócio**

- **RN-01 Média móvel de 7 dias.** Para cada data D com registro, a média é a média aritmética dos pesos registrados nos 7 dias de calendário terminados em D (D−6 até D). Dias sem registro são ignorados, sem preenchimento. A média existe se houver ao menos 1 registro na janela. Arredondar para 1 casa apenas na exibição.
- **RN-02 Peso atual de referência.** Para o progresso e os marcos, usar o **peso mais recente registrado** (não a média), para que a conquista seja percebida de forma concreta. A média é usada apenas no gráfico e nas comparações de tendência.
- **RN-03 Geração de marcos.** Dado peso inicial P, peso-alvo A e passo S, os marcos são P−S, P−2S, P−3S… enquanto o valor for maior que A, e o último marco é sempre A. Exemplo: P=90, A=80, S=4 gera 86, 82, 80. Um marco é considerado alcançado quando algum peso registrado for menor ou igual a ele.
- **RN-04 Progresso.** Percentual até a meta final = (P − peso atual) ÷ (P − A), limitado entre 0% e 100%.
- **RN-05 Detecção de subida.** Há subida quando o peso registrado é maior que o registro imediatamente anterior ou maior que a média móvel calculada sem o novo registro. Em qualquer dos casos, exibir a mensagem de acolhimento uma vez por registro.
- **RN-06 Streak.** Conforme RF-20 a RF-22. Calcular a partir da união das datas com qualquer ação registrada.
- **RN-09 IMC.** IMC = peso (kg) ÷ altura (m)², com o peso mais recente registrado (RN-02), arredondado a 1 casa só na exibição. A faixa segue a tabela abaixo (adultos) e é sempre exibida junto da nota do RF-61. O app não usa idade nem sexo no cálculo.
- **RN-10 Aviso de peso-alvo.** Com a altura informada, o peso mínimo da faixa de peso adequado é 18,5 × altura (m)². Se o peso-alvo for menor que isso, exibir o aviso do RF-64: “Esse peso-alvo está abaixo da faixa considerada saudável para a sua altura. Vale conversar com um profissional de saúde antes de seguir com ele.” O aviso não impede o usuário de continuar.
- **RN-11 Detecção de dispositivo (móvel ou desktop).** A classificação acontece uma única vez, no carregamento inicial da PWA, antes de montar qualquer tela (script síncrono em `main.ts`, sem esperar rede nem IndexedDB). Sinais usados, nesta ordem:
    - `navigator.userAgentData.mobile`, quando existir (navegadores Chromium);
    - User Agent com `Android`, `iPhone`, `iPad`, `iPod` ou `Mobile`;
    - iPadOS que se identifica como Mac: User Agent com `Macintosh` e `navigator.maxTouchPoints > 1`;
    - viewport e ponteiro, só como desempate quando os sinais acima forem inconclusivos: `matchMedia('(pointer: coarse) and (hover: none)')` verdadeiro.
    - A largura da janela, sozinha, nunca classifica um aparelho como móvel: uma janela estreita de desktop continua sendo desktop. Tablets contam como dispositivo móvel. O resultado é recalculado a cada carregamento e não é gravado.
- **RN-15 Resolução do idioma.** O idioma efetivo é o primeiro disponível, segundo os flags, nesta ordem: (1) `user_settings.locale`; (2) a escolha feita antes do login, guardada em `meta.localePref`; (3) o idioma do navegador (`navigator.languages`: prefixo `pt` para pt-BR, `en` para en-US, `es` para es-419); (4) pt-BR. A preferência salva pelo usuário é mantida mesmo que o flag seja desligado: nesse caso o app mostra pt-BR e volta ao idioma escolhido quando o flag for religado. Trocar de idioma aplica a mudança na hora, sem recarregar, atualiza `html lang` e sincroniza o novo `locale`.
- **RN-16 Cálculo e formatação independentes.** Datas, horas e números só são formatados na camada de apresentação, com `Intl`; as regras RN-01 a RN-10 nunca dependem do idioma. Campos numéricos aceitam vírgula ou ponto em qualquer idioma (se houver os dois símbolos, o último é o decimal) e o valor é normalizado antes de validar e gravar. Datas nunca são digitadas em texto livre: usar seletor.

Faixas do IMC para adultos (RN-09):

| IMC | Rótulo no app |
|---|---|
| Menor que 18,5 | Abaixo do peso |
| 18,5 a 24,9 | Peso adequado |
| 25,0 a 29,9 | Sobrepeso |
| 30,0 a 34,9 | Obesidade grau I |
| 35,0 a 39,9 | Obesidade grau II |
| 40,0 ou mais | Obesidade grau III |

**Streak**

- **RF-20** Exibir na tela Hoje um selo com o número de dias seguidos e o recorde pessoal.
- **RF-21** Um dia é “ativo” se houver ao menos uma ação: peso registrado, hábito marcado, copo de água adicionado ou humor registrado.
- **RF-22** Regra de continuidade: se hoje ainda não é ativo mas ontem foi, o streak atual é mantido até o fim do dia de hoje; o streak só zera quando passa um dia inteiro sem ação.

## Pronto quando

- Os testes cobrem média móvel (janela de 7 dias, dias sem registro, um único registro), marcos (inclusive o exemplo P=90, A=80, S=4), progresso nos limites 0% e 100%, e subida de peso pelos dois critérios.
- Streak: virada de dia, dia atual ainda sem ação, dias perdidos, edição retroativa e streak de 0 dias.
- IMC: todas as faixas e os limites entre elas; aviso de peso-alvo no limite exato de 18,5.
- Classificação de dispositivo com User Agents de Android, iPhone, iPad, iPadOS que se identifica como Mac, Chrome, Firefox e Safari de desktop, e janela estreita de desktop.
- Resolução de idioma na ordem da RN-15, inclusive com flag desligado e preferência salva.
- `packages/domain` não importa Vue, DOM, fetch nem IndexedDB.

## Insumos que dependem do dono do projeto

- Nenhum.

## Ao terminar (obrigatório)

1. Rode `npm run lint`, `npm test` e `npm run build`; todos devem passar. Corrija o que falhar antes de seguir.
2. Revise o diff: nada fora do escopo, nenhuma dependência desnecessária, nenhum segredo, nenhum texto fixo em componente.
3. Atualize `docs/PROGRESSO.md` (marque a sessão) e `docs/DECISOES.md` (decisões novas).
4. Escreva `docs/relatorios/02-fase-01-dominio.md` pelo modelo `docs/MODELO_RELATORIO.md` (máximo de 40 linhas).
5. Faça o commit: `fase 1: <resumo curto>`.
6. Pare. Não comece a próxima sessão (prompts/03-fase-02a-backend-auth.md). Responda no chat só com o resumo de 5 linhas do relatório.
