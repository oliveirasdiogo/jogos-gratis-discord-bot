# Configuração do Discord

Este guia configura a versão combinada para receber slash commands e publicar
avisos em canais Discord.

## 1. Criar uma aplicação

1. Acesse o [Discord Developer Portal](https://discord.com/developers/applications);
2. selecione **New Application**;
3. dê um nome à aplicação;
4. copie o **Application ID** em **General Information**;
5. copie a **Public Key** na mesma página.

## 2. Criar o bot e guardar o token

1. Abra **Bot**;
2. crie o bot, se necessário;
3. use **Reset Token** e copie o token;
4. guarde-o como senha.

Nunca publique o token no GitHub, em capturas de tela ou em arquivos de
configuração versionados.

## 3. Configurar a instalação

Em **Installation**, configure a instalação no servidor com:

- escopos `applications.commands` e `bot`;
- permissão `Send Messages`.

Copie o link de instalação, abra-o no navegador e adicione a aplicação a um
servidor de teste no qual você tenha permissão administrativa.

## 4. Obter o ID do servidor para testes

No Discord:

1. abra **Configurações > Avançado**;
2. ative **Modo desenvolvedor**;
3. clique com o botão direito no servidor;
4. selecione **Copiar ID do servidor**.

Adicione temporariamente ao bloco `vars` de `wrangler.jsonc`:

```jsonc
"DISCORD_GUILD_ID": "ID_DO_SERVIDOR_DE_TESTE"
```

Comandos de servidor aparecem imediatamente. Remova a variável quando quiser
registrar comandos globais.

## 5. Cadastrar variáveis na Cloudflare

O `DISCORD_APPLICATION_ID` e o `DISCORD_PUBLIC_KEY` são dados públicos da
aplicação. O `DISCORD_BOT_TOKEN` e o `ADMIN_SETUP_KEY` são segredos e nunca
devem aparecer em commits, issues ou capturas de tela. Para simplificar a
configuração, os quatro podem ser informados de forma interativa:

```bash
npx wrangler secret put DISCORD_APPLICATION_ID
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DISCORD_BOT_TOKEN
npx wrangler secret put ADMIN_SETUP_KEY
```

No Windows PowerShell, substitua `npx` por `npx.cmd`.

## 6. Publicar e registrar comandos

```bash
npm run deploy
```

Guarde a URL do Worker. Registre os comandos usando a chave administrativa:

```powershell
$seguro = Read-Host "ADMIN_SETUP_KEY" -AsSecureString
$chave = [System.Net.NetworkCredential]::new("", $seguro).Password
$cabecalhos = @{ Authorization = "Bearer $chave" }

Invoke-RestMethod -Method Post `
  -Uri "https://SEU_WORKER.workers.dev/admin/setup-discord" `
  -Headers $cabecalhos
```

No Linux:

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_SETUP_KEY" \
  https://SEU_WORKER.workers.dev/admin/setup-discord
```

## 7. Configurar o endpoint de Interactions

No Developer Portal, abra **General Information** e informe:

```text
https://SEU_WORKER.workers.dev/discord/interactions
```

O Discord enviará uma verificação assinada. O Worker só aceitará o endpoint se
a chave pública estiver correta.

## 8. Ativar um canal

No canal escolhido, um administrador deve executar:

```text
/ativar
```

Depois, teste `/status`, `/agora` e `/plataformas`.

## Solução de problemas

- **Invalid interaction application command**: registre os comandos novamente;
- **Assinatura inválida**: confira `DISCORD_PUBLIC_KEY`;
- **Missing Access ou 403**: reinstale a aplicação com `Send Messages`;
- **Comandos globais não aparecem**: aguarde a propagação ou use
  `DISCORD_GUILD_ID` durante o desenvolvimento;
- **Avisos não chegam**: confirme `/status`, permissões do canal e os logs com
  `npx wrangler tail`.
