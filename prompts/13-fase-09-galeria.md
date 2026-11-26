# Fase 9: Galeria de evolução (fotos)

Sessão 13 de 17 · Tamanho: Pequena · Depende de: Fase 3A

## Antes de começar

1. Leia `AGENTS.md`, `docs/DECISOES.md` e `docs/PROGRESSO.md`.
2. Não leia a especificação inteira. Use só os trechos abaixo; se precisar de outro, busque pelo ID com `grep -n` em `docs/ESPECIFICACAO.md` e leia ao redor.
3. Se `docs/PROGRESSO.md` indicar um ponto de retomada para esta fase, comece dele.
4. Esta sessão mexe na interface: abra `docs/design/guia-de-design.png` (cores, tipografia, componentes e telas de referência) e siga a seção 6 da especificação, em especial as regras de contraste.

## Objetivo

Construir a galeria privada de fotos de progresso, 100% local.

## Escopo desta sessão

- Filtro por ângulo (frente, lado, costas); adicionar foto por câmera ou galeria com `input type=file`, escolhendo ângulo e data.
- Redução da imagem no cliente (lado maior de 1280 px, JPEG qualidade 0,8) e gravação do Blob em `progressPhotos`.
- Comparação lado a lado de duas fotos do mesmo ângulo; excluir com confirmação; botão “Baixar foto”.
- Aviso na tela de que as fotos ficam só no aparelho.
- Chamar `navigator.storage.persist()` depois do onboarding, se ainda não estiver feito.

## Fora desta sessão

- Qualquer envio de foto ao servidor ou inclusão de foto na fila de saída.

## Trechos da especificação

Copiados de `docs/ESPECIFICACAO.md`. Em caso de divergência, vale o documento original.

**8.10 Galeria de evolução (M)**

- **RF-32** Tela com filtro por ângulo: frente, lado, costas. Adicionar foto pela câmera ou pela galeria do aparelho, escolhendo o ângulo e a data. Use `input type="file" accept="image/*"` (com `capture` para a câmera), sem depender de APIs com permissão especial.
- **RF-33** Reduzir a imagem no cliente (lado maior de 1280 px, JPEG com qualidade 0,8) e guardar o Blob na store `progressPhotos` do IndexedDB. A foto nunca é enviada ao servidor.
- **RF-34** Modo de comparação lado a lado de duas fotos do mesmo ângulo, escolhidas pelo usuário.
- **RF-35** Permitir excluir uma foto, com confirmação.
- **RF-36** Avisar na tela que as fotos ficam só neste aparelho, não vão para a conta e se perdem se os dados do navegador forem limpos ou o app for desinstalado. Oferecer o botão “Baixar foto”.
- **Aceite:** nenhuma requisição de rede carrega ou envia fotos (verificar em teste) e a galeria funciona em modo avião.

**Formatação**

- **RF-75 Datas e horas.** Todas as telas usam os formatadores centrais `formatDate`, `formatTime` e `formatRelative`, em `apps/web/src/i18n/format.ts`. É proibido espalhar `toLocaleDateString` ou `format` do date-fns com padrão fixo. Pontos a validar, um a um: histórico (RF-17), edição de registro (RF-18), seletor de data do registro de peso (RF-06), eixos e dicas do gráfico (RF-08), data de conquista dos marcos (RF-15), data da foto na galeria (RF-32), horário e dias do lembrete (RF-37 e RF-42), “Atualizado em” da landing (RF-67) e rótulos “hoje” e “ontem”. O seletor de data usa o `v-date-picker` do Vuetify com o mesmo locale e o primeiro dia da semana do idioma.

- Fotos de progresso nunca saem do aparelho: ficam só no IndexedDB e não são enviadas ao servidor.

## Pronto quando

- Teste prova que nenhuma requisição de rede carrega ou envia fotos, e que a galeria funciona em modo avião.
- Fotos grandes são reduzidas antes de gravar (teste com imagem de 12 MP).
- A fila de saída nunca recebe itens de foto.
- Datas das fotos formatadas pelo idioma ativo.

## Insumos que dependem do dono do projeto

- Nenhum.

## Ao terminar (obrigatório)

1. Rode `npm run lint`, `npm test` e `npm run build`; todos devem passar. Corrija o que falhar antes de seguir.
2. Revise o diff: nada fora do escopo, nenhuma dependência desnecessária, nenhum segredo, nenhum texto fixo em componente.
3. Atualize `docs/PROGRESSO.md` (marque a sessão) e `docs/DECISOES.md` (decisões novas).
4. Escreva `docs/relatorios/13-fase-09-galeria.md` pelo modelo `docs/MODELO_RELATORIO.md` (máximo de 40 linhas).
5. Faça o commit: `fase 9: <resumo curto>`.
6. Pare. Não comece a próxima sessão (prompts/14-fase-10-configuracoes-imc-idioma.md). Responda no chat só com o resumo de 5 linhas do relatório.
