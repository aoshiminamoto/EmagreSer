# Decisões

Registro de decisões do projeto. O agente acrescenta linhas ao final; nunca apaga as existentes.

| ID | Fase | Decisão | Motivo |
|---|---|---|---|
| D-01 | 0 | Locales do app: `pt-BR`, `en-US` e `es-419` | Decisão de produto; trocar a variante exige só configuração e catálogo |
| D-02 | 0 | Vuetify fixado em `^3`; PWA com `vite-plugin-pwa` 2.x | A v4 do Vuetify existe, mas a migração não foi decidida; `@vite-pwa/plugin` não existe no npm |
| D-03 | 0 | Código em inglês; comentários e documentação em português | Padrão de mercado e equipe brasileira |
| D-04 | 0 | Feature flags próprias, em PostgreSQL, sem serviço de terceiros | Restrição de custo e privacidade |
| D-05 | 0 | O app não coleta idade, data de nascimento nem sexo biológico | Decisão do dono; o IMC usa só a altura e mostra a faixa de adultos com nota |
| D-06 | 0 | O bloqueio de desktop é regra de experiência, não de segurança | A API aceita qualquer cliente |
| D-07 | 0 | Texto sobre verde e laranja usa `#111827`, não branco; texto e ícones verdes sobre fundo claro usam `primary-text` (`#15803D`) | O guia mostra texto branco sobre `#22C55E` (2,28:1), abaixo do mínimo AA de 4,5:1 |
| D-08 | 0 | Navegação com as 5 abas da seção 10; o botão central “+” do guia não entra | O guia mostra outra estrutura de navegação; a especificação funcional prevalece |
| D-09 | 0 | Tokens derivados fora do guia: `surface-card`, `primary-text` e `error` | Necessários para contraste AA e para ações destrutivas |
| D-10 | 0 | A marca é EmagreSer; nome e logotipo PesoPro do guia são provisórios | O guia vale só para cores, tipografia, formas e componentes |
| D-11 | 0 | CSP: `script-src 'self'` sem `eval`; `style-src` permite `unsafe-inline` | Vuetify aplica estilos inline dinâmicos; bloqueá-los quebraria a interface |
| D-12 | 0 | Ícones PWA gerados por script local com `zlib`, sem dependência nova | Evita serviços externos e mantém o build reproduzível/offline |
| D-13 | 0 | Catálogos en-US e es-419 compilados em chunks JS e precachados; idioma salvo em `localStorage` | `vue-i18n` precompila os JSON; o locale é lido no arranque e trocado por `setLocale` |
| D-14 | 0 | Hora e números seguem o `Intl` do locale, sem ajustes manuais | A ICU atual de `es-419` usa 12 h e ponto decimal; forçar outro padrão fugiria da regra RN-16 |
