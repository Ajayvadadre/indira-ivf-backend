import { z } from "zod";

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    price: z.coerce.number().min(0),
    sku: z.string().min(1, "SKU is required"),
    category: z.string().min(1, "Category is required"),
    stock: z.coerce.number().min(0),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    price: z.coerce.number().min(0).optional(),
    sku: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    stock: z.coerce.number().min(0).optional(),
    isActive: z.coerce.boolean().optional(),
  }),
});
