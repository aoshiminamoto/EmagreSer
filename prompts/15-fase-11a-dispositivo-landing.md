# Fase 11A: Detecção de dispositivo, landing de desktop e instalação

Sessão 15 de 17 · Tamanho: Média · Depende de: Fases 1, 2A e 10

## Antes de começar

1. Leia `AGENTS.md`, `docs/DECISOES.md` e `docs/PROGRESSO.md`.
2. Não leia a especificação inteira. Use só os trechos abaixo; se precisar de outro, busque pelo ID com `grep -n` em `docs/ESPECIFICACAO.md` e leia ao redor.
3. Se `docs/PROGRESSO.md` indicar um ponto de retomada para esta fase, comece dele.
4. Esta sessão mexe na interface: abra `docs/design/guia-de-design.png` (cores, tipografia, componentes e telas de referência) e siga a seção 6 da especificação, em especial as regras de contraste.

## Objetivo

Separar o acesso móvel do desktop, construir a landing de apresentação e o banner de instalação.

## Escopo desta sessão

- Integrar a função de classificação (RN-11) no carregamento inicial, antes de montar o app, com o bypass `VITE_ALLOW_DESKTOP` só em desenvolvimento e teste.
- Fluxo móvel: ignorar a landing (código em chunk separado, não baixado), registrar o service worker e capturar `beforeinstallprompt` no carregamento, mostrar o banner depois do onboarding, respeitando o intervalo de 14 dias e o modo instalado; aviso manual no iOS.
- Fluxo desktop: landing em qualquer rota, sem service worker, sem IndexedDB, sem chamadas a `/auth` ou `/sync`; links de recuperação de senha mostram orientação para abrir no celular.
- Landing com as quatro seções obrigatórias: alerta com QR Code gerado no cliente (biblioteca empacotada), resumo de funcionalidades, dados de uso e prova social.
- Rota `GET /public/stats` com limite por IP, cache de 15 min no Redis e a regra de mínimo de contas (`PUBLIC_STATS_MIN_USERS`).
- Textos, `title`, `description` e Open Graph da landing nos idiomas disponíveis.

## Fora desta sessão

- Deploy e polimento geral (Fase 11B).

## Trechos da especificação

Copiados de `docs/ESPECIFICACAO.md`. Em caso de divergência, vale o documento original.

**Regras de acesso**

- **RN-11 Detecção de dispositivo (móvel ou desktop).** A classificação acontece uma única vez, no carregamento inicial da PWA, antes de montar qualquer tela (script síncrono em `main.ts`, sem esperar rede nem IndexedDB). Sinais usados, nesta ordem:
    - `navigator.userAgentData.mobile`, quando existir (navegadores Chromium);
    - User Agent com `Android`, `iPhone`, `iPad`, `iPod` ou `Mobile`;
    - iPadOS que se identifica como Mac: User Agent com `Macintosh` e `navigator.maxTouchPoints > 1`;
    - viewport e ponteiro, só como desempate quando os sinais acima forem inconclusivos: `matchMedia('(pointer: coarse) and (hover: none)')` verdadeiro.
    - A largura da janela, sozinha, nunca classifica um aparelho como móvel: uma janela estreita de desktop continua sendo desktop. Tablets contam como dispositivo móvel. O resultado é recalculado a cada carregamento e não é gravado.
- **RN-12 Fluxo móvel (acesso permitido).** Em dispositivo móvel a landing page é ignorada: o app é carregado direto e o código da landing nem é baixado. A rota inicial segue as regras de acesso: sessão válida e `onboarding_done` verdadeiro abrem a tela Hoje; sem sessão, abre o login ou o cadastro; com sessão e sem onboarding, abre o onboarding. No navegador móvel (fora do modo instalado), o app trata o evento `beforeinstallprompt`:
    - o listener é registrado no carregamento inicial, antes de montar o app, para não perder o evento; o evento é guardado e `preventDefault()` é chamado;
    - o convite é um banner próprio (`v-banner` ou `v-snackbar`), mostrado só depois de concluído o onboarding, nunca durante o cadastro ou o onboarding nem sobre a tela de registro de peso;
    - o botão “Instalar” chama `prompt()` a partir de um gesto do usuário, o resultado de `userChoice` é tratado e o evento `appinstalled` esconde o banner;
    - se o usuário dispensar, o banner não volta por 14 dias (data guardada na store `meta` do IndexedDB);
    - não mostrar quando o app já roda instalado (`matchMedia('(display-mode: standalone)')` ou `navigator.standalone`);
    - em navegadores sem esse evento (Safari no iOS), mostrar o aviso manual de instalação da seção 4.6;
    - o registro do service worker e a captura de `beforeinstallprompt` existem apenas no fluxo móvel.
