import type { Command } from "commander";
import type { CookUnityAPI } from "../services/api.ts";
import { getNextMonday, printError } from "../services/helpers.ts";
import type { MealInput } from "../types.ts";

export function registerPriceCommands(program: Command, api: CookUnityAPI): void {
  program
    .command("price [date]")
    .description("Get full price breakdown for a delivery (uses current cart by default)")
    .option(
      "--meals <json>",
      'Meals to price as JSON array: [{"entityId":123,"quantity":1,"inventoryId":"ii-xxx"}]',
    )
    .option("--json", "Output as JSON")
    .action(
      async (date: string | undefined, opts: { meals?: string; json?: boolean }) => {
        try {
          const resolvedDate = date ?? getNextMonday();
          let meals: MealInput[];

          if (opts.meals) {
            try {
              meals = JSON.parse(opts.meals) as MealInput[];
            } catch {
              console.error(
                'Error: --meals must be a valid JSON array, e.g. \'[{"entityId":123,"quantity":1,"inventoryId":"ii-xxx"}]\'',
              );
              process.exit(1);
            }
          } else {
            // Use current cart contents
            const days = await api.getUpcomingDays();
            const day = days.find(
              (d) => d.date === resolvedDate || d.displayDate === resolvedDate,
            );
            if (!day?.cart || day.cart.length === 0) {
              console.error(
                `No meals in cart for ${resolvedDate}. Add meals with 'cart add' first, or pass --meals directly.`,
              );
              process.exit(1);
            }
            meals = day.cart.map((c) => ({
              entityId: Number(c.product.id),
              quantity: c.qty,
              inventoryId: c.product.inventoryId,
            }));
          }

          const breakdown = await api.getPriceBreakdown(resolvedDate, meals);

          const output = {
            date: resolvedDate,
            qty_plan_meals: breakdown.qtyPlanMeals,
            qty_items: breakdown.qtyItems,
            subtotal: breakdown.subTotalOrder,
            total_extra_meals: breakdown.totalExtraMeals,
            taxes: breakdown.totalTaxes,
            delivery_fee: breakdown.totalDeliveryFee,
            express_fee: breakdown.totalExpressFee,
            promo_discount: breakdown.totalPromoDiscount,
            total: breakdown.totalOrder,
            available_credits: breakdown.availableCredits,
            total_after_credits: breakdown.totalOrderWithCreditsSubtracted,
          };

          if (opts.json) {
            console.log(JSON.stringify(output, null, 2));
            return;
          }

          console.log(`Order Summary — ${resolvedDate}`);
          console.log();
          console.log(
            `  Plan meals (${output.qty_plan_meals}): $${output.subtotal.toFixed(2)}`,
          );
          if (output.total_extra_meals > 0) {
            console.log(`  Extra meals:         $${output.total_extra_meals.toFixed(2)}`);
          }
          if (output.promo_discount > 0) {
            console.log(`  Discount:           -$${output.promo_discount.toFixed(2)}`);
          }
          console.log(`  Delivery fee:        $${output.delivery_fee.toFixed(2)}`);
          if (output.express_fee > 0) {
            console.log(`  Express fee:         $${output.express_fee.toFixed(2)}`);
          }
          console.log(`  Taxes:               $${output.taxes.toFixed(2)}`);
          console.log("  ─────────────────────────────");
          console.log(`  ORDER TOTAL:         $${output.total.toFixed(2)}`);
          if (output.available_credits > 0) {
            console.log();
            console.log(`  Credits available:   $${output.available_credits.toFixed(2)}`);
            console.log(
              `  After credits:       $${output.total_after_credits.toFixed(2)}`,
            );
          }
        } catch (error) {
          printError(error);
        }
      },
    );
}
