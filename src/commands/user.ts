import type { Command } from "commander";
import type { CookUnityAPI } from "../services/api.ts";
import { printError } from "../services/helpers.ts";

export function registerUserCommands(program: Command, api: CookUnityAPI): void {
  program
    .command("user")
    .description("Get user profile, plan, delivery schedule, and credits")
    .option("--json", "Output as JSON")
    .action(async (opts: { json?: boolean }) => {
      try {
        const user = await api.getUserInfo();
        if (opts.json) {
          console.log(JSON.stringify(user, null, 2));
          return;
        }
        console.log("CookUnity Profile");
        console.log("=================");
        console.log(`Name:    ${user.name}`);
        console.log(`Email:   ${user.email}`);
        console.log(`Status:  ${user.status}`);
        console.log(`Plan ID: ${user.plan_id}`);
        console.log(`Credit:  $${user.currentCredit.toFixed(2)}`);
        console.log();
        console.log("Delivery Schedule:");
        for (const d of user.deliveryDays) {
          console.log(`  ${d.day}: ${d.time_start} – ${d.time_end}`);
        }
        console.log();
        console.log("Addresses:");
        for (const a of user.addresses) {
          console.log(
            `  ${a.street}, ${a.city}, ${a.region} ${a.postcode}${a.isActive ? " [ACTIVE]" : ""}`,
          );
        }
      } catch (error) {
        printError(error);
      }
    });

  program
    .command("orders")
    .description("List order history with delivery dates")
    .option("--limit <n>", "Orders per page (default 20)", Number, 20)
    .option("--offset <n>", "Pagination offset (default 0)", Number, 0)
    .option("--json", "Output as JSON")
    .action(async (opts: { limit: number; offset: number; json?: boolean }) => {
      try {
        const allOrders = await api.getAllOrders();
        const total = allOrders.length;
        const paged = allOrders.slice(opts.offset, opts.offset + opts.limit);
        const hasMore = total > opts.offset + paged.length;

        const output = {
          total,
          count: paged.length,
          offset: opts.offset,
          has_more: hasMore,
          ...(hasMore ? { next_offset: opts.offset + paged.length } : {}),
          orders: paged,
        };

        if (opts.json) {
          console.log(JSON.stringify(output, null, 2));
          return;
        }

        console.log(`Order History (${total} total, showing ${paged.length})`);
        console.log();
        for (const o of paged) {
          console.log(`  ${o.deliveryDate}  (ID: ${o.id})`);
        }
        if (hasMore) {
          console.log();
          console.log(`Use --offset ${opts.offset + paged.length} for more.`);
        }
      } catch (error) {
        printError(error);
      }
    });

  program
    .command("history")
    .description("Get past order invoices with full meal details for a date range")
    .requiredOption("--from <date>", "Start date YYYY-MM-DD (inclusive)")
    .requiredOption("--to <date>", "End date YYYY-MM-DD (inclusive)")
    .option("--limit <n>", "Invoices per page (default 10, max 50)", Number, 10)
    .option("--offset <n>", "Pagination offset (default 0)", Number, 0)
    .option("--json", "Output as JSON")
    .action(
      async (opts: {
        from: string;
        to: string;
        limit: number;
        offset: number;
        json?: boolean;
      }) => {
        try {
          const invoices = await api.getInvoices(
            opts.from,
            opts.to,
            opts.offset,
            opts.limit,
          );
          const total = invoices.length;

          const formatted = invoices.map((inv) => ({
            id: inv.id,
            date: inv.date,
            subtotal: inv.subtotal,
            delivery_fee: inv.deliveryFee,
            express_fee: inv.expressFee,
            taxes: inv.taxes,
            tip: inv.tip,
            discount: inv.discount,
            credit_applied: inv.chargedCredit,
            total: inv.total,
            payment: inv.ccNumber,
            orders: inv.orders.map((order) => ({
              delivery_date: order.delivery_date,
              display_date: order.display_date,
              delivery_window: `${order.time_start} – ${order.time_end}`,
              items: order.items.map((item) => ({
                name: item.product.name,
                description: item.product.short_description,
                chef: `${item.product.chef_firstname} ${item.product.chef_lastname}`.trim(),
                price: item.price.price,
                price_incl_tax: item.price.priceIncludingTax,
                original_price: item.price.originalPrice,
                calories: parseInt(item.product.calories, 10) || null,
                meat_type: item.product.meat_type,
                quantity: item.qty,
                rating: item.product.user_rating,
                review: item.product.review
                  ? {
                      rating: item.product.review.rating,
                      text: item.product.review.review,
                    }
                  : null,
              })),
            })),
          }));

          const output = { total, offset: opts.offset, invoices: formatted };

          if (opts.json) {
            console.log(JSON.stringify(output, null, 2));
            return;
          }

          console.log(`Order History (${opts.from} → ${opts.to})`);
          console.log(`${total} invoice(s)`);
          console.log();
          for (const inv of formatted) {
            console.log(`Invoice ${inv.id} — ${inv.date}`);
            const parts = [
              `subtotal $${inv.subtotal.toFixed(2)}`,
              `tax $${inv.taxes.toFixed(2)}`,
              `delivery $${inv.delivery_fee.toFixed(2)}`,
            ];
            if (inv.tip > 0) parts.push(`tip $${inv.tip.toFixed(2)}`);
            if (inv.discount > 0) parts.push(`discount -$${inv.discount.toFixed(2)}`);
            console.log(`  Total: $${inv.total.toFixed(2)} (${parts.join(" + ")})`);
            for (const order of inv.orders) {
              console.log(
                `  Delivery: ${order.delivery_date} (${order.delivery_window})`,
              );
              for (const item of order.items) {
                const ratingStr = item.rating != null ? ` [${item.rating}/5]` : "";
                console.log(
                  `    - ${item.name} x${item.quantity} — $${item.price.toFixed(2)} (${item.chef})${ratingStr}`,
                );
                if (item.description) console.log(`      ${item.description}`);
                if (item.review?.text) console.log(`      Review: "${item.review.text}"`);
              }
            }
            console.log();
          }
        } catch (error) {
          printError(error);
        }
      },
    );
}
