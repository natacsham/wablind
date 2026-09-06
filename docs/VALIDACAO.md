# Validação — 2.0.0-beta.1

Este arquivo separa testes executáveis, inspeções e validação humana.

Execução local de 6 de setembro de 2026: testes de tipos aprovados; testes unitários/API/PostgreSQL em memória aprovados; 10 testes de navegador aprovados sobre o build de produção. axe sem violações nos critérios automatizáveis examinados (WCAG A/AA selecionados); reflow testado a 320 CSS px. Auditoria de dependências de produção sem vulnerabilidades conhecidas no momento da execução. Capturas visuais locais em `test-results/` (não versionadas).

A primeira rodada de navegador contra o servidor de desenvolvimento apresentou timeouts de carregamento. A suíte foi direcionada ao artefato de produção, conforme o requisito de entrega, e passou integralmente. Não se apresentam essas falhas como problemas de acessibilidade resolvidos por automação.

## Cobertura implementada

- Modelos: exemplos, exportação/reimportação, versões, integridade de marcações, rejeição de URLs executáveis e imagens não permitidas, escape HTML.
- Captura: endereços privados/reservados IPv4/IPv6, domínios exatos, HTTPS, extração de conteúdo, links, tabelas e avisos de limitações.
- API: configuração ausente, autenticação obrigatória, origens e JSON inválidos.
- PostgreSQL em memória: isolamento por usuário, convites, impedimento de escrita direta, conflito de versão, publicação fixa, retirada, autoria pública redigida, fonte imutável e cota diária.
- Navegador Chromium: três exemplos, edição, teclado, histórico, exportação/reimportação, publicação local, erros, axe e reflow de 320 CSS px.

## Não confundir com validação concluída

- NVDA/Firefox e NVDA/Chrome: não testados manualmente nesta execução.
- VoiceOver/Safari e TalkBack/Chrome: não testados.
- Não houve estudo com pessoas com deficiência ou nova coleta de dados.
- Autenticação/e-mail, RLS no Supabase hospedado, armazenamento real e captura no Render exigem configuração e ensaio de integração.
- Backup/restauração real e operação pública precisam ser conferidos antes da abertura dos serviços conectados.
- axe sem violações no escopo testado não comprova conformidade WCAG, adequação das descrições ou ganho de aprendizagem.

## Gate

Beta estática permitida com os limites visíveis e demonstração independente. Não declarar o fluxo remoto operacional antes de completar o checklist hospedado. Não declarar conformidade WCAG sem avaliação suficiente.
