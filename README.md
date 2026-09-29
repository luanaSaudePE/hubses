# Central de acesso

Aplicação estática, sem banco, API ou senha. Todos recebem os mesmos links publicados. Favoritos e tema são preferências individuais do navegador.

## Alterar links para todos

1. Abra `index.html` e procure `const DEFAULTS = [`.
2. Altere o campo `url` da ferramenta desejada. Para adicionar uma ferramenta, inclua um item com `id` único, `name`, `url`, `category` e `icon`.
3. Salve e publique o commit na branch de produção do repositório conectado à Vercel.
4. Depois do deploy, todos que abrirem ou atualizarem a página receberão os novos links.

Endereços vazios aparecem como “Em breve”. Links personalizados antigos do navegador não substituem os endereços publicados. O armazenamento antigo é preservado, mas não usado para o catálogo.

## Executar localmente

Use `node server.cjs` e abra http://localhost:3000. Também é possível abrir `index.html` diretamente. Nenhuma variável de ambiente é necessária. Execute `node --test` para verificar o catálogo e as preferências.

## Vercel

O projeto `central` publica este repositório como site estático. Não é necessário conectar banco nem configurar senha. Mudanças no catálogo exigem uma nova publicação.
