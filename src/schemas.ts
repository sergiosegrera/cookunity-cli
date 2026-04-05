import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitives / re-usable
// ---------------------------------------------------------------------------

const strArr = z.array(z.string()).catch([]);

/**
 * Parses an array, skipping individual items that fail validation instead of
 * dropping the entire array. Use this for top-level API response arrays.
 */
export function tolerantArray<T extends z.ZodTypeAny>(schema: T) {
  return z
    .array(z.unknown())
    .catch([])
    .transform((arr) =>
      arr.flatMap((item) => {
        const result = schema.safeParse(item);
        return result.success ? [result.data as z.infer<T>] : [];
      }),
    );
}

// ---------------------------------------------------------------------------
// Meal
// ---------------------------------------------------------------------------

export const NutritionFactsSchema = z.object({
  calories: z.coerce.number().catch(0),
  fat: z.coerce.number().catch(0),
  carbs: z.coerce.number().catch(0),
  sodium: z.coerce.number().catch(0),
  fiber: z.coerce.number().catch(0),
  protein: z.coerce.number().nullish(),
  sugar: z.coerce.number().nullish(),
});

export const MealSearchBySchema = z.object({
  cuisines: strArr,
  chefFirstName: z.string().catch(""),
  chefLastName: z.string().catch(""),
  dietTags: strArr,
  ingredients: strArr,
  proteinTags: strArr,
});

export const ChefSchema = z.object({
  id: z.string().catch(""),
  firstName: z.string().catch(""),
  lastName: z.string().catch(""),
});

export const MealCategorySchema = z.object({
  id: z.string().catch(""),
  title: z.string().catch(""),
  label: z.string().catch(""),
});

export const AllergenSchema = z.object({ name: z.string() });
export const IngredientSchema = z.object({ name: z.string() });

export const MealSchema = z.object({
  id: z.string().catch(""),
  batchId: z.number().catch(0),
  name: z.string().catch(""),
  shortDescription: z.string().catch(""),
  image: z.string().catch(""),
  imagePath: z.string().catch(""),
  price: z.number().catch(0),
  finalPrice: z.number().catch(0),
  premiumFee: z.number().catch(0),
  sku: z.string().catch(""),
  stock: z.number().catch(0),
  isNewMeal: z.boolean().catch(false),
  userRating: z.number().nullable().catch(null),
  inventoryId: z.string().catch(""),
  categoryId: z.string().catch(""),
  searchBy: MealSearchBySchema.catch({
    cuisines: [],
    chefFirstName: "",
    chefLastName: "",
    dietTags: [],
    ingredients: [],
    proteinTags: [],
  }),
  nutritionalFacts: NutritionFactsSchema.catch({
    calories: 0,
    fat: 0,
    carbs: 0,
    sodium: 0,
    fiber: 0,
  }),
  chef: ChefSchema.catch({ id: "", firstName: "", lastName: "" }),
  meatType: z.string().catch(""),
  category: MealCategorySchema.catch({ id: "", title: "", label: "" }),
  allergens: z.array(AllergenSchema).nullable().catch(null),
  ingredients: z.array(IngredientSchema).nullable().catch(null),
});

export const DetailedMealSchema = MealSchema.extend({
  allergens: z.array(AllergenSchema).catch([]),
  ingredients: z.array(IngredientSchema).catch([]),
});

export const MenuCategorySchema = z.object({
  id: z.string().catch(""),
  title: z.string().catch(""),
  subtitle: z.string().catch(""),
  label: z.string().catch(""),
  tag: z.string().catch(""),
});

export const MenuSchema = z.object({
  categories: tolerantArray(MenuCategorySchema),
  meals: tolerantArray(MealSchema),
});

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export const DeliveryDaySchema = z.object({
  id: z.string().catch(""),
  day: z.string().catch(""),
  time_start: z.string().catch(""),
  time_end: z.string().catch(""),
});

export const AddressSchema = z.object({
  id: z.string().catch(""),
  isActive: z.boolean().catch(false),
  city: z.string().catch(""),
  region: z.string().catch(""),
  postcode: z.string().catch(""),
  street: z.string().catch(""),
});

