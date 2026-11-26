# Pacote de execução por fase: EmagreSer

Este pacote troca o prompt único de abertura por **17 sessões curtas**, cada uma com seu próprio prompt. Assim cada sessão lê só o trecho da especificação de que precisa, você controla quando gastar e o trabalho retoma de onde parou.

## O que vai para o repositório

Copie para a **raiz do repositório** (este `LEIA-ME.md` não precisa ir):

- `AGENTS.md`: regras fixas lidas em toda sessão.
- `CLAUDE.md`: apenas importa o `AGENTS.md` (para o Claude Code; outros agentes leem o `AGENTS.md`).
- `docs/ESPECIFICACAO.md`: a especificação completa, só para consulta por `grep`.
- `docs/DECISOES.md`, `docs/PROGRESSO.md`, `docs/MODELO_RELATORIO.md` e a pasta `docs/relatorios/`.
- `docs/design/guia-de-design.png`: o guia visual, que as sessões de interface consultam.
- `prompts/`: um arquivo por sessão.

## Como rodar cada sessão

1. Abra uma **conversa nova** com o agente no repositório (sem histórico da sessão anterior).
2. Envie uma única linha: `Leia e execute prompts/NN-nome-da-fase.md`.
3. Quando o agente terminar, ele para e entrega o relatório curto. Leia `docs/relatorios/NN-....md` e o `git diff --stat`.
4. Se estiver bom, passe para a próxima sessão. Se não, peça só a correção pontual, na mesma conversa.

## Controle de uso e de tempo

- **Uma sessão por conversa.** Conversas longas carregam todo o histórico a cada resposta, que é onde o consumo cresce.
- **Revise relatórios, não o código inteiro.** Leia o código de perto só nas sessões críticas: 03 (autenticação), 04 e 06 (sincronização), 12 (push) e 17 (checklist final).
- **Modelo por tamanho.** Use o seu modelo mais capaz nas sessões marcadas como Grande e um mais econômico nas Pequenas e Médias, se a sua assinatura permitir escolher.
- **Se o limite de uso acabar no meio de uma sessão:** peça ao agente, se ainda puder, “registre o ponto de retomada em `docs/PROGRESSO.md` e faça commit”. Depois, retome com a mesma linha do prompt; ele começa do ponto registrado.
- **Sessão grande demais?** A sessão 14 (Fase 10) já traz a orientação de dividir em duas. O mesmo vale para qualquer sessão que o agente avise estar passando do razoável.
- **Em paralelo (opcional).** Se você usar branches ou worktrees separados, as sessões 03 e 04 (backend) podem andar junto com a 05 (dados locais do cliente), porque mexem em pastas diferentes. Para uma pessoa só, o mais seguro é seguir a ordem.

## Pontos de revisão humana

- Depois da **03 e da 04:** segurança da autenticação e isolamento entre usuários.
- Depois da **06:** o teste offline-para-online precisa estar verde.
- Depois da **12:** teste manual do push em Android e iPhone reais.
- Depois da **17:** revisão das traduções (`docs/REVISAO_TRADUCOES.md`) antes de ligar qualquer flag de idioma.

## As 17 sessões

| Nº | Arquivo | Conteúdo | Tamanho | O que o agente vai pedir a você |
|---|---|---|---|---|
| 01 | `01-fase-00-base.md` | Base do monorepo | Média | — |
| 02 | `02-fase-01-dominio.md` | Domínio puro (regras de negócio) | Média | — |
| 03 | `03-fase-02a-backend-auth.md` | Backend: banco e autenticação | Grande | — |
| 04 | `04-fase-02b-backend-sync-flags.md` | Backend: sincronização, flags, exportação e exclusão | Grande | — |
| 05 | `05-fase-03a-cliente-dados-locais.md` | Cliente: dados locais (Dexie e fila de saída) | Média | — |
| 06 | `06-fase-03b-cliente-sincronizacao.md` | Cliente: motor de sincronização e flags | Grande | — |
| 07 | `07-fase-04a-conta-onboarding.md` | Telas de conta e onboarding | Grande | — |
| 08 | `08-fase-04b-registro-historico.md` | Registro de peso e histórico | Média | — |
| 09 | `09-fase-05-grafico-metas.md` | Gráfico de tendência e metas | Média | — |
| 10 | `10-fase-06-habitos-agua-streak.md` | Hábitos, água e streak | Média | — |
| 11 | `11-fase-07-humor-acolhimento.md` | Diário de humor e mensagens de acolhimento | Pequena | — |
| 12 | `12-fase-08-lembretes-push.md` | Lembretes por Web Push | Grande | Você precisa guardar o par de chaves VAPID que o script gerar e configurá-lo nas variáveis de ambiente.; Um celular Android e um iPhone (iOS 16.4 ou superior) para o teste manual. |
| 13 | `13-fase-09-galeria.md` | Galeria de evolução (fotos) | Pequena | — |
| 14 | `14-fase-10-configuracoes-imc-idioma.md` | Configurações, privacidade, IMC e idioma | Grande | — |
| 15 | `15-fase-11a-dispositivo-landing.md` | Detecção de dispositivo, landing de desktop e instalação | Média | — |
| 16 | `16-fase-11b-deploy-polimento.md` | Deploy e polimento | Grande | Conta na Railway (ou o VPS), domínio e o `SMTP_URL` de produção, quando for publicar de fato. |
| 17 | `17-fase-12-idiomas-flags.md` | Revisão de idiomas, flags e checklist final | Média | Revisão humana das traduções (você) antes de colocar os flags em `testers`. |

A ordem é a da coluna Nº. O pacote reproduz a seção 13 da especificação, com as fases 2, 3, 4 e 11 divididas em duas sessões cada.
