# Jogos Grátis — Discord

[![Verificações](https://github.com/oliveirasdiogo/jogos-gratis-discord-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/oliveirasdiogo/jogos-gratis-discord-bot/actions/workflows/ci.yml)
[![TypeScript 7](https://img.shields.io/badge/TypeScript-7.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Discord](https://img.shields.io/badge/Discord-App-5865F2?logo=discord&logoColor=white)](https://docs.discord.com/developers/)
[![Licença MIT](https://img.shields.io/badge/Licen%C3%A7a-MIT-2EA44F)](LICENSE)

Bot serverless que encontra jogos completos gratuitos para PC e envia avisos a
canais do Discord. Esta edição é independente e não exige Telegram.

## Índice

- [Recursos](#recursos)
- [Arquitetura](#arquitetura)
- [Instalação](#instalação)
- [Configuração do Discord](#configuração-do-discord)
- [Comandos](#comandos)
- [Segurança](#segurança)
- [Desenvolvimento](#desenvolvimento)

## Recursos

- Steam, Epic Games Store, GOG, itch.io, DRM-Free e outras lojas de PC;
- avisos automáticos com deduplicação por canal;
- filtros de lojas e histórico dos últimos sete dias;
- comandos slash e respostas privadas;
- permissão **Gerenciar servidor** para configurar canais;
- Cloudflare Workers, D1 e cron, sem servidor permanente;
- testes, tipagem e auditoria no GitHub Actions.

## Arquitetura

```text
GamerPower API -> catálogo D1 -> canais Discord
                       ^
                  Cron Trigger

Discord Interactions -> Cloudflare Worker -> comandos slash
```

A aplicação recebe Interactions por HTTP e valida cada assinatura Ed25519. Não
é necessário manter uma conexão com o Discord Gateway.

## Instalação

Pré-requisitos: Node.js 22+, Git, conta Cloudflare e uma aplicação no Discord
Developer Portal.

```bash
git clone https://github.com/oliveirasdiogo/jogos-gratis-discord-bot.git
cd jogos-gratis-discord-bot
npm install
```

No Windows PowerShell, use `npm.cmd` e `npx.cmd` se a política de execução
bloquear scripts `.ps1`.

Copie `wrangler.example.jsonc` para `wrangler.jsonc`, crie o D1, coloque o
`database_id` no arquivo e aplique as migrações:

```bash
npx wrangler login
npx wrangler d1 create jogos-gratis-discord
npm run db:migrate:remote
```

## Configuração do Discord

Cadastre as variáveis da aplicação. O bot token e `ADMIN_SETUP_KEY` são
segredos; Application ID e Public Key são identificadores públicos:

```bash
npx wrangler secret put DISCORD_APPLICATION_ID
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DISCORD_BOT_TOKEN
npx wrangler secret put ADMIN_SETUP_KEY
npm run deploy
```

Depois, registre os comandos por `/admin/setup-discord` e informe no Developer
Portal a URL pública `/discord/interactions`. Para desenvolvimento,
`DISCORD_GUILD_ID` faz os comandos aparecerem imediatamente no servidor de
teste.

O guia detalhado para Linux e Windows está em
[docs/DISCORD.md](docs/DISCORD.md).

## Comandos

| Comando | Função |
|---|---|
| `/ativar` | Ativar avisos no canal |
| `/agora` | Mostrar ofertas ativas |
| `/ultimos7dias` | Mostrar histórico |
| `/plataformas` | Escolher lojas |
| `/status` | Mostrar configuração |
| `/parar` | Desativar avisos |
| `/ajuda` | Mostrar ajuda |

Ativar, parar e alterar plataformas exige **Gerenciar servidor**.

## Segurança

- nunca publique o bot token, `ADMIN_SETUP_KEY` ou o `database_id`;
- as Interactions são rejeitadas quando a assinatura for inválida;
- menções são desativadas nas mensagens automáticas;
- consulte [SECURITY.md](SECURITY.md) para resposta a vazamentos.

## Desenvolvimento

```bash
npm run typecheck
npm test
npm audit --audit-level=high
```

O projeto usa a licença [MIT](LICENSE).
