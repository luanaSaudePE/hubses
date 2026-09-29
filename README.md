# Central de acesso

Ferramentas compartilhadas, com edição pelo site e histórico no GitHub. Não utiliza banco de dados.

## Usar

Clique em **Adicionar ferramenta** ou no lápis de um cartão. Preencha nome, link, categoria e senha de edição. **Salvar e publicar** grava `catalog.json` na branch `main` do repositório `luanaSaudePE/hubses`. A integração Git da Vercel inicia uma publicação. O site confirma a publicação somente quando encontra os novos dados em produção; a verificação acontece a cada 15 segundos enquanto a página está visível.

Favoritos e tema continuam individuais. Alterações antigas guardadas no navegador não substituem o catálogo publicado. Não coloque senhas ou URLs confidenciais no catálogo: os links são públicos.

## Ativar a edição

No GitHub, crie um personal access token **fine-grained**, limitado ao repositório `luanaSaudePE/hubses`, com a permissão de repositório **Contents: Read and write**. Defina uma validade e renove antes do vencimento.

No projeto `central` da Vercel, em **Settings → Environment Variables**, adicione para **Production**:

- `HUB_GITHUB_TOKEN`: o token restrito ao repositório.
- `HUB_ADMIN_PASSWORD`: uma senha exclusiva com pelo menos 16 caracteres.

Cadastre os valores diretamente na Vercel, sem colocá-los em arquivos versionados ou no chat. Faça um novo deploy após configurar. Nenhum valor secreto é enviado ao navegador; a senha digitada é enviada somente à API do próprio site e não fica no armazenamento local.

A API só pode alterar `catalog.json` na branch `main`; o cliente não escolhe o repositório ou caminho. Edições simultâneas em ferramentas diferentes são conciliadas; uma edição desatualizada da mesma ferramenta é recusada. Repetir um salvamento já concluído não cria duplicatas. Sem as variáveis, a consulta funciona e a gravação mostra que a edição ainda precisa ser ativada.

## Desenvolvimento

Execute `node server.cjs` e abra http://localhost:3000. Sem variáveis, é possível testar a consulta e os formulários. `.env.local` pode configurar a API, mas gravar usando credenciais reais altera o repositório e dispara um deploy de produção. O servidor local lê seu próprio `catalog.json`, que só recebe os commits feitos pelo site depois de `git pull`.

Execute `node --test`. Antes de modificar o código, sincronize `main` com `git pull --ff-only`, pois as edições pelo site criam commits no GitHub.

Se o site continuar aguardando publicação, confira o deployment da Vercel. O commit pode ter sido salvo mesmo que a publicação tenha falhado. Não há garantia de atualização imediata.
