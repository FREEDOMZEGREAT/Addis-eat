import { z } from "zod";
const phoneRegex = /^(09\d{8}|\+2519\d{8})$/;
export const DELIVERY_AREAS = ["Bole", "Kazanchis", "Piassa", "Megenagna", "CMC", "AyerTena", "Mexico", "SarBet", "Saris"];

export const AREA_FEE = {
  Bole: 0,
  Kazanchis: 30,
  Piassa: 50,
  Megenagna: 60,
  CMC: 50,
  AyerTena: 80,
  Mexico: 100,
  SarBet: 70,
  Saris: 90,
};

export const dishCategories = [
  "ethiopian",
  "pizza",
  "burgers",
  "drinks",
  "desserts",
  "breakfast",
];

const csvList = z
  .string()
  .trim()
  .max(300, "Keep this under 300 characters")
  .optional()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, 20),
  );

export const dishSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  description: z
    .string()
    .trim()
    .min(10, "Add a short description")
    .max(600, "Keep the description under 600 characters"),
  price: z.coerce
    .number()
    .int("Use whole birr")
    .positive("Price must be greater than zero"),
  category: z.enum(dishCategories, {
    message: "Pick a category",
  }),
  prepMinutes: z.coerce
    .number()
    .int()
    .positive("Prep time must be positive")
    .max(240, "Prep time must be under 4 hours"),
  available: z.coerce.boolean(),
  tags: csvList,
  ingredients: csvList,
});

export const orderSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  phone: z.string().trim().regex(phoneRegex, "Use 09xxxxxxxx or +2519xxxxxxxx"),
  area: z.enum(DELIVERY_AREAS, {
    message: "Pick a delivery area",
  }),
  address: z
    .string()
    .trim()
    .max(160, "Keep the address under 160 characters")
    .optional()
    .default(""),
  note: z
    .string()
    .trim()
    .max(280, "Keep the note under 280 characters")
    .optional()
    .default(""),
  items: z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]).transform(String),
        qty: z.coerce.number().int().positive(),
      }),
    )
    .min(1, "Cart is empty"),
});
