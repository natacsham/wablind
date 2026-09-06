# Arquitetura e contratos v1

Frontend React/TypeScript/Vite → API Express/Node 24 → Supabase Auth/PostgreSQL/Storage.

`shared/model.ts` é o contrato validado de documento. Renderização usa componentes conhecidos e texto escapado, nunca HTML bruto da fonte. O JSON não aceita propriedades desconhecidas, links executáveis, imagens remotas arbitrárias nem SVG enviado pelo usuário. A mesma validação é aplicada à reimportação e aos documentos retornados pelo serviço.

## API

Todas as rotas abaixo têm prefixo `/v1`. Rotas privadas exigem `Authorization: Bearer <token Supabase>` validado no servidor. A API aplica permissões novamente pelo JWT do usuário nas consultas e RPCs. A chave administrativa é usada apenas na captura/armazenamento após autenticação, nunca no cliente.

| Método e rota | Entrada / saída |
|---|---|
| POST `/captures` | `{url, rightsConfirmed:true}` → `{id,document}` |
| GET `/captures/:id` | Captura privada do próprio usuário |
| GET `/projects` | Projetos acessíveis ao usuário |
| POST `/projects` | `{document}` ou `{captureId}` → `{id,owner_id,version,document}` |
| GET `/projects/:id` | Projeto, documento atual, até 30 revisões e membros |
| POST `/projects/:id/revisions` | `{document,expectedVersion}` → nova revisão; 409 em conflito |
| POST `/projects/:id/members` | `{email}` de mediador cadastrado; somente proprietária |
| DELETE `/projects/:id/members/:userId` | Retirar acesso; somente proprietária |
| POST `/projects/:id/publication` | `{expectedVersion,rightsConfirmed:true}`; somente proprietária |
| DELETE `/projects/:id/publication` | Retirar versão pública sem apagar revisões |
| GET `/publications/:id` | Documento da revisão publicada, sem autenticação; autoria pessoal redigida |
| GET `/projects/:id/export?format=html` | Download HTML; sem parâmetro retorna JSON |

Erros: `{error:{code,message}}`. Categorias: 400 JSON inválido; 401 sessão; 403 autorização/destino/origem; 404 indisponível; 409 revisão conflitante; 413 tamanho; 415 tipo; 422 estrutura; 429 frequência; 503 configuração/armazenamento; 504 captura/tempo.

## Persistência e concorrência

`wablind_projects` aponta para revisão atual e publicada, separadamente. `wablind_revisions` é imutável para clientes. `wablind_members` autoriza colaboradores. RLS restringe leituras; alterações ocorrem exclusivamente em funções transacionais. A versão esperada é conferida sob bloqueio da linha do projeto. Fonte e blocos não podem ser trocados em uma revisão; nova captura exige novo projeto. Autoria de alterações é carimbada no banco.

Capturas ficam em `wablind_captures` e no bucket privado `wablind-captures`, por usuário. O cliente não possui política de upload arbitrário. A cota transacional limita 20 tentativas diárias por usuário; o serviço limita cinco capturas por minuto por usuário e 120 solicitações por minuto por IP. Limites iniciais: 50 projetos por proprietária e 500 revisões por projeto.

## Rede e processamento

Cada URL é validada antes da resolução DNS. Todos os resultados devem ser públicos. A conexão TLS é vinculada a um IP verificado, mantendo o hostname original para TLS; não há segunda resolução nem agente compartilhado. Até três redirecionamentos são revalidados. Recursos de imagem obedecem às mesmas regras, além de limite de tamanho e assinatura raster. Não há proxy CORS aberto, execução de script remoto, cookies da fonte ou acesso a destinos internos.

O banco oferece uma verificação estrutural mínima adicional. O contrato completo TypeScript é validado na entrada/saída da API e na renderização. Não se deve adicionar políticas de escrita direta nas tabelas ou substituir o JWT do usuário pela chave administrativa nas rotas de projetos.
