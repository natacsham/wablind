# Publicação: interface e catálogo compartilhado

A interface pode ser hospedada no GitHub Pages. O compartilhamento das alterações entre visitantes exige armazenamento online adicional e ainda não está configurado.

Consulte o [plano de conexão](ARMAZENAMENTO-COMPARTILHADO.md). Não tratar o armazenamento local como publicação remota.

O workflow atual verifica tipos, testes, privacidade, dependências, compilação e navegador. Quando executado em `main`, publica `dist/`. Uma branch de implementação não substitui automaticamente o site público.

O caminho padrão do Vite é `/wablind/`, com rotas por fragmento, como `#/gestao`.

As variáveis da API anterior não devem ser reutilizadas como se configurassem esta demonstração. O serviço legado exige autenticação. A integração proposta precisará de contrato e permissões próprios para o catálogo fictício.

Há duas etapas distintas: publicação da demonstração estática e conexão do catálogo compartilhado. A primeira entrega busca, inspeção e salvamento local, com aviso explícito desse alcance. A segunda somente estará concluída quando uma alteração confirmada em um navegador aparecer na leitura de outro navegador limpo, mantendo a página de origem intacta. Esse teste remoto ainda não foi executado.
