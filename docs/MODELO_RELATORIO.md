# Modelo de relatório de sessão

Copie para `docs/relatorios/<nome-do-prompt>.md`. Máximo de 40 linhas. Seja objetivo.

```
# Relatório: Fase <id> (<título>)
Data: AAAA-MM-DD · Commit: <hash curto>

## Resumo (3 linhas)

## Entregue
- <RF/RN e o que foi feito, uma linha cada>

## Testes
- Comando: <comando> → <resultado (ex.: 142 passando, 0 falhas)>
- Verificação manual: <o que foi conferido e onde; ou "nenhuma">

## Decisões tomadas
- <D-xx registrada em docs/DECISOES.md, ou "nenhuma">

## Pendências e adiado
- <o que ficou de fora e por quê>

## Riscos e avisos
- <pontos que o dono deve olhar na revisão>

## Insumos necessários do dono
- <chaves, contas, dispositivos, revisões; ou "nenhum">

## Próxima sessão
- prompts/<próximo arquivo>.md
```
