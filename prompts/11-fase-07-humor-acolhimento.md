# Fase 7: Diário de humor e mensagens de acolhimento

Sessão 11 de 17 · Tamanho: Pequena · Depende de: Fases 4B e 5

## Antes de começar

1. Leia `AGENTS.md`, `docs/DECISOES.md` e `docs/PROGRESSO.md`.
2. Não leia a especificação inteira. Use só os trechos abaixo; se precisar de outro, busque pelo ID com `grep -n` em `docs/ESPECIFICACAO.md` e leia ao redor.
3. Se `docs/PROGRESSO.md` indicar um ponto de retomada para esta fase, comece dele.
4. Esta sessão mexe na interface: abra `docs/design/guia-de-design.png` (cores, tipografia, componentes e telas de referência) e siga a seção 6 da especificação, em especial as regras de contraste.

## Objetivo

Construir a escolha de humor após o registro e as mensagens de acolhimento quando o peso sobe.

## Escopo desta sessão

- Escolha opcional e pulável do humor (Feliz, Ansioso, Cansado, Estressado) logo após salvar o peso, gravada em `weight_entries.mood`.
- Mensagem de acolhimento nos casos da RN-05, uma vez por registro, sem repetir a anterior; pelo menos 8 mensagens por idioma (en-US e es-419 como rascunho).
- Integração com o fluxo pós-salvamento da Fase 4B e com a celebração da Fase 5 (se os dois ocorrerem, a celebração vem primeiro).
- (Desejável) distribuição de humores dos últimos 30 dias na tela Evolução.
- Criar `docs/REVISAO_TRADUCOES.md` listando os textos sensíveis que precisam de revisão por falante nativo.

## Fora desta sessão

- Aviso de queda de peso rápida (RN-07) fora do desejável; notificações.

## Trechos da especificação

Copiados de `docs/ESPECIFICACAO.md`. Em caso de divergência, vale o documento original.

**8.8 Diário de humor (M)**

- **RF-27** Opções de humor com emoji e rótulo: Feliz, Ansioso, Cansado, Estressado. Escolha opcional e pulável, apresentada logo após salvar o peso.
- **RF-28 (D)** Na tela de Evolução, mostrar a distribuição de humores dos últimos 30 dias.

**8.9 Mensagens de acolhimento (M)**

- **RF-29** Quando o peso registrado for maior que o registro anterior ou maior que a média móvel anterior (RN-05), exibir um cartão acolhedor explicando que oscilações de líquido são normais e incentivando a continuar.
- **RF-30** Manter pelo menos 8 mensagens diferentes em `src/i18n/``locales/ (pt-BR.json, en-US.json e es-419.json)`, sorteadas sem repetir a anterior. Exemplos de tom:
    - “Seu corpo oscila ao longo da semana, e isso é normal. Retenção de líquido pode mudar o número sem mudar o seu progresso.”
    - “Um dia não define sua jornada. O que conta é a tendência, e você continua firme nela.”
    - “Obrigado por registrar mesmo hoje. Voltar a se cuidar já é uma conquista.”
- **RF-31** Nunca usar linguagem de culpa, punição, “falhou” ou “errou”.

**Regras**

- **RN-05 Detecção de subida.** Há subida quando o peso registrado é maior que o registro imediatamente anterior ou maior que a média móvel calculada sem o novo registro. Em qualquer dos casos, exibir a mensagem de acolhimento uma vez por registro.
- **RN-07 Segurança de linguagem.** O app não define metas de calorias e não faz julgamento de peso corporal. Como medida de cuidado, se a média móvel cair mais de 1% do peso corporal por semana durante 3 semanas seguidas, exibir um aviso gentil sugerindo conversar com um profissional de saúde (desejável, não bloqueante).

**Idioma**

- **RF-79 Hábitos padrão e humor.** Traduzidos a partir da chave, sem gravar texto no banco. O campo `label` só existe em hábitos personalizados.
- **RF-80 Conteúdo sensível.** As mensagens de acolhimento (RF-30, pelo menos 8 por idioma), o aviso de peso-alvo (RN-10), a nota do IMC (RF-61), o texto de consentimento (RF-46) e a política de privacidade exigem revisão por falante nativo antes de o flag de cada idioma sair de `testers`. Registrar data e revisor em `docs/DECISOES.md`.

## Pronto quando

- A mensagem de acolhimento aparece nos casos de RN-05 e nunca repete a anterior (teste com semente fixa).
- Nenhuma mensagem usa linguagem de culpa; aumento de peso não usa vermelho.
- O humor escolhido aparece no histórico e sincroniza.
- `docs/REVISAO_TRADUCOES.md` existe e lista as mensagens de acolhimento dos três idiomas.

## Insumos que dependem do dono do projeto

- Nenhum.

## Ao terminar (obrigatório)

1. Rode `npm run lint`, `npm test` e `npm run build`; todos devem passar. Corrija o que falhar antes de seguir.
2. Revise o diff: nada fora do escopo, nenhuma dependência desnecessária, nenhum segredo, nenhum texto fixo em componente.
3. Atualize `docs/PROGRESSO.md` (marque a sessão) e `docs/DECISOES.md` (decisões novas).
4. Escreva `docs/relatorios/11-fase-07-humor-acolhimento.md` pelo modelo `docs/MODELO_RELATORIO.md` (máximo de 40 linhas).
5. Faça o commit: `fase 7: <resumo curto>`.
6. Pare. Não comece a próxima sessão (prompts/12-fase-08-lembretes-push.md). Responda no chat só com o resumo de 5 linhas do relatório.
