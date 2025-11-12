import { z } from 'zod';

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, { message: 'Each mappedChild must be a valid ObjectId' });

export const createSubcategorySchema = z.object({
  sub_cat_name: z
    .string()
    .min(2, { message: 'Subcategory name must be at least 2 characters long' })
    .max(50, { message: 'Subcategory name must be less than 50 characters' }),

  uniqueId: z.string().optional(),
  liveUrl: z.string().optional(),

  mappedParent: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, { message: 'Invalid MongoDB ObjectId' }),
    

  metaTitle: z.string().optional(),
  metaKeyword: z.string().optional(),
  metaDescription: z.string().optional(),

  sub_cat_img_url: z
    .string()
    .url({ message: 'Image URL must be a valid URL' })
    .optional(),
    mappedChildren: z.array(objectIdSchema).optional(),
  description: z.string().optional(),
});

// TypeScript type inferred from Zod
export type CreateSubcategoryDto = z.infer<typeof createSubcategorySchema>;