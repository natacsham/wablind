# Plano de conexão do catálogo compartilhado

Status: planejado, não provisionado. A interface está em prévia local. A autora confirmou edição aberta das páginas fictícias, sem login. Não foi autorizada contratação de plano pago.

## Fluxo acordado

1. A ferramenta mantém as páginas fictícias e seus elementos de origem.
2. O professor abre a gestão e edita uma cópia da página.
3. Ao confirmar, o sistema valida e grava as alterações na base compartilhada.
4. Outro visitante pesquisa o catálogo e recebe a versão confirmada.

Não há download de HTML como etapa do professor ou do leitor. A estrutura de origem, as marcações e a renderização pertencem à aplicação. O navegador pode apresentar a página preparada a partir dos dados armazenados, sem gerar um arquivo manual para cada visita.

## Serviço proposto

Manter o código e a interface no GitHub/GitHub Pages e utilizar um projeto Supabase gratuito exclusivamente para o catálogo demonstrativo. Não reutilizar tabelas, documentos, sessões ou dados da tese.

O plano gratuito consultado inclui banco de dados e API, com limites e possibilidade de pausa após inatividade. Não há promessa de disponibilidade contínua ou de gratuidade permanente. Conferir as condições no momento da criação: [preços oficiais](https://supabase.com/pricing).

## Separação dos dados

- **Origem:** três páginas fictícias versionadas, imutáveis para visitantes.
- **Rascunho:** alterações de trabalho do navegador do professor, não exibidas ao leitor antes da confirmação.
- **Leitura confirmada:** classificação, descrição, texto e visibilidade de cada elemento, armazenados remotamente por página.
- **Revisão:** número da última confirmação, para detectar edição concorrente. Se outra pessoa salvar primeiro, pedir atualização da página antes de sobrescrever.

Não armazenar nome, e-mail, diagnóstico, turma, participante ou narrativa da tese. Sem identificação individual, uma gravação não comprova autoria e não será usada como evidência de avaliação humana.

## Permissões e limites

O acesso sem login será permitido apenas ao catálogo fictício. A base não deve permitir criar tabelas, inserir páginas arbitrárias, apagar registros de origem ou editar outros dados do projeto.

Antes de expor a gravação, implementar validação no serviço/banco, além da validação do navegador: IDs conhecidos, classificação compatível, tamanho máximo, campos permitidos, descrições obrigatórias e controle de revisão. Texto é sempre texto, nunca HTML ou JavaScript executável.

Usar políticas de acesso por linha e operações restritas. Somente uma chave publicável pode estar no cliente. Nunca incluir chave administrativa, senha do banco ou `service_role` no repositório ou no front-end. As [chaves de API](https://supabase.com/docs/guides/getting-started/api-keys) e as [políticas de acesso](https://supabase.com/docs/guides/database/postgres/row-level-security) são mecanismos diferentes: a chave pública não substitui a política.

Como a edição será aberta, terceiros poderão alterar textos das páginas fictícias. Isso é uma característica deliberada da demonstração, não um controle de autoria. Manter uma operação administrativa de restauração do catálogo e limites de gravação/uso no serviço. Não colocar essa gestão aberta sobre conteúdo real sem outra decisão de acesso.

## Implementação em sequência

1. A autora cria ou disponibiliza um projeto no plano gratuito, sem contratar adicionais.
2. Conferir o projeto escolhido e aplicar apenas a estrutura dedicada ao catálogo de demonstração.
3. Testar as permissões sem login: ler as páginas, alterar somente campos permitidos e rejeitar dados fora do contrato.
4. Conectar a interface usando a URL do projeto e a chave publicável. Segredos administrativos ficam fora da aplicação.
5. Substituir a confirmação local pela gravação remota, mantendo o rascunho quando houver erro e sem informar sucesso antes da confirmação do serviço.
6. Fazer busca e leitura consultarem a última versão confirmada. Informar indisponibilidade, carregamento, conflito de revisão e possibilidade de tentar novamente.
7. Publicar e verificar o percurso em dois navegadores independentes. Só então retirar o aviso de prévia local.

## Critérios de aceite

- Professor salva no navegador A; visitante encontra a alteração no navegador B limpo.
- Atualizar a página não apaga o resultado remoto.
- O rascunho não confirmado não aparece ao visitante.
- Texto e classificação mantêm estrutura semântica na leitura.
- Uma gravação incompatível é rejeitada pelo serviço, mesmo fora da interface.
- Falha de rede não elimina o rascunho nem simula publicação.
- Edição concorrente não sobrescreve silenciosamente uma confirmação mais recente.
- A página de origem continua intacta.
- Teclado, foco, mensagens e leitura por tecnologia assistiva continuam utilizáveis.

## Dependência para concluir

Disponibilizar o projeto de armazenamento escolhido. Até isso ocorrer, o comportamento entre visitantes não está implementado nem validado. A autorização atual abrange planejar uma conexão gratuita; não criar contas, aceitar termos em nome da autora ou contratar serviços.
