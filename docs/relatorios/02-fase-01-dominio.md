# Relatório: Fase 1 (Domínio puro (regras de negócio))
Data: 2026-11-26 · Commit: ver `git log -1 --oneline`

## Resumo (3 linhas)
Regras RN-01 a RN-06, RN-09 a RN-11, RN-15 e RN-16 implementadas como funções puras em `packages/domain`.
Tipos das entidades e helpers de data/decimal exportados; 51 testes novos cobrem limites e casos de borda.
Nenhuma dependência de Vue, DOM, rede ou IndexedDB; lint, testes e build passam.

## Entregue
- RN-01/RN-02: média móvel da janela de 7 dias, série para o gráfico e peso de referência.
- RN-03/RN-04: geração de marcos, verificação de alcance e progresso limitado a 0–100%.
- RN-05: detecção de subida pelo registro anterior ou pela média calculada sem o novo peso.
- RN-06/RF-20 a RF-22: streak atual e recorde com manutenção até o fim do dia, virada e edição retroativa.
- RN-09/RN-10: IMC, faixas de adulto como códigos e aviso de peso-alvo abaixo de 18,5 × altura².
- RN-11/RN-15/RN-16: classificação de dispositivo, resolução de idioma e parse/normalização decimal.
- Tipos: `WeightEntry`, `Milestone`, `Habit`, `HabitLog`, `WaterLog`, `Settings` e helpers de calendário.

## Testes
- Comando: `npm test` → 64 passando, 0 falhas (11 arquivos; 51 testes novos).
- `npm run lint` → 0 erros; `npm run build` → ok (web, api e domínio).
- Verificação manual: busca em `packages/domain/src` sem imports de Vue, DOM, fetch ou IndexedDB.

## Decisões tomadas
- D-15 a D-22 registradas em `docs/DECISOES.md`.

## Pendências e adiado
- Consumo das funções pelas telas, API, IndexedDB e sincronização fica para as fases 2 a 4.
- Rótulos traduzidos das faixas de IMC e o texto do RF-64 ficam nos catálogos da fase 10.

## Riscos e avisos
- O recorde do streak pode ser preservado pelo parâmetro `previousBest` informado pelo chamador.
- O build da web repete aviso preexistente de `inlineDynamicImports` deprecificado (fora do escopo).

## Insumos necessários do dono
- nenhum

## Próxima sessão
- prompts/03-fase-02a-backend-auth.md
