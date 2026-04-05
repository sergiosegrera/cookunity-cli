#!/usr/bin/env bun
import { Command } from "commander";
import { registerCartCommands } from "./commands/cart.ts";
import { registerDeliveryCommands } from "./commands/deliveries.ts";
import { registerMenuCommands } from "./commands/menu.ts";
import { registerOrderCommands } from "./commands/order.ts";
import { registerPriceCommands } from "./commands/price.ts";
import { registerUserCommands } from "./commands/user.ts";
import { CookUnityAPI } from "./services/api.ts";

const email = process.env.COOKUNITY_EMAIL;
const password = process.env.COOKUNITY_PASSWORD;

if (!email || !password) {
  console.error(
    "Error: COOKUNITY_EMAIL and COOKUNITY_PASSWORD environment variables are required.",
  );
  process.exit(1);
}

const api = new CookUnityAPI(email, password);
const program = new Command();

program
  .name("cookunity")
  .description("CookUnity CLI — manage meals, cart, orders, and deliveries")
  .version("1.0.0");

registerMenuCommands(program, api);
registerDeliveryCommands(program, api);
registerCartCommands(program, api);
registerOrderCommands(program, api);
registerUserCommands(program, api);
registerPriceCommands(program, api);

await program.parseAsync(process.argv);
