---
name: cookunity
description: Use this skill when the user wants to interact with their CookUnity meal subscription via the cookunity CLI. Covers browsing the menu, managing the cart, skipping/unskipping deliveries, placing orders, checking prices, viewing order history, and account info. Triggers on any request involving CookUnity meals, deliveries, cart, or orders through the CLI.
---

# CookUnity CLI

Unofficial CLI for managing a CookUnity meal subscription. All commands require credentials in the environment.

## Setup

```bash
# Install
brew tap sergiosegrera/cookunity
brew install cookunity

# Credentials (add to ~/.zshrc or ~/.bashrc)
export COOKUNITY_EMAIL=your@email.com
export COOKUNITY_PASSWORD=yourpassword
```

All commands support `--json` for machine-readable output.

## Quick Reference

| Goal | Command |
|---|---|
| Browse this week's menu | `cookunity menu` |
| Search meals | `cookunity search <keyword>` |
| View a meal's details | `cookunity meal <inventoryId>` |
| List upcoming deliveries | `cookunity deliveries` |
| Show next delivery | `cookunity next` |
| Skip a delivery | `cookunity skip <YYYY-MM-DD>` |
| Unskip a delivery | `cookunity unskip <YYYY-MM-DD>` |
| View cart | `cookunity cart show <YYYY-MM-DD>` |
| Add to cart | `cookunity cart add <inventoryId> <YYYY-MM-DD>` |
| Remove from cart | `cookunity cart remove <inventoryId> <YYYY-MM-DD>` |
| Clear cart | `cookunity cart clear <YYYY-MM-DD>` |
| Price breakdown | `cookunity price <YYYY-MM-DD>` |
| Place order | `cookunity order confirm <YYYY-MM-DD>` |
| Past orders | `cookunity orders` |
| Invoice history | `cookunity history --from YYYY-MM-DD --to YYYY-MM-DD` |
| Account info | `cookunity user` |

For full options and flags, see [references/commands.md](references/commands.md).

## Key Concepts

- **Dates** are always `YYYY-MM-DD` and correspond to delivery dates (typically Mondays)
- **inventoryId** format is `ii-<number>` (e.g. `ii-135418644`) — find via `menu` or `search`
- `cart add/remove/clear` and `order confirm` affect real orders and real charges
- Auth tokens are cached in `~/.cookunity/tokens.json` and reused across invocations; full OAuth only runs when the token is missing or expired
