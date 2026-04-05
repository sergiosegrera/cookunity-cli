import type { Command } from "commander";
import type { CookUnityAPI } from "../services/api.ts";
import { printError } from "../services/helpers.ts";

export function registerCartCommands(program: Command, api: CookUnityAPI): void {
  const cart = program.command("cart").description("Manage cart");

  cart
    .command("add <inventoryId> <date>")
    .description("Add a meal to the cart for a delivery date")
    .option("--qty <n>", "Portions to add (default 1, max 10)", Number, 1)
    .option("--batch-id <n>", "Batch ID from menu results", Number)
    .option("--json", "Output as JSON")
    .action(
      async (
        inventoryId: string,
        date: string,
        opts: { qty: number; batchId?: number; json?: boolean },
      ) => {
        try {
          const { added, cart: updatedCart } = await api.addMeal(
            date,
            inventoryId,
            opts.qty,
            opts.batchId,
          );
          const totalItems = updatedCart.reduce((sum, item) => sum + item.qty, 0);
          const output = {
            success: true,
            date,
            inventory_id: added.inventoryId,
            quantity: added.qty,
            cart_total_items: totalItems,
            message: `Added ${opts.qty} portion(s) to cart for ${date}. Cart now has ${totalItems} item(s).`,
          };
          if (opts.json) {
            console.log(JSON.stringify(output, null, 2));
          } else {
            console.log(output.message);
          }
        } catch (error) {
          printError(error);
        }
      },
    );

  cart
    .command("remove <inventoryId> <date>")
    .description("Remove a meal from the cart")
    .option("--qty <n>", "Portions to remove (default 1)", Number, 1)
    .option("--json", "Output as JSON")
    .action(
      async (
        inventoryId: string,
        date: string,
        opts: { qty: number; json?: boolean },
      ) => {
        try {
          const result = await api.removeMeal(date, inventoryId, opts.qty);
          const output = {
            success: true,
            date,
            inventory_id: result.inventoryId,
            remaining_quantity: result.qty,
            message: `Removed ${opts.qty} portion(s) from cart for ${date}.`,
          };
          if (opts.json) {
            console.log(JSON.stringify(output, null, 2));
          } else {
            console.log(output.message);
          }
        } catch (error) {
          printError(error);
        }
      },
    );

  cart
    .command("clear <date>")
    .description("Clear all items from the cart for a delivery date")
    .option("--json", "Output as JSON")
    .action(async (date: string, opts: { json?: boolean }) => {
      try {
        await api.clearCart(date);
        const output = { success: true, date, message: `Cart cleared for ${date}.` };
        if (opts.json) {
          console.log(JSON.stringify(output, null, 2));
        } else {
          console.log(output.message);
        }
      } catch (error) {
        printError(error);
      }
    });

  cart
    .command("show [date]")
    .description("Show cart contents for a delivery date")
    .option("--json", "Output as JSON")
    .action(async (date: string | undefined, opts: { json?: boolean }) => {
      try {
        const days = await api.getUpcomingDays();
        const resolvedDate = date ?? new Date().toISOString().split("T")[0] ?? "";
        const day = days.find(
          (d) => d.date === resolvedDate || d.displayDate === resolvedDate,
        );
        if (!day) {
          console.error(
            `Error: Date ${resolvedDate} not found in upcoming deliveries. Use 'deliveries' to see available dates.`,
          );
          process.exit(1);
        }

        const items = (day.cart || []).map((c) => ({
          name: c.product?.name ?? "Unknown",
          inventory_id: c.product?.inventoryId ?? "",
          quantity: c.qty,
          price: c.product?.price_incl_tax ?? 0,
          chef: `${c.product?.chef_firstname ?? ""} ${c.product?.chef_lastname ?? ""}`.trim(),
        }));

        const output = {
          date: day.displayDate,
          can_edit: day.canEdit,
          is_skipped: day.skip,
          cutoff: day.cutoff?.time ?? null,
          items,
          total_items: items.reduce((s, i) => s + i.quantity, 0),
          total_price: items.reduce((s, i) => s + i.price * i.quantity, 0),
        };

        if (opts.json) {
          console.log(JSON.stringify(output, null, 2));
          return;
        }

        console.log(
          `Cart — ${output.date} [${day.skip ? "SKIPPED" : day.canEdit ? "EDITABLE" : "LOCKED"}]`,
        );
        console.log();
        if (items.length === 0) {
          console.log("Cart is empty.");
        } else {
          for (const item of items) {
            console.log(
              `  - ${item.name} x${item.quantity} — $${item.price.toFixed(2)} (${item.chef})`,
            );
          }
          console.log();
          console.log(
            `Total: ${output.total_items} items, $${output.total_price.toFixed(2)}`,
          );
        }
      } catch (error) {
        printError(error);
      }
    });
}
