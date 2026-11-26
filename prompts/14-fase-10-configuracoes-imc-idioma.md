# Fase 10: Configurações, privacidade, IMC e idioma

Sessão 14 de 17 · Tamanho: Grande · Depende de: Fases 2B, 5 e 8

## Antes de começar

1. Leia `AGENTS.md`, `docs/DECISOES.md` e `docs/PROGRESSO.md`.
2. Não leia a especificação inteira. Use só os trechos abaixo; se precisar de outro, busque pelo ID com `grep -n` em `docs/ESPECIFICACAO.md` e leia ao redor.
3. Se `docs/PROGRESSO.md` indicar um ponto de retomada para esta fase, comece dele.
4. Esta sessão mexe na interface: abra `docs/design/guia-de-design.png` (cores, tipografia, componentes e telas de referência) e siga a seção 6 da especificação, em especial as regras de contraste.

## Objetivo

Construir a tela de Configurações completa, a página de privacidade, o cartão de IMC e o seletor de idioma. Se a sessão ficar grande, divida em 10a (configurações, privacidade, exportação e exclusão) e 10b (IMC e idioma).

## Escopo desta sessão

- Configurações: nome, peso-alvo, passo das metas, lembrete (reutilizando o fluxo da Fase 8), meta de água e tamanho do copo; alterações sincronizam.
- Aviso de peso-alvo abaixo da faixa (RN-10), sem bloquear e sem revelar o IMC quando oculto.
- Página pública “Sobre e privacidade” (acessível sem login), versão do app e aviso de que o app não substitui acompanhamento profissional.
- Exportar meus dados (JSON e CSV, pela API da Fase 2B) e excluir minha conta (dupla confirmação, senha, limpeza total do aparelho).
- Seção “IMC”: altura, interruptor “Mostrar IMC” (desabilitado sem altura), “Apagar meus dados de IMC”; cartão de IMC na tela Evolução com faixa e nota neutra, ícone de olho para ocultar.
- Seção “Idioma” em Configurações, usando o componente da Fase 4A; troca na hora, atualiza `html lang` e sincroniza o `locale`.

## Fora desta sessão

- Landing de desktop, deploy.

## Trechos da especificação

Copiados de `docs/ESPECIFICACAO.md`. Em caso de divergência, vale o documento original.

**8.12 Configurações (M)**

- **RF-42** Editar nome, peso-alvo, passo das metas, lembrete (ativo, horário, dias), meta de água e tamanho do copo. As alterações sincronizam. Os dados e a visibilidade do IMC ficam na seção própria (RF-59 e RF-62).
- **RF-43** Tela “Sobre e privacidade” em linguagem simples: quais dados ficam na conta (peso, hábitos, água, humor, configurações e, se informados, os dados do IMC), que as fotos ficam só no aparelho, que nada é vendido ou compartilhado e que não há analytics de terceiros, e que a página pública de apresentação mostra apenas totais anônimos. Mostrar também a versão do app e o aviso de que o app não substitui acompanhamento de profissionais de saúde.
- **RF-44** “Exportar meus dados” em JSON e CSV, a partir de `GET /me/export`, entregue pelo compartilhamento do navegador. Atende ao direito de portabilidade da LGPD.
- **RF-45** “Excluir minha conta e todos os meus dados” com confirmação dupla e senha. `DELETE /me` apaga usuário, registros, sessões e inscrições de push no servidor; em seguida o app limpa IndexedDB, fotos e caches. Sem internet, avisar que a exclusão exige conexão.

**8.15 IMC opcional e oculto por padrão (M)**

O IMC é uma referência opcional. Nada relacionado a ele aparece no app até a pessoa informar a altura e ligar o interruptor “Mostrar IMC”. Os campos novos (altura e visibilidade do IMC) ficam em `user_settings` (seção 7) e sincronizam como as demais configurações.

- **RF-56** Tela opcional do onboarding, depois do peso-alvo. Título: “Quer acompanhar o seu IMC?”. Texto: “Para calcular o IMC, precisamos apenas da sua altura. É opcional: você pode pular agora e informar depois, em Configurações.” Campo: altura em cm. Interruptor “Mostrar o IMC no app”, desligado por padrão. Botões “Pular” e “Salvar”. Pular não grava nada e não bloqueia nenhuma outra função.
- **RF-57** Validação: altura entre 100 e 250 cm. O app não coleta idade, data de nascimento nem sexo biológico.
- **RF-58** O IMC só é calculado quando há altura informada (RN-09). Sem altura, nenhuma tela menciona IMC, exceto a seção “IMC” em Configurações, que convida a informar a altura.
- **RF-59** Visibilidade: o IMC fica oculto por padrão em todo o app. O interruptor “Mostrar IMC” fica em Configurações, na seção “IMC”, e permanece desabilitado enquanto faltar a altura, com um texto dizendo o que falta. Desligar o interruptor esconde o IMC de imediato em todas as telas, sem apagar a altura.
- **RF-60** Com o IMC visível, mostrar um cartão “IMC” na tela Evolução: valor atual com 1 casa decimal, a faixa (tabela da RN-09) e o IMC do início da jornada. O cartão tem um ícone de olho para ocultar rapidamente. O IMC não aparece nas telas Hoje, Metas e Histórico.
- **RF-61** O cartão traz sempre esta nota neutra: “O IMC é uma referência geral para adultos. Ele não considera massa muscular, idade ou distribuição de gordura, e as faixas não se aplicam a menores de 18 anos nem são ideais a partir dos 60. Converse com um profissional de saúde para interpretá-lo.” Nunca usar vermelho nem linguagem de julgamento; as faixas usam as cores do tema, sem sinal de alerta.
- **RF-62** Na seção “IMC” de Configurações é possível editar a altura e usar “Apagar meus dados de IMC”, que limpa a altura, desliga o interruptor e sincroniza a mudança.
- **RF-63** Como o app não pergunta a idade, a faixa é a de adultos e vem sempre acompanhada da nota do RF-61. Nenhuma tela nem regra presume a idade da pessoa; o público do app é adulto (seção 3).
- **RF-64** Aviso de peso-alvo (RN-10): ao definir ou editar o peso-alvo, se ele ficar abaixo da faixa de peso adequado para a altura informada, mostrar um aviso gentil, sem bloquear e sem revelar o número do IMC quando ele estiver oculto.
- **Aceite:** com o interruptor desligado, nenhuma tela, notificação ou mensagem exibe IMC; pular a tela do onboarding não deixa nenhum dado gravado; apagar os dados de IMC remove a altura no aparelho e no servidor; os testes cobrem todas as faixas e os limites entre elas.

