# Implantação e operação

Procedimento para a versão `2.1.0-beta.1`. Este documento não comprova implantação: URLs definitivas, chaves, migrações aplicadas, `/health`, autenticação e fluxo remoto precisam de verificação hospedada. Não foram criadas contas, aceitos contratos ou contratados planos por esta atualização documental.

## 1. Preparação

Confirmar titularidade do repositório e permissão de uso das primeiras fontes. Conferir planos, limites e custos de Supabase e Render antes de provisionar; não há promessa de gratuidade permanente. Não usar banco, bucket ou dados da tese/MADO. Guardar senhas e segredos no ambiente apropriado, nunca em conversa, issue, código, histórico ou variável `VITE_`.

Usar Node.js 24 e pnpm 11.19.0. Compilar e testar o checkout atual, não reaproveitar uma pasta `dist` antiga:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

O build atual foi executado com sucesso após liberar a restrição local de execução das ferramentas. Uma falha de permissão não deve ser contornada publicando um binário antigo. O relatório consolidado fica em [VALIDACAO.md](VALIDACAO.md); testes locais não substituem a aceitação hospedada.

## 2. Supabase: dados e conta inicial

O Supabase fornece Auth, PostgreSQL e Storage; não hospeda a interface nem executa o capturador Express desta aplicação.

