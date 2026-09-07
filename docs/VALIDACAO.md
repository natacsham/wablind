# Validação — 2.1.0-beta.1

Este arquivo separa testes executados, inspeções e avaliação humana. Registro atualizado em 7 de setembro de 2026.

## Rodada atual: formato 2 e editor multimodal

- `pnpm build`: tipos, interface Vite e API compilados com sucesso em Node 24. O sandbox local bloqueou uma leitura ancestral do esbuild; a execução autorizada fora dessa restrição concluiu a compilação do checkout atual. Não foi usada uma interface antiga como substituta.
- `pnpm test`: **63 testes aprovados**, em seis arquivos: modelo (8), mediação (6), captura (28), API (8), PostgreSQL/PGlite (11) e respostas assíncronas do workspace (2).
- `pnpm exec playwright test --workers=1`: rodada final com **15 testes aprovados** sobre a compilação de produção, em Chromium. Quatro testes cobrem o editor e onze cobrem a interface pública, incluindo falha de carregamento e preservação do trabalho. Uma rodada anterior de 14 testes também passou com dois workers.
- `pnpm audit --prod --audit-level high`: nenhuma vulnerabilidade conhecida reportada nesta execução. Isso não prova ausência de vulnerabilidades.
- axe não encontrou violações nas páginas/estados e regras executados. Reflow a 320 CSS px testado em início, área do professor, história, ajuda, exemplos, leitura e painel de marcação.
- Foco inicial, altura mínima de 72 px, nome do microfone, autocomplete por teclado, mesma aba, foco após seleção, rascunho ao alternar elementos/painéis, revisão/restauração, autoria manual, síntese opcional e equivalência leitura/HTML foram exercitados.
- Seleção no iframe e na lista aponta ao mesmo elemento. Sandbox sem `allow-same-origin`, CSP e validação das mensagens foram inspecionados; captura maliciosa/estilos com rede foram cobertos por testes de servidor.
- Regressão no RPC anônimo confirma ausência de sentinelas inseridas no corpo/anotações/decisões/representações de elementos desconsiderados. O manifesto público conserva somente IDs/ordem/motivos; a revisão privada permanece íntegra.
- Regressões verificam isolamento por usuário, revisões publicadas fixas, múltiplas atividades por URL, normalização sem alterar caminho, conflito e recusa a reutilizar uma projeção pública como captura completa.

Rodadas do editor apresentaram espera excedida no carregamento do módulo. Uma ocorreu durante atualizações paralelas do build; outra, mesmo com o build estável, registrou cerca de 20 segundos no transporte de assets locais e requisições do editor ainda pendentes. Não foi isolada a causa desse atraso no ambiente. O teste agora aguarda explicitamente o término do carregamento, limitado a 30 segundos, antes das mesmas verificações funcionais. As repetições isolada e conjunta tiveram rodadas aprovadas; os logs de falha também são preservados. Esses resultados não caracterizam uma medição de desempenho em produção.

## Registro anterior — histórico da implementação

Execução local de 6 de setembro de 2026: testes de tipos aprovados; 42 testes unitários/API/PostgreSQL em memória aprovados; 11 testes de navegador aprovados sobre o build de produção. axe sem violações nos critérios automatizáveis examinados (WCAG A/AA selecionados); reflow testado a 320 CSS px. Auditoria de dependências de produção sem vulnerabilidades conhecidas no momento da execução. Capturas visuais locais em `test-results/` (não versionadas).

A primeira rodada de navegador contra o servidor de desenvolvimento apresentou timeouts de carregamento. A suíte foi direcionada ao artefato de produção, conforme o requisito de entrega, e passou integralmente. Não se apresentam essas falhas como problemas de acessibilidade resolvidos por automação.

## Cobertura implementada

- Modelos: exemplos locais, exportação, versões, integridade de marcações, rejeição de URLs executáveis e imagens não permitidas, escape HTML.
- Captura: endereços privados/reservados IPv4/IPv6, domínios exatos, HTTPS, extração de conteúdo, links, tabelas e avisos de limitações.
- API: configuração ausente, autenticação obrigatória, origens e JSON inválidos.
- PostgreSQL em memória: isolamento por usuário, convites, impedimento de escrita direta, conflito de versão, publicação fixa, retirada, autoria pública redigida, fonte imutável e cota diária.
- Navegador Chromium: três exemplos locais, edição, teclado, histórico, exportação, publicação local, erros, axe e reflow de 320 CSS px.

## Não confundir com validação concluída

- NVDA/Firefox e NVDA/Chrome: não testados manualmente nesta execução.
- VoiceOver/Safari e TalkBack/Chrome: não testados.
- Não houve estudo com pessoas com deficiência ou nova coleta de dados.
- Autenticação/e-mail, RLS no Supabase hospedado, armazenamento real e captura no Render exigem configuração e ensaio de integração.
- Backup/restauração real e operação pública precisam ser conferidos antes da abertura dos serviços conectados.
- axe sem violações no escopo testado não comprova conformidade WCAG, adequação das descrições ou ganho de aprendizagem.

## Gate

Beta estática permitida com os limites visíveis e demonstração independente. Não declarar o fluxo remoto operacional antes de completar o checklist hospedado. Não declarar conformidade WCAG sem avaliação suficiente.
