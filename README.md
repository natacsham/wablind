# WABlind

Mediação humana para leitura de conteúdos web. Atualização da aplicação da trajetória de pesquisa de Natacsha, preservando a proposta de processamento técnico e associação contextual de marcadores.

**Versão: 2.0.0-beta.1.** Demonstração independente de cadastro; serviços conectados exigem configuração. Não há declaração de conformidade WCAG nem nova avaliação com participantes.

- Aplicação: https://natacsham.github.io/wablind/
- Artigo original: [Avaliação da Comunicabilidade da WABlind em Enciclopédias On-line](https://doi.org/10.5753/cbie.sbie.2018.1153), SBIE 2018.
- [Requisitos e procedência](docs/REQUISITOS.md)
- [Arquitetura e API](docs/ARQUITETURA.md)
- [Implantação e operação](docs/DEPLOY.md)
- [Estado da validação](docs/VALIDACAO.md)

## Funcionalidades

Três exemplos educativos originais; seleção por lista e botões; marcadores com explicação e prévia; descrições e finalidade pedagógica; revisões locais, desfazer e restaurar; leitor semântico; exportação HTML e JSON; reimportação validada; demonstração utilizável sem backend.

O código inclui API HTTPS de captura limitada por domínio, tamanho e tempo; autenticação Supabase por OTP; projetos privados e membros; revisões transacionais com controle de concorrência; publicação de revisão fixa e retirada; banco com RLS e armazenamento privado. O funcionamento hospedado depende da implantação descrita em `docs/DEPLOY.md`.

## Desenvolvimento

Requer Node.js 24 e pnpm 11.19.0.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Abra o endereço informado, acrescentando `/wablind/`. Para a demonstração, nenhuma variável de ambiente é necessária. Configure `.env` a partir de `.env.example` somente para recursos conectados; nunca versione credenciais.

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm preview
```

Os testes de navegador usam o **build de produção**, na porta 4174. As verificações PostgreSQL rodam em memória com PGlite, simulando os papéis e o identificador autenticado do Supabase. Não acessam um banco real.

## Salvamento e privacidade

O rascunho fica no armazenamento deste navegador. “Salvar revisão” cria um ponto recuperável (até 30 revisões locais). JSON exporta o documento atual, não o histórico ou as credenciais. Faça cópias externas; limpar o navegador pode apagar o trabalho local.

Projetos conectados usam tokens apenas na sessão do navegador. Contas são cadastradas pela administradora; a aplicação não cria usuários automaticamente. A publicação é explícita, restrita à proprietária e independente de futuras edições. Não inclua dados pessoais de estudantes. Os exemplos não contêm dados de pesquisa.

## Contribuir

Use uma branch e uma pull request. Descreva comportamento esperado, alterações, testes e limitações. Para barreiras de acesso, informe fluxo, navegador e tecnologia assistiva. Nunca inclua credenciais ou conteúdo privado em issues. Relatos de segurança não devem conter segredos ou dados de terceiros; use contato privado com a mantenedora.

## Autoria e licença

Projeto original associado a Natacsha Ordones Raposo, Alberto Castro e Thais Castro, conforme artigo. Esta atualização não publica nem redistribui as árvores históricas ou dados de participantes. A licença de redistribuição do código permanece **a definir pela titularidade do projeto**; não se presume autorização de relicenciamento dos arquivos antigos. Dependências conservam suas próprias licenças.
