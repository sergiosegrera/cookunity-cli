import type { Command } from "commander";
import type { CookUnityAPI } from "../services/api.ts";
import { printError } from "../services/helpers.ts";

export function registerOrderCommands(program: Command, api: CookUnityAPI): void {
  const order = program.command("order").description("Manage orders");

  order
    .command("confirm <date>")
    .description("Confirm/place the order from cart contents for a delivery date")
    .option("--comment <text>", "Delivery instructions")
    .option("--tip <amount>", "Tip amount in dollars", Number)
    .option("--json", "Output as JSON")
    .action(
      async (date: string, opts: { comment?: string; tip?: number; json?: boolean }) => {
        try {
          const days = await api.getUpcomingDays();
          const day = days.find((d) => d.date === date);
          if (!day) {
            console.error(
              `No delivery found for ${date}. Check available dates with 'deliveries'.`,
            );
            process.exit(1);
          }
          if (!day.cart || day.cart.length === 0) {
            console.error(`Cart is empty for ${date}. Add meals first with 'cart add'.`);
            process.exit(1);
          }

          const products = day.cart.map((item) => ({
            qty: item.qty,
            inventoryId: item.product.inventoryId,
          }));

          // Pull delivery window from user profile, fallback to common defaults
          let start = "11:00";
          let end = "20:00";
          try {
            const userInfo = await api.getUserInfo();
            if (userInfo.deliveryDays?.length) {
              start = userInfo.deliveryDays[0]?.time_start ?? start;
              end = userInfo.deliveryDays[0]?.time_end ?? end;
            }
          } catch {
            // fall back to defaults if user info fetch fails
          }

          const result = await api.createOrder(date, start, end, products, {
            comment: opts.comment,
            tip: opts.tip,
          });

          if (result.__typename === "OrderCreationError") {
            const msg = result.error ?? "Unknown error";
            const oos = result.outOfStockIds?.length
              ? ` Out of stock: ${result.outOfStockIds.join(", ")}`
              : "";
            console.error(`Order failed: ${msg}${oos}`);
            process.exit(1);
          }

          const output = {
            success: true,
            order_id: result.id,
            delivery_date: result.deliveryDate,
            payment_status: result.paymentStatus,
            meals_confirmed: products.length,
            message: `Order confirmed for ${date}! ${products.length} meals locked in. Order ID: ${result.id}`,
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
}