export const UserProfileSchema = z.object({
  id: z.string().catch(""),
  firstname: z.string().catch(""),
  lastname: z.string().catch(""),
});

export const UserInfoSchema = z.object({
  id: z.string().catch(""),
  name: z.string().catch(""),
  email: z.string().catch(""),
  plan_id: z.string().catch(""),
  store_id: z.string().catch(""),
  status: z.string().catch(""),
  deliveryDays: z.array(DeliveryDaySchema).catch([]),
  currentCredit: z.number().catch(0),
  ring: z
    .object({
      id: z.string().catch(""),
      name: z.string().catch(""),
      is_local: z.boolean().catch(false),
    })
    .nullish(),
  addresses: z.array(AddressSchema).catch([]),
  profiles: z.array(UserProfileSchema).catch([]),
});

export const OrderSchema = z.object({
  id: z.string().catch(""),
  deliveryDate: z.string().catch(""),
});

// ---------------------------------------------------------------------------
// Cart / upcoming days
// ---------------------------------------------------------------------------

export const CartProductSchema = z.object({
  id: z.string().catch(""),
  inventoryId: z.string().catch(""),
  name: z.string().catch(""),
  sku: z.string().catch(""),
  image_path: z.string().catch(""),
  price_incl_tax: z.number().catch(0),
  realPrice: z.number().nullish(),
  chef_firstname: z.string().catch(""),
  chef_lastname: z.string().catch(""),
  meat_type: z.string().catch(""),
  premium_special: z.boolean().nullish(),
});

export const CartEntrySchema = z.object({
  product: CartProductSchema,
  qty: z.number().catch(0),
});

export const CutoffSchema = z.object({
  time: z.string().catch(""),
  userTimeZone: z.string().catch(""),
});

export const OrderItemPriceSchema = z.object({
  price: z.number().catch(0),
  originalPrice: z.number().nullish(),
});

export const OrderItemProductSchema = z.object({
  id: z.string().catch(""),
  inventoryId: z.string().catch(""),
  name: z.string().catch(""),
  chef_firstname: z.string().catch(""),
  chef_lastname: z.string().catch(""),
  meat_type: z.string().nullable().catch(null),
  premium_special: z.boolean().nullish(),
});

export const OrderItemSchema = z.object({
  qty: z.number().catch(0),
  product: OrderItemProductSchema,
  price: OrderItemPriceSchema,
});

export const OrderStatusSchema = z.object({
  state: z.string().nullable().catch(null),
  status: z.string().nullable().catch(null),
});

export const OrderInfoSchema = z.object({
  id: z.string().catch(""),
  grandTotal: z.number().catch(0),
  orderStatus: OrderStatusSchema.nullable().catch(null),
  items: z.array(OrderItemSchema).catch([]),
});

export const RecommendationMealSchema = z.object({
  name: z.string().catch(""),
  inventoryId: z.string().catch(""),
  chef_firstname: z.string().catch(""),
  chef_lastname: z.string().catch(""),
  meat_type: z.string().nullable().catch(null),
  qty: z.number().catch(1),
  premium_special: z.boolean().nullish(),
});

export const RecommendationSchema = z.object({
  meals: z.array(RecommendationMealSchema).catch([]),
});

export const UpcomingDaySchema = z.object({
  id: z.string().catch(""),
  date: z.string().catch(""),
  displayDate: z.string().catch(""),
  available: z.boolean().catch(false),
  menuAvailable: z.boolean().catch(false),
  canEdit: z.boolean().catch(false),
  skip: z.boolean().catch(false),
  isPaused: z.boolean().catch(false),
  scheduled: z.boolean().catch(false),
  cutoff: CutoffSchema.nullable().catch(null),
  cart: z.array(CartEntrySchema).catch([]),
  order: OrderInfoSchema.nullable().catch(null),
  recommendation: RecommendationSchema.nullable().catch(null),
});

export const CartItemSchema = z.object({
  qty: z.number().catch(0),
  inventoryId: z.string().catch(""),
});

export const SkipResultSchema = z.object({
  __typename: z.string().catch(""),
  id: z.string().optional(),
  error: z.string().optional(),
});

