# Forte Aço — loja de demonstração

Prévia pública: https://wignelson.github.io/forte-aco/

## Recursos preparados

- Catálogo, busca, filtros, carrinho, orçamento via WhatsApp e visualização ilustrativa em 3D.
- Painel administrativo com acesso por e-mail e senha; comandas e catálogo só ficam acessíveis à conta autorizada no banco.
- Cada comanda registra cliente, CPF, telefone, pagamento escolhido, itens e valores. O status inicial é **Aguardando envio** até o cliente confirmar o envio no WhatsApp.

## Ativar autenticação e comandas online

A prévia de visitantes continua disponível, mas a finalização de pedidos, autenticação e comandas ficam bloqueadas até conectar um projeto Supabase. As políticas do banco são a proteção real; esconder a tela sozinho não protege os dados.

1. Crie um projeto Supabase e habilite o login por e-mail e senha.
2. No SQL Editor, execute `supabase-schema.sql`. O script habilita Row Level Security: visitantes só leem produtos e podem criar comandas; somente o UID autorizado lê e altera comandas e catálogo. Os preços e os itens do pedido são conferidos no banco.
3. Crie manualmente o usuário administrador usando o e-mail escolhido para o painel, confirme o e-mail, defina uma senha forte e desative a criação pública de contas. Ative MFA para a conta.
4. Copie o UID desse usuário em Authentication → Users e, no SQL Editor, autorize apenas esse UID: `insert into public.store_admins (user_id) values ('COLE_O_UID_DA_CONTA');`. Não insira e-mail ou senha no código público.
5. Em Auth → URL Configuration, permita o redirecionamento de recuperação para `https://wignelson.github.io/forte-aco/admin.html`.
6. Em `supabase-config.js`, preencha a URL do projeto e a chave pública `anon`. Nunca use a chave `service_role` no navegador. As regras do banco continuam obrigatórias mesmo que a chave pública seja vista.
7. Envie o arquivo de configuração ao GitHub para ativar o login e as comandas.

## Privacidade

O formulário pede consentimento antes de guardar nome, CPF, telefone, pagamento e itens. Visitantes não podem consultar comandas; apenas a conta autorizada no banco pode ver os detalhes. Guarde esses dados somente pelo tempo necessário. O pedido só é marcado como enviado depois que o cliente confirma no WhatsApp.

## Limites desta etapa

A loja ainda não processa pagamentos. O WhatsApp em `app.js` é temporário e deve ser substituído pelo número comercial. Não aceite vendas reais até concluir a configuração Supabase, confirmar as regras de acesso e verificar a política de retenção dos dados.
