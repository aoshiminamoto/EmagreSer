# Fase 4A: Telas de conta e onboarding

Sessão 7 de 17 · Tamanho: Grande · Depende de: Fases 2A e 3B

## Antes de começar

1. Leia `AGENTS.md`, `docs/DECISOES.md` e `docs/PROGRESSO.md`.
2. Não leia a especificação inteira. Use só os trechos abaixo; se precisar de outro, busque pelo ID com `grep -n` em `docs/ESPECIFICACAO.md` e leia ao redor.
3. Se `docs/PROGRESSO.md` indicar um ponto de retomada para esta fase, comece dele.
4. Esta sessão mexe na interface: abra `docs/design/guia-de-design.png` (cores, tipografia, componentes e telas de referência) e siga a seção 6 da especificação, em especial as regras de contraste.

## Objetivo

Construir as telas de cadastro, login, recuperação de senha e onboarding, e as regras de rota inicial.

## Escopo desta sessão

- Telas de cadastro (com a caixa de consentimento desmarcada por padrão), login, “esqueci a senha” e redefinição.
- Sessão persistente de até 30 dias de inatividade; saída com aviso de pendências na fila de saída e das fotos que serão apagadas.
- Rota inicial: sem sessão abre login ou cadastro; com sessão e `onboarding_done` falso abre o onboarding; com sessão e onboarding feito abre a tela Hoje (tela mínima por enquanto).
- Onboarding de 5 telas, incluindo a tela opcional do IMC (altura, interruptor “Mostrar o IMC” desligado, botão Pular) e a do horário do lembrete (apenas grava as configurações; a permissão de notificação fica para a Fase 8).
- Ao concluir: gravar o peso inicial, o fuso do aparelho, gerar os marcos e criar os três hábitos padrão (seed).
- Componente de seletor de idioma nas telas de login e cadastro, visível só com 2 ou mais idiomas disponíveis (a entrada em Configurações vem na Fase 10).
- Todos os textos nos três catálogos.

## Fora desta sessão

- Banner de instalação e landing (Fase 11A), cartão de IMC (Fase 10), permissão de push (Fase 8).

## Trechos da especificação

Copiados de `docs/ESPECIFICACAO.md`. Em caso de divergência, vale o documento original.

**Onboarding**

- **RF-01** Depois do cadastro ou do login, enquanto onboarding_done for falso, exibir 5 telas curtas: boas-vindas e slogan; peso atual; peso-alvo e passo das metas parciais (opções 1, 2, 3 ou 5 kg, padrão 2); altura para o IMC (opcional, RF-56); horário do lembrete diário (pode ser pulado).
- **RF-02** Nome é opcional. Validar que o peso-alvo é menor que o peso atual.
- **RF-03** Ao concluir, gravar o peso atual como primeiro registro, gravar o fuso horário do aparelho em timezone (atualizado quando mudar), gerar os marcos (RN-03) e marcar `onboarding_done`.

- **Aceite:** reabrir o app depois do onboarding vai direto para a tela Hoje; fechar e abrir no meio do onboarding recomeça do passo 1 sem dados corrompidos; pular a tela do IMC não impede concluir o onboarding.

**Conta e autenticação**

- **RF-46** Cadastro com e-mail, senha (mínimo de 8 caracteres) e uma caixa de consentimento obrigatória, desmarcada por padrão, que explica o tratamento de dados de saúde (peso, hábitos, humor e, se o usuário optar, altura para o IMC) para o funcionamento do app, com link para a tela de privacidade. Guardar a data em `consent_at`.
- **RF-47** Login com e-mail e senha. Erros genéricos (“E-mail ou senha incorretos”), sem revelar se o e-mail existe, e com limite de tentativas (seção 4.4).
- **RF-48** Sessão persistente: o usuário continua conectado por até 30 dias de inatividade (validade do refresh token, renovada a cada uso).
- **RF-49** Recuperação de senha por e-mail, com link de uso único válido por 30 minutos e resposta idêntica exista ou não o e-mail. Trocar a senha encerra todas as sessões.
- **RF-50** Ao sair, apagar os dados locais do usuário. Se houver pendências na fila de saída, avisar e oferecer sincronizar antes. Como as fotos de evolução existem só no aparelho, avisar que elas serão apagadas e oferecer baixá-las antes de sair.
- **RF-51 (D)** Trocar a senha com o usuário logado.

- **Aceite:** depois do primeiro login, fechar e reabrir o app em modo avião leva direto à tela Hoje.

**IMC no onboarding**

- **RF-56** Tela opcional do onboarding, depois do peso-alvo. Título: “Quer acompanhar o seu IMC?”. Texto: “Para calcular o IMC, precisamos apenas da sua altura. É opcional: você pode pular agora e informar depois, em Configurações.” Campo: altura em cm. Interruptor “Mostrar o IMC no app”, desligado por padrão. Botões “Pular” e “Salvar”. Pular não grava nada e não bloqueia nenhuma outra função.
- **RF-57** Validação: altura entre 100 e 250 cm. O app não coleta idade, data de nascimento nem sexo biológico.

**Idioma**