- **RN-13 Fluxo desktop (bloqueio e landing page).** Em dispositivo não móvel, a pessoa fica retida na landing page de apresentação (seção 8.16), em qualquer rota (`/`, rotas internas, links diretos). Os links de recuperação de senha abertos no desktop também mostram a landing, com a orientação de abrir o e-mail no celular. Exceção: a página pública “Sobre e privacidade”. Na landing não há service worker, IndexedDB, login nem chamadas a `/auth` ou `/sync`; a única chamada de rede é `GET /public/stats`. O bloqueio é uma regra de experiência e não de segurança: a API continua aceitando requisições de qualquer cliente e nenhuma rota do servidor depende da classificação. Para desenvolvimento e testes existe o bypass `VITE_ALLOW_DESKTOP=true`, aceito apenas em builds de desenvolvimento e de teste e verificado como desligado no build de produção (CI). Os testes Playwright usam emulação de dispositivo móvel.
- **RN-14 Dados públicos agregados.** Os números da landing são totais anônimos: nunca expõem dados individuais (e-mail, nome, peso ou data de um usuário) nem valores de peso ou de perda de peso. Definições: usuários ativos são as contas com `last_seen_at` nos últimos 30 dias; usuários cadastrados são todas as contas; registros de peso são as linhas não excluídas de `weight_entries` (só a contagem); hábitos concluídos são as linhas não excluídas de `habit_logs` com `done` verdadeiro; copos de água são a soma de `water_logs.glasses` das linhas não excluídas. Nenhum número é inventado, fixo no código ou arredondado para cima. Abaixo do mínimo de `PUBLIC_STATS_MIN_USERS` contas cadastradas (variável de ambiente, padrão 50), o servidor não envia os números e a landing mostra “Estamos começando agora. Seja uma das primeiras pessoas a usar o EmagreSer.”. Se a rota falhar, a seção de números simplesmente não aparece (nunca exibir zero).

**8.16 Landing page de apresentação para desktop (M)**

Histórias de usuário:

- Como pessoa que abriu o EmagreSer em um computador, quero entender que o app é de uso exclusivo em celulares e como acessá-lo, para continuar no aparelho certo.
- Como visitante, quero ver o que o app oferece e quantas pessoas já o usam, para decidir se vale instalar.

A landing é exibida conforme RN-13 e atende à estrutura STRU-01, com as quatro seções obrigatórias abaixo.

- **RF-65 Alerta de restrição.** Seção no topo, visível sem rolar a página. Título: “O EmagreSer é de uso exclusivo em celulares e tablets.” Texto: “Aponte a câmera do celular para o QR Code ou abra o endereço abaixo no navegador do seu celular.” Inclui um QR Code gerado no cliente, em SVG, por biblioteca empacotada no build (por exemplo `qrcode`), sem serviço externo; o QR aponta sempre para a raiz de `APP_ORIGIN`. Mostra também o endereço em texto e o botão “Copiar link”. O alerta usa o estilo informativo do tema (superfície branca com contorno e ícone de informação), nunca vermelho nem laranja.
- **RF-66 Resumo de funcionalidades.** Grade de cartões (`v-card`, ícones `@mdi/font` e ilustrações suaves, sem fotos de corpos) com: registro de peso e gráfico de tendência com média móvel; metas parciais com recompensas; hábitos e contador de água; diário de humor; fotos de evolução privadas; lembretes diários; funciona offline e sincroniza; IMC opcional e oculto por padrão. Os textos ficam em `locales/ (pt-BR.json, en-US.json e es-419.json)`.
- **RF-67 Dados de uso do app.** Seção com indicadores agregados de `GET /public/stats`: registros de peso, hábitos concluídos e copos de água registrados, formatados no idioma resolvido (`Intl.NumberFormat`) e acompanhados de “Atualizado em” com data e hora. Nenhuma métrica de peso perdido.
- **RF-68 Prova social e métricas de comunidade.** Bloco em destaque, logo após o alerta de restrição: número de usuários ativos nos últimos 30 dias, em tamanho grande, e total de usuários cadastrados como informação secundária, sempre conforme RN-14. Sem depoimentos nem logotipos inventados.
- **RF-69 Estrutura geral.** Cabeçalho com logo e slogan; rodapé com link para a página pública “Sobre e privacidade” e versão do app. Sem botão de entrar e sem formulário de cadastro.
- **RF-70 Carregamento.** A landing é um chunk separado, carregado sob demanda. Ela renderiza primeiro e só depois chama `GET /public/stats`, com `v-skeleton-loader` enquanto espera; a página continua útil sem os números. Metadados `title`, `description` e Open Graph definidos.
- **RF-71 Rota ****`GET /public/stats`****.** Sem login, com limite de requisições por IP no Redis, sem parâmetros. Resposta: `{ activeUsers30d, totalUsers, weightEntries, habitsCompleted, waterGlasses, updatedAt }` ou `{ belowThreshold: true }` quando valer a regra do mínimo (RN-14). Resultado em cache no Redis por 15 minutos e cabeçalho `Cache-Control: public, max-age=300`.
- **RF-72 Acessibilidade.** Contraste AA, landmarks semânticos, navegação por teclado, QR Code com `aria-label` e endereço em texto como alternativa.
- **Aceite:** em desktop, nenhuma tela do app é renderizada, o service worker não é registrado e a landing mostra as quatro seções; em celular e tablet a landing nunca é exibida nem baixada; no Chrome para Android o banner de instalação aparece depois do onboarding e respeita o intervalo de 14 dias; sem rede, ou com a rota falhando, a landing continua mostrando alerta e funcionalidades; os testes cobrem a classificação (RN-11) com User Agents de Android, iPhone, iPad, iPadOS que se identifica como Mac, Chrome, Firefox e Safari de desktop e janela estreita de desktop.

