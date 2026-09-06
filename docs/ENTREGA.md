# Entrega e pendências externas

Implementação local: React/TypeScript, editor/leitor, demonstração original, importação/exportação, histórico, API Node/Express, migração Supabase, autorização transacional e publicação por revisão. Arquivos históricos preservados fora do repositório.

Verificação: tipos e compilação de frontend/API aprovados; testes de domínio, API e PostgreSQL em memória; testes de navegador sobre produção, teclado, reflow e axe. Consulte `VALIDACAO.md` e execute novamente os comandos do README após mudanças.

## Publicação ainda não concluída

Em 6 de setembro de 2026, foi criado o repositório público `natacsham/wablind` e selecionado GitHub Actions como fonte do Pages, com HTTPS obrigatório. O envio do código não foi concluído nesta etapa:

- Git local: nenhuma credencial de escrita disponível.
- Conector GitHub: tentativa de criação da árvore retornou 403, sem instalações de aplicativo disponíveis.
- Chrome autenticado: o envio foi impedido porque a extensão não permite acesso a arquivos locais.

Assim, criar o repositório e configurar o Pages **não equivalem a publicar a aplicação**. O endereço público só deve ser anunciado como operacional após envio do código, conclusão do workflow e verificação no navegador.

Render e Supabase exigem entrada da titular. Nenhum serviço pago, banco hospedado, senha ou chave foi criado. O código falha de forma explícita quando o serviço não está configurado; a demonstração local continua disponível.

## Retomada

1. Habilitar acesso a URLs de arquivo na extensão do Chrome para o envio pela interface do GitHub, ou disponibilizar autenticação de escrita do repositório por um mecanismo autorizado. Não colar tokens em mensagens.
2. Enviar somente os arquivos versionados (o pacote de código-fonte não inclui `node_modules`, `.git`, `.env`, caches ou materiais históricos). Enviar o workflow por último se a carga for realizada por pastas pela interface web.
3. Acompanhar o workflow e corrigir qualquer divergência de ambiente. Validar a URL final, exemplos e downloads.
4. Entrar no Render e no Supabase e seguir `DEPLOY.md`, confirmando custos, termos e permissões antes de provisionar.
5. Testar manualmente com NVDA e registrar os resultados, sem antecipar conformidade.