- **RF-74 Seletor de idioma.** Em Configurações, seção “Idioma”, e nas telas de login e cadastro (a escolha fica em meta.localePref). Só aparece quando há dois ou mais idiomas disponíveis. Os nomes aparecem no próprio idioma (Português, English, Español). A troca vale na hora.

**Regras**

- **RN-12 Fluxo móvel (acesso permitido).** Em dispositivo móvel a landing page é ignorada: o app é carregado direto e o código da landing nem é baixado. A rota inicial segue as regras de acesso: sessão válida e `onboarding_done` verdadeiro abrem a tela Hoje; sem sessão, abre o login ou o cadastro; com sessão e sem onboarding, abre o onboarding. No navegador móvel (fora do modo instalado), o app trata o evento `beforeinstallprompt`:
    - o listener é registrado no carregamento inicial, antes de montar o app, para não perder o evento; o evento é guardado e `preventDefault()` é chamado;
    - o convite é um banner próprio (`v-banner` ou `v-snackbar`), mostrado só depois de concluído o onboarding, nunca durante o cadastro ou o onboarding nem sobre a tela de registro de peso;
    - o botão “Instalar” chama `prompt()` a partir de um gesto do usuário, o resultado de `userChoice` é tratado e o evento `appinstalled` esconde o banner;
    - se o usuário dispensar, o banner não volta por 14 dias (data guardada na store `meta` do IndexedDB);
    - não mostrar quando o app já roda instalado (`matchMedia('(display-mode: standalone)')` ou `navigator.standalone`);
    - em navegadores sem esse evento (Safari no iOS), mostrar o aviso manual de instalação da seção 4.6;
    - o registro do service worker e a captura de `beforeinstallprompt` existem apenas no fluxo móvel.
- **RN-15 Resolução do idioma.** O idioma efetivo é o primeiro disponível, segundo os flags, nesta ordem: (1) `user_settings.locale`; (2) a escolha feita antes do login, guardada em `meta.localePref`; (3) o idioma do navegador (`navigator.languages`: prefixo `pt` para pt-BR, `en` para en-US, `es` para es-419); (4) pt-BR. A preferência salva pelo usuário é mantida mesmo que o flag seja desligado: nesse caso o app mostra pt-BR e volta ao idioma escolhido quando o flag for religado. Trocar de idioma aplica a mudança na hora, sem recarregar, atualiza `html lang` e sincroniza o novo `locale`.

**Seeds no cliente.** Ao concluir o onboarding, o app cria no aparelho três hábitos padrão, com ids gerados no cliente e somente a chave: `vegetais`, `sono` e `exercicio`. O texto exibido vem do catálogo do idioma ativo (por exemplo, a chave `habits.vegetais`); por isso `label` fica vazio nos hábitos padrão e só é preenchido nos personalizados. Eles sincronizam como qualquer outro registro. Valores padrão das configurações: meta de água de 8 copos, copo de 250 ml, passo de meta de 2 kg, lembrete às 07:30 todos os dias e idioma `pt-BR`.

**10. Telas e navegação**

Barra de abas inferior (v-bottom-navigation, do Vuetify) com 5 itens:

1. **Hoje** — cumprimento, selo de streak, peso atual com atalho para registrar, progresso até o próximo marco, checklist de hábitos, contador de água.
2. **Evolução** — gráfico de tendência, indicadores, cartão de IMC (só se ativado), distribuição de humor (D) e atalho para a galeria.
3. **Histórico** — lista de registros de peso.
4. **Metas** — marcos e estados.
5. **Mais** — galeria de fotos, configurações, sobre e privacidade, exportar dados (D).

Telas modais: registrar peso, escolha de humor, celebração de marco, edição de registro, adicionar foto, comparação de fotos. Telas fora das abas: landing page de apresentação (somente desktop), boas-vindas, cadastro, login, recuperação de senha, onboarding, aviso de instalação no iOS e aviso “Nova versão disponível”.

## Pronto quando

- É possível criar conta, concluir o onboarding e chegar à tela Hoje; reabrir o app em modo avião, depois do primeiro login, leva direto à tela Hoje.
- Fechar o app no meio do onboarding recomeça do passo 1 sem dados corrompidos; pular a tela do IMC não grava nada.
- Mensagens de erro de login são genéricas e vêm dos códigos da API, traduzidas no cliente.
- Sair com pendências ou fotos mostra o aviso e só limpa os dados locais depois da confirmação.
- Testes de componente ou Playwright cobrindo cadastro, login, recuperação e onboarding.

## Insumos que dependem do dono do projeto

- Nenhum.

## Ao terminar (obrigatório)

1. Rode `npm run lint`, `npm test` e `npm run build`; todos devem passar. Corrija o que falhar antes de seguir.
2. Revise o diff: nada fora do escopo, nenhuma dependência desnecessária, nenhum segredo, nenhum texto fixo em componente.
3. Atualize `docs/PROGRESSO.md` (marque a sessão) e `docs/DECISOES.md` (decisões novas).
4. Escreva `docs/relatorios/07-fase-04a-conta-onboarding.md` pelo modelo `docs/MODELO_RELATORIO.md` (máximo de 40 linhas).
5. Faça o commit: `fase 4A: <resumo curto>`.
6. Pare. Não comece a próxima sessão (prompts/08-fase-04b-registro-historico.md). Responda no chat só com o resumo de 5 linhas do relatório.
