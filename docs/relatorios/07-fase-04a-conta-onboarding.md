# Relatório: Fase 4A (Telas de conta e onboarding)
Data: 2026-11-26 · Commit: 9aebedc

## Resumo (3 linhas)
Cadastro, login, recuperação e redefinição passaram a usar a API por códigos de erro estáveis, com consentimento desmarcado e mensagem de login genérica.
A rota inicial passou a respeitar sessão e onboarding; a sessão sobrevive à reabertura sem rede e a saída avisa sobre fila e fotos antes de apagar os dados.
O onboarding de cinco telas grava peso, marcos, hábitos padrão e configurações só ao concluir; os três catálogos foram atualizados juntos.

## Entregue
- RF-46/47: cadastro com consentimento e link de privacidade; login com erro genérico traduzido do código da API.
- RF-48/49/50: sessão persistente por marca local + cookie, recuperação/reset e saída com aviso, sincronização e download de fotos.
- RN-12: guardas de rota (login → onboarding → Hoje); telas de conta sem barra de abas; nada de banner de instalação nesta fase.
- RF-01/02/03/56/57: onboarding de 5 passos, IMC opcional, validações, marcos, timezone e três hábitos seed.
- RF-74/RN-15: seletor de idioma nas telas de entrada (só com 2+ idiomas) e resolução por settings → preferência → navegador → pt-BR.

## Testes
- Comando: `npm run lint` → sem erros; `npm run i18n:check` → 94 chaves nos 3 idiomas.
- Comando: `npm test` → 139 passando, 0 falhas; `npm run build` → ok.
- Comando: `npm run test:e2e` → 7 passando, incluindo cadastro, onboarding, retomada, login, recuperação, saída e os 2 testes de sincronização existentes.
- Verificação manual: fluxos conferidos no Chromium pelo Playwright contra API, Postgres e Redis reais.

## Decisões tomadas
- D-46 a D-50 registradas em `docs/DECISOES.md`; nenhuma dependência nova.

## Pendências e adiado
- RF-51 (trocar senha logado) e a tela cheia de Configurações/Privacidade ficam para a Fase 10.
- Banner de instalação/landing (11A), cartão de IMC (10) e permissão de push (8) permanecem fora do escopo.

## Riscos e avisos
- A tela de privacidade criada aqui é mínima: o texto jurídico definitivo depende de revisão do dono.
- en-US e es-419 continuam rascunho, aguardando revisão humana.

## Insumos necessários do dono
- nenhum

## Próxima sessão
- prompts/08-fase-04b-registro-historico.md
