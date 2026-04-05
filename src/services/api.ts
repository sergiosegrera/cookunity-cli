import { MENU_SERVICE_URL, SUBSCRIPTION_URL } from "../constants.ts";
import {
  CartItemSchema,
  CreateOrderResultSchema,
  DetailedMealSchema,
  InvoiceSchema,
  MenuSchema,
  OrderSchema,
  PriceBreakdownSchema,
  SkipResultSchema,
  tolerantArray,
  UpcomingDaySchema,
  UserInfoSchema,
} from "../schemas.ts";
import type {
  CartItem,
  CreateOrderResult,
  DetailedMeal,
  Invoice,
  Meal,
  MealInput,
  Menu,
  Order,
  PriceBreakdown,
  SkipResult,
  UpcomingDay,
  UserInfo,
} from "../types.ts";
import { CookUnityAuth } from "./auth.ts";

export class CookUnityAPI {
  private auth: CookUnityAuth;

  constructor(email: string, password: string) {
    this.auth = new CookUnityAuth(email, password);
  }

  async getMenu(date: string, filters: Record<string, unknown> = {}): Promise<Menu> {
    const query = `
      query getMenu($date: String!, $filters: MenuFilters!) {
        menu(date: $date, filters: $filters) {
          categories { id title subtitle label tag }
          meals {
            id batchId name shortDescription image imagePath price finalPrice premiumFee
            sku stock isNewMeal userRating inventoryId categoryId
            searchBy { cuisines chefFirstName chefLastName dietTags ingredients proteinTags }
            nutritionalFacts { calories fat carbs sodium fiber }
            chef { id firstName lastName }
            meatType category { id title label }
          }
        }
      }
    `;
    const data = await this.queryMenu(query, { date, filters });
    return MenuSchema.parse(data.menu);
  }

  async getMenuDetailed(date: string): Promise<DetailedMeal[]> {
    const query = `
      query getMenu($date: String!, $filters: MenuFilters!) {
        menu(date: $date, filters: $filters) {
          meals {
            id batchId name shortDescription image imagePath price finalPrice premiumFee
            sku stock isNewMeal userRating inventoryId categoryId
            searchBy { cuisines chefFirstName chefLastName dietTags ingredients proteinTags }
            nutritionalFacts { calories fat carbs sodium fiber protein sugar }
            chef { id firstName lastName }
            meatType category { id title label }
            allergens { name }
            ingredients { name }
          }
        }
      }
    `;
    const data = await this.queryMenu(query, { date, filters: {} });
    return MenuSchema.parse(data.menu).meals.map((m) => DetailedMealSchema.parse(m));
  }

  async getUserInfo(): Promise<UserInfo> {
    const query = `
      query {
        users {
          id name email plan_id store_id status
          deliveryDays { id day time_start time_end }
          currentCredit
          ring { id name is_local }
          addresses { id isActive city region postcode street }
          profiles { id firstname lastname }
        }
      }
    `;
    const data = await this.querySubscription(query);
    const users = tolerantArray(UserInfoSchema).parse(data.users);
    if (!users[0]) throw new Error("No user data returned from API");
    return users[0];
  }

  async getAllOrders(): Promise<Order[]> {
    const data = await this.querySubscription(`query { allOrders { id deliveryDate } }`);
    return tolerantArray(OrderSchema).parse(data.allOrders);
  }

  async getUpcomingDays(): Promise<UpcomingDay[]> {
    const query = `
      query upcomingDays {
        upcomingDays {
          id date displayDate available menuAvailable canEdit skip isPaused
          scheduled
          cutoff { time userTimeZone __typename }
          cart {
            product {
              id inventoryId name sku image_path price_incl_tax realPrice
              chef_firstname chef_lastname meat_type premium_special
              __typename
            }
            qty
            __typename
          }
          recommendation {
            meals {
              name inventoryId chef_firstname chef_lastname meat_type qty premium_special
              __typename
            }
            __typename
          }
          order {
            id grandTotal
            orderStatus { state status __typename }
            items {
              qty
              product {
                id inventoryId name chef_firstname chef_lastname meat_type premium_special
                __typename
              }
              price { price originalPrice __typename }
              __typename
            }
            __typename
          }
          __typename
        }
      }
    `;
    const data = await this.querySubscription(query, {}, "upcomingDays");
    return tolerantArray(UpcomingDaySchema).parse(data.upcomingDays);
  }

