# Implantação e operação

## Estado e requisitos de acesso

O código não contém contas, chaves, senhas ou serviços pagos provisionados. Login e aceites de termos/permissões permanecem sob controle da titular. A demonstração no Pages não depende deles. Não anunciar o backend operacional antes de executar os testes hospedados abaixo.

## 1. Supabase — projeto dedicado

1. Entrar no Supabase e criar um projeto exclusivo para a WABlind. Confirmar plano/custos antes de contratar. A titular define e guarda a senha do banco; não enviar pela conversa nem versionar.
2. Aplicar `supabase/migrations/202609060001_wablind.sql` pelo SQL Editor ou CLI autenticada. Não usar o banco da tese/MADO.
3. Confirmar RLS nas cinco tabelas e bucket `wablind-captures` privado. Não criar políticas genéricas de escrita.
4. Em Auth, desabilitar cadastros públicos; cadastrar a proprietária e mediadores autorizados. Configurar entrega de e-mail adequada ao uso previsto.
5. O template de Magic Link precisa usar `{{ .Token }}` para envio de código OTP. O frontend usa `verifyOtp` com tipo `email`, sem fluxo de redirecionamento. Definir expiração do código e limites; testar recebimento real antes de abrir o serviço.
6. Guardar URL e chave publicável como configuração pública. Guardar a chave administrativa exclusivamente no ambiente do Render.

Referências: https://supabase.com/docs/guides/auth/auth-email-passwordless e https://supabase.com/docs/guides/database/postgres/row-level-security.

## 2. Render — API

1. Conectar somente `natacsham/wablind` ao Render, conferindo permissões solicitadas e preço do serviço.
2. Usar o `render.yaml` ou configurar serviço Node 24 com os comandos nele indicados. O plano comercial não foi fixado para evitar contratação implícita.
3. Preencher `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `ALLOWED_ORIGINS=https://natacsham.github.io`.
4. Deixar `ALLOWED_CAPTURE_HOSTS` vazio até revisar autorização e compatibilidade dos primeiros domínios. A lista usa nomes exatos separados por vírgula; subdomínios e CDNs não são autorizados automaticamente.
5. Implantar e verificar `/health`. `ready-to-check` significa somente presença da configuração: executar login, gravação e leitura reais para comprovar funcionamento.

O armazenamento em disco do Render não é utilizado para persistência. Deploy automático do backend fica desabilitado; implantar apenas commits aprovados pela verificação do repositório.

## 3. GitHub Pages

1. Em Settings → Pages, selecionar GitHub Actions.
2. A demonstração é compilada sem variáveis de serviço. Para ativar o serviço, definir nas Repository Variables `VITE_API_URL`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Nunca cadastrar uma chave administrativa com prefixo `VITE_`.
3. Executar o workflow Verify and publish WABlind. O deploy depende de tipos, testes, auditoria de dependências e testes no build de produção.
4. Confirmar publicação em `https://natacsham.github.io/wablind/` e links por fragmento. Caminho-base configurado como `/wablind/`.

## 4. Aceitação hospedada

- Abrir os três exemplos e executar o fluxo sem cadastro.
- Entrar por OTP; criar, salvar e reabrir um projeto privado.
- Usar duas contas: a segunda não acessa rascunhos antes do convite e não publica após o convite.
- Simular duas revisões: a segunda gravação antiga recebe conflito, mantendo o rascunho local.
- Importar uma página autorizada; revisar preservação do conteúdo e imagens.
- Publicar, editar sem alterar o que está público e retirar publicação.
- Confirmar exportação e reimportação, subcaminho, foco, reflow e leitores de tela.
- Conferir HTTPS, CORS e ausência de segredos nos arquivos compilados.

## 5. Backup, reversão e manutenção

Antes de alterações de banco: realizar backup PostgreSQL e do bucket privado conforme o plano contratado; restaurar em projeto de homologação separado e testar documentos, membros e revisões. Esse ensaio não foi substituído pelo teste em memória.

Para reverter frontend, reexecutar a publicação do último commit aprovado. Para API, selecionar o deploy anterior no Render. Migrações futuras devem ser aditivas e compatíveis com ambas as versões durante a transição; não reverter o banco apagando dados.

Não coletar conteúdo ou tokens nos logs. A API registra apenas a classe do erro inesperado. Verificar status do serviço e consumo no painel, revisar dependências a cada release e registrar incidentes sem dados pessoais. Não há automação recorrente criada por esta entrega.

Capturas e projetos não são apagados automaticamente. Antes de habilitar uso externo amplo, definir retenção/remoção com a titular e documentar a política. Retirar publicação não apaga cópias já exportadas por leitores.
