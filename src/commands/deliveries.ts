import type { Command } from "commander";
import type { CookUnityAPI } from "../services/api.ts";
import { formatDelivery, printError } from "../services/helpers.ts";

export function registerDeliveryCommands(program: Command, api: CookUnityAPI): void {
  program
    .command("deliveries")
    .description("List upcoming delivery weeks with full details")
    .option("--json", "Output as JSON")
    .action(async (opts: { json?: boolean }) => {
      try {
        const days = await api.getUpcomingDays();
        const scheduledDays = days.filter((d) => d.scheduled);
        const deliveries = scheduledDays.map(formatDelivery);
        const output = { total: deliveries.length, deliveries };

        if (opts.json) {
          console.log(JSON.stringify(output, null, 2));
          return;
        }

        console.log("Upcoming Deliveries");
        console.log("===================");
        console.log();
        for (const d of deliveries) {
          const statusIcon =
            d.status === "active"
              ? "[ACTIVE]"
              : d.status === "skipped"
                ? "[SKIPPED]"
                : d.status === "paused"
                  ? "[PAUSED]"
                  : "[LOCKED]";
          console.log(`${d.date} ${statusIcon}`);
          if (d.cutoff) console.log(`  Cutoff: ${d.cutoff} (${d.cutoff_timezone ?? ""})`);
          console.log(
            `  Editable: ${d.can_edit ? "Yes" : "No"} | Menu available: ${d.menu_available ? "Yes" : "No"}`,
          );

          if (d.order) {
            console.log(
              `  Order #${d.order.id} (${d.order.status ?? "unknown"}, $${d.order.grand_total.toFixed(2)}):`,
            );
            for (const item of d.order.items) {
              console.log(
                `    - ${item.name} x${item.quantity} — $${item.price.toFixed(2)} (${item.chef})`,
              );
            }
          } else if (d.cart_count > 0) {
            console.log(`  Cart (${d.cart_count} items):`);
            for (const item of d.cart_items) {
              console.log(
                `    - ${item.name} x${item.quantity} — $${item.price.toFixed(2)} (${item.chef})`,
              );
            }
          } else if (d.recommendation_count > 0) {
            console.log(
              `  CookUnity Picks (${d.recommendation_count} meals — not confirmed):`,
            );
            for (const item of d.recommendation_items) {
              console.log(`    - ${item.name} x${item.quantity} (${item.chef})`);
            }
          } else {
            console.log("  Meals: None selected");
          }
          console.log();
        }
      } catch (error) {
        printError(error);
      }
    });

  program
    .command("next")
    .description("Get the nearest upcoming delivery")
    .option("--json", "Output as JSON")
    .action(async (opts: { json?: boolean }) => {
      try {
        const days = await api.getUpcomingDays();
        const today = new Date().toISOString().split("T")[0] ?? "";

        const next = days
          .filter((d) => d.scheduled && !d.skip && d.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date))[0];

        if (!next) {
          console.error(
            "No upcoming deliveries found. All scheduled deliveries may be skipped.",
          );
          process.exit(1);
        }

        const delivery = formatDelivery(next);
        let mealSource: string;
        let meals: {
          name: string;
          quantity: number;
          price: number;
          chef: string;
        }[];

        if (delivery.order) {
          mealSource = `Confirmed order #${delivery.order.id} (${delivery.order.status ?? "unknown"})`;
          meals = delivery.order.items;
        } else if (delivery.cart_count > 0) {
          mealSource =
            "Cart (NOT confirmed — will be replaced by CookUnity picks at cutoff)";
          meals = delivery.cart_items;
        } else if (delivery.recommendation_count > 0) {
          mealSource = "CookUnity auto-picks (not confirmed by user)";
          meals = delivery.recommendation_items;
        } else {
          mealSource = "No meals selected";
          meals = [];
        }

        const output = {
          date: delivery.date,
          status: delivery.status,
          can_edit: delivery.can_edit,
          cutoff: delivery.cutoff,
          cutoff_timezone: delivery.cutoff_timezone,
          meal_source: mealSource,
          meals,
          total_meals: meals.reduce((s, m) => s + m.quantity, 0),
          total_price:
            delivery.order?.grand_total ??
            meals.reduce((s, m) => s + m.price * m.quantity, 0),
        };

        if (opts.json) {
          console.log(JSON.stringify(output, null, 2));
          return;
        }

        console.log(`Next Delivery: ${output.date}`);
        console.log(
          `Status: ${output.status} | Editable: ${output.can_edit ? "Yes" : "No"}`,
        );
        if (output.cutoff)
          console.log(`Cutoff: ${output.cutoff} (${output.cutoff_timezone ?? ""})`);
        console.log(`Source: ${mealSource}`);
        console.log();
        if (meals.length === 0) {
          console.log("No meals selected yet.");
        } else {
          for (const m of meals) {
            const priceStr = m.price > 0 ? ` — $${m.price.toFixed(2)}` : "";
            console.log(`  - ${m.name} x${m.quantity}${priceStr} (${m.chef})`);
          }
          if (output.total_price > 0) {
            console.log();
            console.log(
              `Total: ${output.total_meals} meals, $${output.total_price.toFixed(2)}`,
            );
          }
        }
      } catch (error) {
        printError(error);
      }
    });

  program
    .command("skip <date>")
    .description("Skip a delivery week (YYYY-MM-DD)")
    .action(async (date: string) => {
      try {
        const days = await api.getUpcomingDays();
        const validDates = days.map((d) => d.date);
        if (!validDates.includes(date)) {
          console.error(
            `Error: "${date}" is not a valid delivery date. Available dates: ${validDates.join(", ")}`,
          );
          process.exit(1);
        }
        const result = await api.skipDelivery(date);
        if (result.__typename === "OrderCreationError") {
          console.error(
            `Error: ${result.error ?? "Failed to skip delivery"}. Check cutoff with 'deliveries'.`,
          );
          process.exit(1);
        }
        console.log(`Delivery for ${date} has been skipped. (Skip ID: ${result.id})`);
      } catch (error) {
        printError(error);
      }
    });

  program
    .command("unskip <date>")
    .description("Unskip a previously skipped delivery (YYYY-MM-DD)")
    .action(async (date: string) => {
      try {
        const days = await api.getUpcomingDays();
        const validDates = days.map((d) => d.date);
        if (!validDates.includes(date)) {
          console.error(
            `Error: "${date}" is not a valid delivery date. Available dates: ${validDates.join(", ")}`,
          );
          process.exit(1);
        }
        const result = await api.unskipDelivery(date);
        if (result.__typename === "OrderCreationError") {
          console.error(`Error: ${result.error ?? "Failed to unskip delivery"}.`);
          process.exit(1);
        }
        console.log(`Delivery for ${date} has been unskipped.`);
      } catch (error) {
        printError(error);
      }
    });
}
