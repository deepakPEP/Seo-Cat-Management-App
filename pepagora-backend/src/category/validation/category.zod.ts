import { z } from 'zod';

// Define the Zod schema for Category

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, { message: 'Each mappedChild must be a valid ObjectId' });

export const createCategorySchema = z.object({
  main_cat_name: z
    .string()
    .min(2, { message: 'Category name must be at least 2 characters long' })
    .max(50, { message: 'Category name must be less than 50 characters' }),

  uniqueId: z.string().optional(),
  liveUrl: z.string().optional(),
  metaTitle: z
    .string()
    .optional(),

  metaKeyword: z
    .string()
    .optional(),

  metaDescription: z
    .string()
    .optional(),


  imageUrl: z
    .string()
    .url({ message: 'Image URL must be a valid URL' })
    .optional(),

    mappedChildren: z.array(objectIdSchema).optional(),

     // ✅ New: Paragraph description
  description: z.string().optional(),

  // ✅ New: Array of product names

});

// Infer TypeScript type from Zod schema
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