  async addMeal(
    date: string,
    inventoryId: string,
    quantity = 1,
    batchId?: number,
  ): Promise<{ added: CartItem; cart: CartItem[] }> {
    const mutation = `
      mutation addMeal($date: String!, $batch_id: Int, $quantity: Int!, $inventory_id: String) {
        addMeal(date: $date, batch_id: $batch_id, quantity: $quantity, inventory_id: $inventory_id) {
          qty: quantity
          inventoryId
        }
      }
    `;
    const data = await this.querySubscription(mutation, {
      date,
      batch_id: batchId,
      quantity,
      inventory_id: inventoryId,
    });
    const cart = CartItemSchema.array().parse(data.addMeal);
    const added = cart.find((item) => item.inventoryId === inventoryId) ?? {
      qty: quantity,
      inventoryId,
    };
    return { added, cart };
  }

  async removeMeal(date: string, inventoryId: string, quantity = 1): Promise<CartItem> {
    const mutation = `
      mutation removeProductFromCart($date: String!, $quantity: Int!, $inventory_id: String) {
        deleteMeal(date: $date, quantity: $quantity, inventory_id: $inventory_id) {
          qty: quantity
          inventoryId
        }
      }
    `;
    const data = await this.querySubscription(mutation, {
      date,
      quantity,
      inventory_id: inventoryId,
    });
    return CartItemSchema.parse(data.deleteMeal);
  }

  async clearCart(date: string): Promise<boolean> {
    await this.querySubscription(
      `mutation deleteCart($date: String!) { deleteCart(date: $date) }`,
      { date },
    );
    return true;
  }

  async skipDelivery(date: string): Promise<SkipResult> {
    const mutation = `
      mutation createSkip($skip: SkipInput!, $origin: OperationOrigin) {
        createSkip(skip: $skip, origin: $origin) {
          __typename
          ... on Skip { id }
          ... on OrderCreationError { error }
        }
      }
    `;
    const data = await this.querySubscription(mutation, {
      skip: { date, deliveryDate: date },
      origin: "unsubscription",
    });
    return SkipResultSchema.parse(data.createSkip);
  }

  async unskipDelivery(date: string): Promise<SkipResult> {
    const mutation = `
      mutation createUnskip($unskip: SkipInput!, $origin: OperationOrigin) {
        createUnskip(unskip: $unskip, origin: $origin) {
          __typename
          ... on Skip { id }
          ... on OrderCreationError { error }
        }
      }
    `;
    const data = await this.querySubscription(mutation, {
      unskip: { date, deliveryDate: date },
      origin: "unsubscription",
    });
    return SkipResultSchema.parse(data.createUnskip);
  }

  async createOrder(
    deliveryDate: string,
    start: string,
    end: string,
    products: Array<{ qty: number; inventoryId: string }>,
    options?: { comment?: string; tip?: number },
  ): Promise<CreateOrderResult> {
    const mutation = `
      mutation createOrder($order: CreateOrderInput!) {
        createOrder(order: $order) {
          __typename
          ... on OrderCreation { id deliveryDate paymentStatus }
          ... on OrderCreationError { error outOfStockIds }
        }
      }
    `;
    const order: Record<string, unknown> = {
      deliveryDate,
      start,
      end,
      products: products.map((p) => ({ qty: p.qty, inventoryId: p.inventoryId })),
    };
    if (options?.comment) order.comment = options.comment;
    if (options?.tip != null) order.tip = options.tip;
    const data = await this.querySubscription(mutation, { order });
    return CreateOrderResultSchema.parse(data.createOrder);
  }

