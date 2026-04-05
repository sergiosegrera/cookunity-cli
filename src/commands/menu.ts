import type { Command } from "commander";
import type { CookUnityAPI } from "../services/api.ts";
import {
  formatMeal,
  formatMealText,
  getNextMonday,
  printError,
} from "../services/helpers.ts";

export function registerMenuCommands(program: Command, api: CookUnityAPI): void {
  program
    .command("menu [date]")
    .description("Browse available meals for a delivery date")
    .option("--category <category>", "Filter by category (e.g. Bowls, Protein+)")
    .option("--diet <diet>", "Filter by diet tag (e.g. vegan, gluten-free)")
    .option("--max-price <price>", "Max price in dollars", Number)
    .option("--min-rating <rating>", "Min rating 0-5", Number)
    .option("--limit <n>", "Results per page (default 20)", Number, 20)
    .option("--offset <n>", "Pagination offset (default 0)", Number, 0)
    .option("--json", "Output as JSON")
    .action(
      async (
        date: string | undefined,
        opts: {
          category?: string;
          diet?: string;
          maxPrice?: number;
          minRating?: number;
          limit: number;
          offset: number;
          json?: boolean;
        },
      ) => {
        try {
          const resolvedDate = date ?? getNextMonday();
          const menu = await api.getMenu(resolvedDate);
          let meals = menu.meals;

          if (opts.category) {
            const cat = opts.category.toLowerCase();
            meals = meals.filter((m) => m.category.title.toLowerCase().includes(cat));
          }
          if (opts.diet) {
            const diet = opts.diet.toLowerCase();
            meals = meals.filter((m) =>
              m.searchBy.dietTags.some((t) => t.toLowerCase().includes(diet)),
            );
          }
          if (opts.maxPrice !== undefined) {
            const maxPrice = opts.maxPrice;
            meals = meals.filter((m) => m.finalPrice <= maxPrice);
          }
          if (opts.minRating !== undefined) {
            const minRating = opts.minRating;
            meals = meals.filter((m) => m.userRating >= minRating);
          }

          const total = meals.length;
          const paged = meals.slice(opts.offset, opts.offset + opts.limit);
          const formatted = paged.map(formatMeal);
          const hasMore = total > opts.offset + paged.length;

          const output = {
            date: resolvedDate,
            total,
            count: formatted.length,
            offset: opts.offset,
            has_more: hasMore,
            ...(hasMore ? { next_offset: opts.offset + paged.length } : {}),
            categories: menu.categories.map((c) => ({ id: c.id, title: c.title })),
            meals: formatted,
          };

          if (opts.json) {
            console.log(JSON.stringify(output, null, 2));
          } else {
            console.log(`CookUnity Menu — ${resolvedDate}`);
            console.log(
              `Showing ${formatted.length} of ${total} meals (offset ${opts.offset})`,
            );
            console.log();
            for (const m of formatted) {
              console.log(formatMealText(m));
              console.log();
            }
            if (hasMore) {
              console.log(
                `More meals available. Use --offset ${opts.offset + paged.length} to see next page.`,
              );
            }
          }
        } catch (error) {
          printError(error);
        }
      },
    );

  program
    .command("search <keyword> [date]")
    .description("Search meals by keyword")
    .option("--limit <n>", "Results per page (default 20)", Number, 20)
    .option("--offset <n>", "Pagination offset (default 0)", Number, 0)
    .option("--json", "Output as JSON")
    .action(
      async (
        keyword: string,
        date: string | undefined,
        opts: { limit: number; offset: number; json?: boolean },
      ) => {
        try {
          const resolvedDate = date ?? getNextMonday();
          const results = await api.searchMeals(keyword, resolvedDate);
          const total = results.length;
          const paged = results.slice(opts.offset, opts.offset + opts.limit);
          const formatted = paged.map(formatMeal);
          const hasMore = total > opts.offset + paged.length;

          const output = {
            query: keyword,
            date: resolvedDate,
            total,
            count: formatted.length,
            offset: opts.offset,
            has_more: hasMore,
            ...(hasMore ? { next_offset: opts.offset + paged.length } : {}),
            meals: formatted,
          };

          if (opts.json) {
            console.log(JSON.stringify(output, null, 2));
          } else {
            console.log(`Search: "${keyword}" — ${resolvedDate}`);
            console.log(`Found ${total} meals`);
            console.log();
            for (const m of formatted) {
              console.log(formatMealText(m));
              console.log();
            }
            if (hasMore) {
              console.log(`Use --offset ${opts.offset + paged.length} for more results.`);
            }
          }
        } catch (error) {
          printError(error);
        }
      },
    );

  program
    .command("meal <id>")
    .description("Get full details for a meal by inventory ID or numeric meal ID")
    .option("--date <date>", "Menu date YYYY-MM-DD (defaults to next Monday)")
    .option("--json", "Output as JSON")
    .action(async (id: string, opts: { date?: string; json?: boolean }) => {
      try {
        const resolvedDate = opts.date ?? getNextMonday();
        const meals = await api.getMenuDetailed(resolvedDate);

        const meal = meals.find((m) => {
          if (String(m.id) === id) return true;
          if (m.inventoryId === id) return true;
          return false;
        });

        if (!meal) {
          console.error(
            `Error: Meal not found (${id}) for date ${resolvedDate}. The menu changes weekly — try a different date or use 'search' to find it.`,
          );
          process.exit(1);
        }

        const output = {
          id: meal.id,
          name: meal.name,
          description: meal.shortDescription,
          sku: meal.sku,
          batch_id: meal.batchId,
          inventory_id: meal.inventoryId,
          price: meal.finalPrice,
          original_price: meal.price,
          premium_fee: meal.premiumFee,
          rating: meal.userRating,
          in_stock: meal.stock > 0,
          stock: meal.stock,
          is_new: meal.isNewMeal,
          image: meal.image,
          meat_type: meal.meatType,
          category: meal.category.title,
          chef: {
            id: meal.chef.id,
            name: `${meal.chef.firstName} ${meal.chef.lastName}`,
          },
          nutrition: meal.nutritionalFacts,
          allergens: (meal.allergens || []).map((a) => a.name),
          ingredients: (meal.ingredients || []).map((i) => i.name),
          tags: {
            cuisines: meal.searchBy.cuisines,
            diet_tags: meal.searchBy.dietTags,
            protein_tags: meal.searchBy.proteinTags,
          },
          date: resolvedDate,
        };

        if (opts.json) {
          console.log(JSON.stringify(output, null, 2));
        } else {
          const n = meal.nutritionalFacts;
          console.log(`${meal.name}${meal.isNewMeal ? " [NEW]" : ""}`);
          console.log(`${meal.shortDescription}`);
          console.log();
          console.log(
            `Chef: ${output.chef.name} | Category: ${output.category} | ${meal.meatType}`,
          );
          console.log(
            `Price: $${meal.finalPrice.toFixed(2)}${meal.premiumFee > 0 ? ` (+$${meal.premiumFee.toFixed(2)} premium)` : ""} | Rating: ${meal.userRating != null ? `${meal.userRating}/5` : "—"} | Stock: ${meal.stock > 0 ? meal.stock : "Out of stock"}`,
          );
          console.log(`SKU: ${meal.sku} | Inventory ID: ${meal.inventoryId}`);
          console.log();
          console.log("Nutrition:");
          console.log(
            `  Calories: ${n.calories} | Protein: ${n.protein ?? "—"}g | Fat: ${n.fat}g | Carbs: ${n.carbs}g | Fiber: ${n.fiber}g | Sugar: ${n.sugar ?? "—"}g | Sodium: ${n.sodium}mg`,
          );
          console.log();
          console.log("Ingredients:");
          if ((meal.ingredients || []).length > 0) {
            console.log(`  ${(meal.ingredients || []).map((i) => i.name).join(", ")}`);
          } else {
            console.log("  No ingredient data available");
          }
          console.log();
          console.log("Allergens:");
          if ((meal.allergens || []).length > 0) {
            console.log(`  ${(meal.allergens || []).map((a) => a.name).join(", ")}`);
          } else {
            console.log("  None listed");
          }
          if (meal.searchBy.dietTags.length > 0) {
            console.log();
            console.log(`Diet tags: ${meal.searchBy.dietTags.join(", ")}`);
          }
          if (meal.searchBy.cuisines.length > 0) {
            console.log(`Cuisines: ${meal.searchBy.cuisines.join(", ")}`);
          }
        }
      } catch (error) {
        printError(error);
      }
    });
}
