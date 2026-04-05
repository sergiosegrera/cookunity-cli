import type { z } from "zod";
import type {
  AddressSchema,
  AllergenSchema,
  CartEntrySchema,
  CartItemSchema,
  CartProductSchema,
  ChefSchema,
  CreateOrderResultSchema,
  CutoffSchema,
  DeliveryDaySchema,
  DetailedMealSchema,
  IngredientSchema,
  InvoiceChargeSchema,
  InvoiceOrderItemPriceSchema,
  InvoiceOrderItemProductSchema,
  InvoiceOrderItemReviewSchema,
  InvoiceOrderItemSchema,
  InvoiceOrderSchema,
  InvoiceSchema,
  MealCategorySchema,
  MealSchema,
  MealSearchBySchema,
  MenuCategorySchema,
  MenuSchema,
  NutritionFactsSchema,
  OrderInfoSchema,
  OrderItemPriceSchema,
  OrderItemProductSchema,
  OrderItemSchema,
  OrderSchema,
  OrderStatusSchema,
  PriceBreakdownSchema,
  RecommendationMealSchema,
  RecommendationSchema,
  SkipResultSchema,
  UpcomingDaySchema,
  UserInfoSchema,
  UserProfileSchema,
} from "./schemas.ts";

// API response types — derived from Zod schemas
export type NutritionFacts = z.infer<typeof NutritionFactsSchema>;
export type MealSearchBy = z.infer<typeof MealSearchBySchema>;
export type Chef = z.infer<typeof ChefSchema>;
export type MealCategory = z.infer<typeof MealCategorySchema>;
export type Allergen = z.infer<typeof AllergenSchema>;
export type Ingredient = z.infer<typeof IngredientSchema>;
export type Meal = z.infer<typeof MealSchema>;
export type DetailedMeal = z.infer<typeof DetailedMealSchema>;
export type MenuCategory = z.infer<typeof MenuCategorySchema>;
export type Menu = z.infer<typeof MenuSchema>;
export type DeliveryDay = z.infer<typeof DeliveryDaySchema>;
export type Address = z.infer<typeof AddressSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserInfo = z.infer<typeof UserInfoSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type CartProduct = z.infer<typeof CartProductSchema>;
export type CartEntry = z.infer<typeof CartEntrySchema>;
export type Cutoff = z.infer<typeof CutoffSchema>;
export type OrderItemPrice = z.infer<typeof OrderItemPriceSchema>;
export type OrderItemProduct = z.infer<typeof OrderItemProductSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type OrderInfo = z.infer<typeof OrderInfoSchema>;
export type RecommendationMeal = z.infer<typeof RecommendationMealSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type UpcomingDay = z.infer<typeof UpcomingDaySchema>;
export type CartItem = z.infer<typeof CartItemSchema>;
export type SkipResult = z.infer<typeof SkipResultSchema>;
export type CreateOrderResult = z.infer<typeof CreateOrderResultSchema>;
export type PriceBreakdown = z.infer<typeof PriceBreakdownSchema>;
export type InvoiceCharge = z.infer<typeof InvoiceChargeSchema>;
export type InvoiceOrderItemReview = z.infer<typeof InvoiceOrderItemReviewSchema>;
export type InvoiceOrderItemProduct = z.infer<typeof InvoiceOrderItemProductSchema>;
export type InvoiceOrderItemPrice = z.infer<typeof InvoiceOrderItemPriceSchema>;
export type InvoiceOrderItem = z.infer<typeof InvoiceOrderItemSchema>;
export type InvoiceOrder = z.infer<typeof InvoiceOrderSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;

// Auth tokens (not from API, no schema needed)
export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

// CLI output types — not API responses, no schema needed
export interface FormattedMeal {
  id: string;
  name: string;
  description: string;
  chef: string;
  category: string;
  price: number;
  original_price: number;
  rating: number | null;
  inventory_id: string;
  batch_id: number;
  in_stock: boolean;
  stock: number;
  is_new: boolean;
  image: string;
  nutrition: NutritionFacts;
  tags: {
    cuisines: string[];
    diet_tags: string[];
    protein_tags: string[];
    ingredients: string[];
  };
  meat_type: string;
}

export interface DeliveryMealInfo {
  name: string;
  inventory_id: string;
  quantity: number;
  price: number;
  chef: string;
}

export interface DeliveryInfo {
  date: string;
  status: "locked" | "active" | "skipped" | "paused";
  can_edit: boolean;
  menu_available: boolean;
  cutoff: string | null;
  cutoff_timezone: string | null;
  cart_items: DeliveryMealInfo[];
  cart_count: number;
  order: {
    id: string;
    status: string | null;
    grand_total: number;
    items: DeliveryMealInfo[];
    item_count: number;
  } | null;
  recommendation_items: DeliveryMealInfo[];
  recommendation_count: number;
}

export interface MealInput {
  entityId: string | number;
  quantity: number;
  inventoryId: string;
}
