# Forte Aço — primeira loja didática

Esta pasta contém uma primeira versão navegável da loja de materiais de ferro e aço. Ela foi separada do site da Barbearia do Ygodo.

## Como abrir

Na pasta do projeto, inicie um servidor local com `python -m http.server 8001` e abra `http://localhost:8001/loja-ferro-aco/` no navegador. Para editar o catálogo, use **Painel da loja** no cabeçalho ou abra `http://localhost:8001/loja-ferro-aco/admin.html`.

## O que já dá para experimentar

- Filtrar e buscar produtos.
- Abrir a visualização 3D ilustrativa e girar o perfil arrastando com o mouse ou dedo.
- Adicionar produtos e quantidades ao carrinho.
- Preencher uma comanda com nome, CPF, telefone e forma de pagamento escolhida; o pedido abre no WhatsApp e o cliente ainda toca em **Enviar**.
- Cadastrar, editar e remover itens no painel, incluindo uma foto e preço.
- Ver as alterações refletidas na vitrine no mesmo navegador.

## Limites desta etapa

Este é um protótipo educativo. Os dados e as fotos ficam no armazenamento local do navegador; outro computador não verá suas alterações. O painel ainda não tem login real e o site não processa pagamentos: a forma escolhida vai na comanda e o cliente combina o pagamento diretamente com o vendedor pelo WhatsApp. O CPF não fica salvo no site, mas é incluído na mensagem do WhatsApp. O número configurado no código é temporário para teste; antes de publicar, troque pelo número comercial do vendedor.

Para colocar a loja no ar com segurança, a próxima etapa é ligar um banco de dados e armazenamento de fotos com regras de acesso, proteger a conta principal com autenticação e criar o checkout por um provedor de pagamento no servidor. Senhas, segredos do gateway e credenciais privadas nunca devem ficar no JavaScript público do site.

## Um mapa rápido para aprender

- `index.html` estrutura as áreas da loja: topo, vitrine, produtos e carrinho.
- `style.css` controla aparência, cores e adaptação para celular.
- `app.js` guarda o catálogo demonstrativo e implementa busca, carrinho, comanda por WhatsApp, edição e rotação 3D.
- `admin.html` contém o formulário de edição do catálogo.

As fotos do catálogo vêm do próprio usuário; a ilustração do material 3D é feita com CSS, sem usar foto de produto de terceiros.
