# Configuração do Discord

O modo padrão envia avisos por mensagem direta (DM). A instalação também pode
usar canais de servidor ou permitir os dois destinos.

## Criar e instalar a aplicação

1. Crie uma aplicação no
   [Discord Developer Portal](https://discord.com/developers/applications);
2. copie o Application ID e a Public Key em **General Information**;
3. em **Bot**, redefina e guarde o token como senha;
4. em **Installation**, habilite `applications.commands` e `bot`;
5. para canais, conceda também `Send Messages`;
6. instale o bot em um servidor compartilhado com quem utilizará suas DMs.

## Identificar o proprietário

Ative **Configurações > Avançado > Modo desenvolvedor**, clique com o botão
direito no seu perfil e copie o ID do usuário. Configure:

```jsonc
"DISCORD_OWNER_USER_ID": "SEU_ID_DE_USUARIO",
"DISCORD_ACCESS_MODE": "approval",
"DISCORD_DELIVERY_MODE": "dm"
```

`DISCORD_DELIVERY_MODE` aceita:

- `dm`: somente mensagens diretas, recomendado para uso pessoal;
- `channel`: somente canais de servidor;
- `both`: DMs e canais.

`DISCORD_ACCESS_MODE` aceita:

- `approval`: novos usuários aguardam sua aprovação;
- `owner_only`: somente o proprietário;
- `open`: ativação livre.

## Cloudflare

Cadastre as variáveis. Application ID e Public Key são públicos; bot token e
`ADMIN_SETUP_KEY` são segredos:

```bash
npx wrangler secret put DISCORD_APPLICATION_ID
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DISCORD_BOT_TOKEN
npx wrangler secret put ADMIN_SETUP_KEY
npm run db:migrate:remote
npm run deploy
```

No Windows PowerShell, use `npx.cmd` se scripts `.ps1` estiverem bloqueados.

Registre os comandos no Linux:

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_SETUP_KEY" \
  https://SEU_WORKER.workers.dev/admin/setup-discord
```

No Windows PowerShell:

```powershell
$seguro = Read-Host "ADMIN_SETUP_KEY" -AsSecureString
$chave = [System.Net.NetworkCredential]::new("", $seguro).Password
$cabecalhos = @{ Authorization = "Bearer $chave" }
Invoke-RestMethod -Method Post `
  -Uri "https://SEU_WORKER.workers.dev/admin/setup-discord" `
  -Headers $cabecalhos
```

Configure **Interactions Endpoint URL** como:

```text
https://SEU_WORKER.workers.dev/discord/interactions
```

## DMs e aprovação

Abra uma conversa privada com o bot e use `/ativar`. O proprietário é aprovado
automaticamente. Outras pessoas ficam pendentes em `approval`.

O proprietário usa:

```text
/pendentes
/aprovar usuario:ID
/negar usuario:ID
```

A decisão é enviada à DM do solicitante.

## Canais de servidor

Escolha `channel` ou `both`, execute novamente `/admin/setup-discord` e use
`/ativar` no canal. Ativar, parar ou alterar lojas no canal exige
**Gerenciar servidor**.

## Solução de problemas

- comandos ausentes na DM: confirme que o bot compartilha um servidor com você
  e registre os comandos globais novamente;
- assinatura inválida: confira `DISCORD_PUBLIC_KEY`;
- erro 403 no canal: reinstale com `Send Messages`;
- avisos ausentes: confira `/status`, migrações e `npx wrangler tail`.