Rota pública adicional, sem login: `GET /public/stats`, com totais anônimos para a landing page de desktop (seção 8.16). O campo `last_seen_at` do usuário é atualizado em `/auth/refresh` e em `/sync/push`, no máximo uma vez por dia.

**4.6 Requisitos específicos de PWA**

- Manifest: `name` EmagreSer, `short_name`, `display: standalone`, `lang: pt-BR`, `start_url: /`, `theme_color` #22C55E (token primary), `background_color` `#F8FAFC`, ícones de 192 e 512 px e um ícone maskable de 512 px.
- Service worker com `strategies: 'injectManifest'` no `vite-plugin-pwa`, em `apps/web/src/sw.ts`, porque o app precisa de código próprio para os eventos `push` e `notificationclick`. O arquivo contém apenas: `precacheAndRoute(self.__WB_MANIFEST)`, `cleanupOutdatedCaches()`, uma `NavigationRoute` para `index.html` com `denylist: [/^\/api\//]`, `clientsClaim()`, o handler da mensagem `SKIP_WAITING` (sem `skipWaiting()` automático) e os handlers de push. Sem `runtimeCaching` para a API e sem `BackgroundSyncPlugin`: a sincronização é a da seção 4.5.
- Versões: fixe `vite-plugin-pwa` 2.x e `workbox-build` e `workbox-window` 7.4.x no `package.json`, e só atualize com os testes de PWA passando.
- Push: o formato das mensagens é o Declarative Web Push (seção 8.11). O handler `push` continua obrigatório para Chrome e Firefox e sempre deve chamar `showNotification`; se não mostrar nada, o navegador pode revogar a inscrição.
- Chame `navigator.storage.persist()` depois do onboarding, para reduzir o risco de o navegador apagar o IndexedDB (onde ficam as fotos).
- No iOS, o Web Push só funciona com o app instalado pela Tela de Início (iOS 16.4 ou superior). Mostre um aviso dispensável com o passo a passo (Compartilhar, depois Adicionar à Tela de Início).
- Teste o service worker sempre no build de produção (`vite build` e `vite preview`). Lighthouse: app instalável e funcionando offline após o primeiro carregamento.

**Idioma**

- **RF-81 Landing e metadados.** Textos, `title`, `description`, Open Graph e números da landing seguem o idioma resolvido (sem login valem os passos 2 a 4 da RN-15, apenas com flags no estado `on`).

## Pronto quando

- Aceite de 8.16 passa: em desktop nenhuma tela do app é renderizada e o service worker não é registrado; em celular e tablet a landing nunca é exibida nem baixada.
- No Chrome para Android, o banner aparece depois do onboarding e respeita o intervalo de 14 dias.
- `/public/stats` devolve só totais anônimos; abaixo do mínimo, nenhum número é enviado; com a rota falhando, a landing continua útil.
- Os testes Playwright usam emulação de dispositivo móvel e cobrem o bloqueio de desktop.

## Insumos que dependem do dono do projeto

- Nenhum.

## Ao terminar (obrigatório)

1. Rode `npm run lint`, `npm test` e `npm run build`; todos devem passar. Corrija o que falhar antes de seguir.
2. Revise o diff: nada fora do escopo, nenhuma dependência desnecessária, nenhum segredo, nenhum texto fixo em componente.
3. Atualize `docs/PROGRESSO.md` (marque a sessão) e `docs/DECISOES.md` (decisões novas).
4. Escreva `docs/relatorios/15-fase-11a-dispositivo-landing.md` pelo modelo `docs/MODELO_RELATORIO.md` (máximo de 40 linhas).
5. Faça o commit: `fase 11A: <resumo curto>`.
6. Pare. Não comece a próxima sessão (prompts/16-fase-11b-deploy-polimento.md). Responda no chat só com o resumo de 5 linhas do relatório.