  async getPriceBreakdown(date: string, meals: MealInput[]): Promise<PriceBreakdown> {
    const query = `
      query getOrderDetail($date: String!, $cartId: String, $meals: [MealInput]) {
        getOrderDetail(date: $date, cartId: $cartId, meals: $meals) {
          qtyPlanMeals qtyItems totalPlanPrice totalExtraMeals totalTaxes
          totalDeliveryFee totalExpressFee totalFee subTotalOrder
          totalPromoDiscount totalOrder availableCredits totalOrderWithCreditsSubtracted
        }
      }
    `;
    const data = await this.querySubscription(query, { date, meals });
    return PriceBreakdownSchema.parse(data.getOrderDetail);
  }

  async getInvoices(
    from: string,
    to: string,
    offset = 0,
    limit = 10,
  ): Promise<Invoice[]> {
    const query = `
      query getInvoices($date: InvoicesInput!, $liteVersion: Boolean!, $offset: Int, $limit: Int) {
        invoices(date: $date, liteVersion: $liteVersion, limit: $limit, offset: $offset) {
          id customerId date customerName deliveryAddress
          subtotal deliveryFee expressFee taxes tip discount chargedCredit total
          ccNumber planId createdAt updatedAt
          charges {
            id chargeId status stripeId
            refund { amount createdAt updatedAt __typename }
            createdAt updatedAt __typename
          }
          orders {
            id delivery_date display_date time_start time_end
            items {
              product {
                id name sku short_description image calories category_id
                sidedish chef_firstname chef_lastname meat_type stars user_rating
                premium_special
                review { id order product rating review reasons created_at __typename }
                __typename
              }
              price { price originalPrice priceIncludingTax basePriceIncludingTax __typename }
              qty __typename
            }
            __typename
          }
          __typename
        }
      }
    `;
    const data = await this.querySubscription(query, {
      date: { from, to },
      liteVersion: false,
      offset,
      limit,
    });
    return tolerantArray(InvoiceSchema).parse(data.invoices);
  }

  async searchMeals(keyword: string, date: string): Promise<Meal[]> {
    const menu = await this.getMenu(date);
    const term = keyword.toLowerCase();
    return menu.meals.filter((meal) => {
      if (meal.name.toLowerCase().includes(term)) return true;
      if (meal.shortDescription.toLowerCase().includes(term)) return true;
      const s = meal.searchBy;
      if (s.cuisines.some((c) => c.toLowerCase().includes(term))) return true;
      if (s.dietTags.some((t) => t.toLowerCase().includes(term))) return true;
      if (s.ingredients.some((i) => i.toLowerCase().includes(term))) return true;
      if (s.proteinTags.some((p) => p.toLowerCase().includes(term))) return true;
      if (`${s.chefFirstName} ${s.chefLastName}`.toLowerCase().includes(term))
        return true;
      if (meal.category.title.toLowerCase().includes(term)) return true;
      return false;
    });
  }

  private async queryMenu(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>> {
    return this.executeGraphQL(MENU_SERVICE_URL, query, variables);
  }

  private async querySubscription(
    query: string,
    variables: Record<string, unknown> = {},
    operationName?: string,
  ): Promise<Record<string, unknown>> {
    return this.executeGraphQL(SUBSCRIPTION_URL, query, variables, operationName);
  }

  private async executeGraphQL(
    endpoint: string,
    query: string,
    variables: Record<string, unknown> = {},
    operationName?: string,
  ): Promise<Record<string, unknown>> {
    const accessToken = await this.auth.getAccessToken();
    const body: Record<string, unknown> = { query, variables };
    if (operationName) body.operationName = operationName;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: accessToken,
        "Content-Type": "application/json",
        "User-Agent": "CookUnity-CLI/1.0.0",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      if (response.status === 401)
        throw new Error(
          "Authentication expired. Please check your COOKUNITY_EMAIL and COOKUNITY_PASSWORD.",
        );
      if (response.status === 429)
        throw new Error("Rate limited by CookUnity API. Please wait before retrying.");
      throw new Error(
        `CookUnity API error (HTTP ${response.status}): ${response.statusText}`,
      );
    }

    const result = (await response.json()) as {
      data?: Record<string, unknown>;
      errors?: Array<{ message: string }>;
    };
    if (result.errors) {
      throw new Error(
        `GraphQL errors: ${result.errors.map((e) => e.message).join(", ")}`,
      );
    }
    if (!result.data) throw new Error("No data returned from GraphQL API");
    return result.data;
  }
}
