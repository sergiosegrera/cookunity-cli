# cookunity-cli

An unofficial command-line interface for managing your [CookUnity](https://cookunity.com) meal subscription. Not affiliated with, endorsed by, or associated with CookUnity in any way.

## Requirements

- [Bun](https://bun.com) v1.0+
- A CookUnity account

## Setup

```bash
bun install
```

Set your credentials via environment variables (Bun auto-loads `.env`):

```bash
# .env
COOKUNITY_EMAIL=your@email.com
COOKUNITY_PASSWORD=yourpassword
```

## Usage

```bash
bun src/index.ts <command> [options]
```

All commands support `--json` for raw JSON output.

### Menu

```bash
bun src/index.ts menu [date]                   # Browse available meals
bun src/index.ts menu --category Bowls         # Filter by category
bun src/index.ts menu --diet vegan             # Filter by diet tag
bun src/index.ts menu --max-price 14           # Filter by price
bun src/index.ts menu --limit 10 --offset 20  # Pagination
bun src/index.ts search <keyword> [date]       # Search meals
bun src/index.ts meal <inventoryId> [--date]   # Full meal details
```

### Deliveries

```bash
bun src/index.ts deliveries   # List all upcoming deliveries
bun src/index.ts next         # Show next delivery
bun src/index.ts skip <date>  # Skip a delivery
bun src/index.ts unskip <date>
```

### Cart

```bash
bun src/index.ts cart show <date>
bun src/index.ts cart add <inventoryId> <date> [--qty 2]
bun src/index.ts cart remove <inventoryId> <date>
bun src/index.ts cart clear <date>
```

### Orders

```bash
bun src/index.ts order confirm <date>          # Place order from cart
bun src/index.ts price [date]                  # Price breakdown for current cart
bun src/index.ts orders                        # List past orders
bun src/index.ts history [--from YYYY-MM-DD --to YYYY-MM-DD]  # Invoice history
```

### Account

```bash
bun src/index.ts user   # Account info, plan, addresses
```

## Limitations

- **Unofficial / reverse-engineered**: Uses CookUnity's internal GraphQL API, which is undocumented and may change without notice, breaking this tool.
- **No token persistence**: Authentication runs the full OAuth flow on each process start. Tokens are cached in memory for the duration of the session only.
- **Write operations at your own risk**: Commands that modify your order (cart, skip, confirm) interact with real orders and real charges.
- **Bun only**: Uses `Bun.Cookie.parse()` for auth cookie handling — will not run on Node.js.
- **Single account**: Credentials are read from environment variables; no multi-account support.