export const CreateOrderResultSchema = z.object({
  __typename: z.string().catch(""),
  id: z.string().optional(),
  deliveryDate: z.string().optional(),
  paymentStatus: z.string().optional(),
  error: z.string().optional(),
  outOfStockIds: z.array(z.string()).optional(),
});

// ---------------------------------------------------------------------------
// Price breakdown
// ---------------------------------------------------------------------------

export const PriceBreakdownSchema = z.object({
  qtyPlanMeals: z.number().catch(0),
  qtyItems: z.number().catch(0),
  totalPlanPrice: z.number().catch(0),
  totalExtraMeals: z.number().catch(0),
  totalTaxes: z.number().catch(0),
  totalDeliveryFee: z.number().catch(0),
  totalExpressFee: z.number().catch(0),
  totalFee: z.number().catch(0),
  subTotalOrder: z.number().catch(0),
  totalPromoDiscount: z.number().catch(0),
  totalOrder: z.number().catch(0),
  availableCredits: z.number().catch(0),
  totalOrderWithCreditsSubtracted: z.number().catch(0),
});

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export const InvoiceChargeSchema = z.object({
  id: z.string().catch(""),
  chargeId: z.string().catch(""),
  status: z.string().catch(""),
  stripeId: z.string().catch(""),
  refund: z
    .object({
      amount: z.number(),
      createdAt: z.string().catch(""),
      updatedAt: z.string().catch(""),
    })
    .nullable()
    .catch(null),
});

export const InvoiceOrderItemReviewSchema = z.object({
  id: z.string().catch(""),
  order: z.string().catch(""),
  product: z.string().catch(""),
  rating: z.number().catch(0),
  review: z.string().nullable().catch(null),
  reasons: z.string().nullable().catch(null),
  created_at: z.string().catch(""),
});

export const InvoiceOrderItemProductSchema = z.object({
  id: z.string().catch(""),
  name: z.string().catch(""),
  sku: z.string().catch(""),
  short_description: z.string().catch(""),
  image: z.string().catch(""),
  calories: z.string().catch("0"),
  category_id: z.number().catch(0),
  sidedish: z.string().catch(""),
  chef_firstname: z.string().catch(""),
  chef_lastname: z.string().catch(""),
  meat_type: z.string().nullable().catch(null),
  stars: z.number().nullable().catch(null),
  user_rating: z.number().nullable().catch(null),
  premium_special: z.boolean().nullable().catch(null),
  review: InvoiceOrderItemReviewSchema.nullable().catch(null),
});

export const InvoiceOrderItemPriceSchema = z.object({
  price: z.number().catch(0),
  originalPrice: z.number().nullable().catch(null),
  priceIncludingTax: z.number().catch(0),
  basePriceIncludingTax: z.number().catch(0),
});

export const InvoiceOrderItemSchema = z.object({
  product: InvoiceOrderItemProductSchema,
  price: InvoiceOrderItemPriceSchema,
  qty: z.number().catch(1),
});

export const InvoiceOrderSchema = z.object({
  id: z.string().catch(""),
  delivery_date: z.string().catch(""),
  display_date: z.string().catch(""),
  time_start: z.string().catch(""),
  time_end: z.string().catch(""),
  items: z.array(InvoiceOrderItemSchema).catch([]),
});

export const InvoiceSchema = z.object({
  id: z.string().catch(""),
  customerId: z.string().catch(""),
  date: z.string().catch(""),
  customerName: z.string().catch(""),
  deliveryAddress: z.string().catch(""),
  subtotal: z.number().catch(0),
  deliveryFee: z.number().catch(0),
  expressFee: z.number().catch(0),
  taxes: z.number().catch(0),
  tip: z.number().catch(0),
  discount: z.number().catch(0),
  chargedCredit: z.number().catch(0),
  total: z.number().catch(0),
  ccNumber: z.string().catch(""),
  planId: z.number().catch(0),
  createdAt: z.string().catch(""),
  updatedAt: z.string().catch(""),
  charges: z.array(InvoiceChargeSchema).catch([]),
  orders: z.array(InvoiceOrderSchema).catch([]),
});
