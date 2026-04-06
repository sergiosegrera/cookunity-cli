# CookUnity CLI — Full Command Reference

## Menu

```bash
cookunity menu [date]
  --category <name>     Filter by category (e.g. Bowls, "Protein+")
  --diet <tag>          Filter by diet tag (e.g. vegan, gluten-free)
  --max-price <n>       Max price in dollars
  --min-rating <n>      Min rating 0–5
  --limit <n>           Results per page (default 20)
  --offset <n>          Pagination offset (default 0)
  --json

cookunity search <keyword> [date]
  --limit <n>
  --offset <n>
  --json

cookunity meal <inventoryId>
  --date <YYYY-MM-DD>   Menu date to look up (defaults to next Monday)
  --json
```

## Deliveries

```bash
cookunity deliveries          # All upcoming delivery weeks
cookunity next                # Next delivery only
cookunity skip <YYYY-MM-DD>   # Skip a delivery week
cookunity unskip <YYYY-MM-DD>
```

## Cart

```bash
cookunity cart show <YYYY-MM-DD>
cookunity cart add <inventoryId> <YYYY-MM-DD> [--qty <n>]
cookunity cart remove <inventoryId> <YYYY-MM-DD>
cookunity cart clear <YYYY-MM-DD>
```

## Orders & Pricing

```bash
cookunity price [date]
  --meals <json>   Override cart with explicit meals:
                   '[{"entityId":123,"quantity":1,"inventoryId":"ii-xxx"}]'
  --json

cookunity order confirm <YYYY-MM-DD>

cookunity orders
  --limit <n>      (default 10)
  --json

cookunity history
  --from <YYYY-MM-DD>
  --to   <YYYY-MM-DD>
  --json
```

## Account

```bash
cookunity user
  --json
```