Faixas do IMC para adultos (RN-09):

| IMC | Rótulo no app |
|---|---|
| Menor que 18,5 | Abaixo do peso |
| 18,5 a 24,9 | Peso adequado |
| 25,0 a 29,9 | Sobrepeso |
| 30,0 a 34,9 | Obesidade grau I |
| 35,0 a 39,9 | Obesidade grau II |
| 40,0 ou mais | Obesidade grau III |

**Idioma e exportação**

- **RF-74 Seletor de idioma.** Em Configurações, seção “Idioma”, e nas telas de login e cadastro (a escolha fica em meta.localePref). Só aparece quando há dois ou mais idiomas disponíveis. Os nomes aparecem no próprio idioma (Português, English, Español). A troca vale na hora.
- **RF-82 Exportação.** Cabeçalhos do CSV no idioma ativo; datas em ISO 8601 e números com ponto decimal.

**Regras**

- **RN-09 IMC.** IMC = peso (kg) ÷ altura (m)², com o peso mais recente registrado (RN-02), arredondado a 1 casa só na exibição. A faixa segue a tabela abaixo (adultos) e é sempre exibida junto da nota do RF-61. O app não usa idade nem sexo no cálculo.
- **RN-10 Aviso de peso-alvo.** Com a altura informada, o peso mínimo da faixa de peso adequado é 18,5 × altura (m)². Se o peso-alvo for menor que isso, exibir o aviso do RF-64: “Esse peso-alvo está abaixo da faixa considerada saudável para a sua altura. Vale conversar com um profissional de saúde antes de seguir com ele.” O aviso não impede o usuário de continuar.
- **RN-15 Resolução do idioma.** O idioma efetivo é o primeiro disponível, segundo os flags, nesta ordem: (1) `user_settings.locale`; (2) a escolha feita antes do login, guardada em `meta.localePref`; (3) o idioma do navegador (`navigator.languages`: prefixo `pt` para pt-BR, `en` para en-US, `es` para es-419); (4) pt-BR. A preferência salva pelo usuário é mantida mesmo que o flag seja desligado: nesse caso o app mostra pt-BR e volta ao idioma escolhido quando o flag for religado. Trocar de idioma aplica a mudança na hora, sem recarregar, atualiza `html lang` e sincroniza o novo `locale`.
- **RN-16 Cálculo e formatação independentes.** Datas, horas e números só são formatados na camada de apresentação, com `Intl`; as regras RN-01 a RN-10 nunca dependem do idioma. Campos numéricos aceitam vírgula ou ponto em qualquer idioma (se houver os dois símbolos, o último é o decimal) e o valor é normalizado antes de validar e gravar. Datas nunca são digitadas em texto livre: usar seletor.

## Pronto quando

- Aceite de 8.12 e 8.15 passa: com o interruptor desligado, nenhuma tela, notificação ou mensagem exibe IMC.
- Excluir a conta remove tudo no servidor e no aparelho (fotos, caches, inscrições de push).
- Exportar entrega todos os dados do usuário; o CSV usa o idioma ativo.
- Trocar de idioma muda todos os textos e formatos na hora, sem recarregar; com os flags em `off`, o seletor não aparece.

## Insumos que dependem do dono do projeto

- Nenhum.

## Ao terminar (obrigatório)

1. Rode `npm run lint`, `npm test` e `npm run build`; todos devem passar. Corrija o que falhar antes de seguir.
2. Revise o diff: nada fora do escopo, nenhuma dependência desnecessária, nenhum segredo, nenhum texto fixo em componente.
3. Atualize `docs/PROGRESSO.md` (marque a sessão) e `docs/DECISOES.md` (decisões novas).
4. Escreva `docs/relatorios/14-fase-10-configuracoes-imc-idioma.md` pelo modelo `docs/MODELO_RELATORIO.md` (máximo de 40 linhas).
5. Faça o commit: `fase 10: <resumo curto>`.
6. Pare. Não comece a próxima sessão (prompts/15-fase-11a-dispositivo-landing.md). Responda no chat só com o resumo de 5 linhas do relatório.
