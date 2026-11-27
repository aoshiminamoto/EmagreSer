# Relatório: Fase 9 (Galeria de evolução)
Data: 2026-11-26 · Commit: 9bcb408

## Resumo (3 linhas)
A galeria `/galeria` adiciona fotos por câmera ou galeria, filtra por ângulo, compara duas fotos e exclui com confirmação.
Imagens de 12 MP são reduzidas a 1280 px em JPEG 0,8 no cliente e ficam só no IndexedDB, fora da fila de saída.
O onboarding pede persistência do armazenamento; os três catálogos e os testes cobrem o fluxo sem rede.

## Entregue
- RF-32: filtro frente/lado/costas (mais “Todos”), `input type=file` com `accept="image/*"` e `capture` para câmera, ângulo e data escolhidos no diálogo.
- RF-33: `fitPhotoSize` e `resizePhoto` em `features/fotos/photo.ts`; blob gravado em `progressPhotos`, sem outbox.
- RF-34: comparação lado a lado de duas fotos do mesmo ângulo, com seleção e diálogo próprios.
- RF-35: exclusão com confirmação e aviso do que será apagado.
- RF-36: aviso de que as fotos ficam só no aparelho e botão “Baixar foto” por imagem.
- RF-75: datas das fotos e do diálogo via `formatDate`; seletor Vuetify com locale e primeiro dia da semana do idioma.
- Seção 4.6: `ensurePersistentStorage()` chamada ao concluir o onboarding, best-effort.
- Rota e atalhos para a galeria em “Evolução” e “Mais”.

## Testes
- `npm run lint`, `npm run i18n:check` (246 chaves), `npm test` (229 passando, 45 arquivos) e `npm run build`: ok.
- `npx playwright test e2e/gallery.spec.ts`: 1 passando — JPEG 4000x3000 reduzido a 1280x960, sem requisição HTTP de imagem, filtro e segunda foto em avião, comparação, download e exclusão.
- Suíte e2e completa: 10 passando e 1 falha pré-existente em `conta-onboarding.spec.ts:36` (o seletor “Hoje” também casa com “Hábitos de hoje”, título introduzido na Fase 6); fora do escopo desta sessão.

## Decisões tomadas
- D-74 a D-77 registradas em `docs/DECISOES.md`; nenhuma dependência nova.

## Pendências e adiado
- Corrigir o seletor ambíguo do teste de onboarding da Fase 4A (uma linha, sem relação com fotos).
- Configurações, privacidade completa, IMC e idioma permanecem na Fase 10.

## Riscos e avisos
- Apagar dados do navegador ou desinstalar o app perde as fotos; o download é a única saída.
- A persistência depende do navegador e pode ser recusada sem travar o app; en-US e es-419 seguem rascunho.

## Insumos necessários do dono
- nenhum

## Próxima sessão
- prompts/14-fase-10-configuracoes-imc-idioma.md