1. Criar ou selecionar projeto dedicado, mediante autorização da titular e confirmação de custos.
2. Em banco novo, aplicar `supabase/migrations/202609060001_wablind.sql` e depois `supabase/migrations/202609070002_mediation.sql`. Em instalação existente, conferir migrações já aplicadas; não repetir a primeira indiscriminadamente. Fazer backup antes de atualizar.
3. Conferir RLS, permissões das funções e bucket `wablind-captures` privado. A segunda migração acrescenta prévia/condições de uso, vínculo de captura e formato 2. Não criar políticas amplas de escrita ou tornar o bucket público.
4. Desabilitar cadastro público e criar a conta inicial no Supabase Auth, com e-mail válido e senha forte. Confirmar/ativar a conta conforme configuração do projeto.
5. Registrar o e-mail dessa conta em `PROFESSOR_EMAIL` no servidor. Na interface, o usuário é `professor`; a senha é a da conta, sem valor fixo no código. O servidor usa [signInWithPassword](https://supabase.com/docs/reference/javascript/auth-signinwithpassword). Não configurar template OTP: o formulário atual não usa código por e-mail, Magic Link ou SSO.
6. Guardar URL e chave pública/publicável para os ambientes; a chave administrativa fica exclusivamente no servidor. Conferir recuperação de conta antes de ampliar o uso.

O banco possui membros, mas o formulário só oferece a conta inicial mapeada. Acesso individual de vários professores requer evolução da autenticação; compartilhar a conta não preserva autoria individual.

## 3. Render: serviço da API

Criar um **Web Service**, runtime Node, a partir do repositório correto. Se o repositório dedicado contém `package.json` na raiz, não acrescentar `wablind/` como root directory. Se for conectado um repositório-pai, configurar a raiz correspondente. Conferir permissões ao conectar o GitHub. O [procedimento oficial para Express](https://render.com/docs/deploy-node-express-app) descreve esse tipo de serviço.

O contrato está em `render.yaml`, com Node 24, deploy automático desabilitado e health check `/health`. Build e inicialização:

```sh
corepack pnpm install --frozen-lockfile && corepack pnpm typecheck && corepack pnpm exec tsup server/index.ts --format esm --platform node --target node24 --out-dir dist-server
```

```sh
node dist-server/index.js
```

| Variável do servidor | Uso |
|---|---|
| `SUPABASE_URL` | URL do projeto dedicado. |
| `SUPABASE_PUBLISHABLE_KEY` | Chave pública usada nas sessões verificadas. |
| `SUPABASE_SERVICE_ROLE_KEY` | Segredo administrativo; nunca enviar ao frontend. |
| `PROFESSOR_EMAIL` | Conta existente associada a `professor`. |
| `ALLOWED_ORIGINS` | Origens exatas permitidas ao navegador. No Pages previsto: `https://natacsham.github.io`, sem caminho. |
| `ALLOWED_CAPTURE_HOSTS` | Hosts exatos separados por vírgula; vazio desativa captura externa. |
| `NODE_VERSION` | `24`, conforme blueprint. |
| `PORT` | Porta do ambiente; o serviço já a lê e escuta em `0.0.0.0`. |

O material próprio `public/examples/comparacao.html` foi preparado como fonte autorizada para captura, edição e publicação nos testes WABlind. Após confirmar sua publicação e escopo de permissão, o endereço previsto é `https://natacsham.github.io/wablind/examples/comparacao.html`. Só então considerar habilitar `natacsham.github.io`. A lista opera por host, não por caminho: essa habilitação não restringe automaticamente a captura ao exemplo nem autoriza outras páginas do domínio. Rever o alcance antes de liberar. Subdomínios, redirecionamentos e CDNs também exigem habilitação explícita.

Depois de configurar, verificar `/health`. `ready-to-check` significa apenas que URL/chaves básicas estão presentes: não confirma `PROFESSOR_EMAIL`, migrações, banco ou gravação. Testar login e operação real antes de declarar disponibilidade. O disco do Render não guarda a persistência da aplicação.

## 4. GitHub Pages: interface estática

1. Em Settings → Pages, selecionar GitHub Actions.
2. Conferir o workflow `Verify and publish WABlind`. Ele verifica tipos, arquivos de release, testes, auditoria de dependências, build e fluxos no build de produção. Depois recompila a interface com configuração pública e envia somente `dist`.
3. Para demonstração independente, manter variáveis de serviço vazias. Para ligar à API implantada, definir Repository Variables `VITE_API_URL` (base da API, sem `/v1`), `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Não usar segredos administrativos.
4. O caminho-base do workflow é `/wablind/`; a navegação usa fragmentos. Confirmar repositório/alvo antes de assumir esse caminho.
5. Publicar um commit aprovado pelo pipeline e conferir a URL retornada pelo deploy. `https://natacsham.github.io/wablind/` é destino previsto, não confirmação de que esta versão já está nele.

O artefato estático segue a [documentação do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). A recompilação com endereços reais requer teste final próprio; o teste local sem serviço não valida CORS ou autenticação hospedados.

## 5. Aceitação hospedada pendente

- Abrir os três exemplos, editar, salvar e preparar leitura local sem serviço. Confirmar que isso não aparece como publicação on-line.
- Entrar com a conta inicial real; testar senha errada, limite, expiração, saída e recuperação do rascunho. Não registrar tokens/senha nas evidências.
- Abrir a URL demonstrativa autorizada; conferir texto, tabela, unidades, ordem e prévia aproximada. Testar domínio proibido, destino privado e falha da fonte.
- Classificar elementos, justificar omissões, escrever síntese vinculada e criar representação textual/tabular com função e condição. Salvar e reabrir sem perda.
- Criar duas atividades para a URL e verificar a escolha na busca pública. Rascunhos não devem aparecer.
- Publicar uma revisão, editar sem alterar a leitura pública e retirar publicação. Conferir por resposta da API que o texto original omitido não é entregue; razões e contribuições mantidas visíveis também precisam de revisão.
- Conferir autorização com segunda identidade controlada, por API/banco enquanto não houver login individual na interface: acesso negado antes do convite, edição após convite, publicação exclusiva da proprietária.
- Simular gravações concorrentes; a versão antiga recebe conflito sem sobrescrever a nova. Preservar e comparar o rascunho.
- Exportar/reimportar formato 2; conferir leitura de formato 1 e ausência de alterações silenciosas na fonte.
- Testar HTTPS, CORS, subcaminho, atualização de links, foco, teclado, ampliação/reflow e tecnologias assistivas. Registrar combinações realmente utilizadas; automação não declara conformidade.
- Revisar arquivos publicados e histórico para segredos, dados pessoais, PDFs/legado e evidências acadêmicas que devem ficar fora do repositório.

## 6. Backup, reversão e manutenção

Antes de uso externo amplo, definir retenção e remoção com a titular. Capturas e projetos não são apagados automaticamente. Retirar publicação não recolhe exportações já baixadas nem elimina o projeto privado.

Fazer backup do PostgreSQL e do bucket privado conforme o serviço contratado. Testar restauração em ambiente separado, incluindo capturas, prévias, revisões e permissões. Testes em memória não comprovam restauração do Supabase.

Frontend: publicar novamente o commit aprovado compatível. API: selecionar implantação anterior aprovada no Render. A migração 002 é aditiva e preserva revisões históricas, mas o código anterior pode não entender novos documentos: não reverter para uma versão que só lê formato 1 após criar formato 2. Testar compatibilidade antes da reversão; não apagar dados para “voltar” a migração.

Registrar falhas sem corpos de páginas, credenciais ou tokens. Rever consumo, dependências, permissões e logs a cada release. Esta entrega não criou monitoramento recorrente nem contratou operação contínua.
