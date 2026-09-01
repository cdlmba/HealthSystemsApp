import { z } from 'zod';

export const HealthLogSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  weight: z.number().positive().optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  energyLevel: z.number().min(1).max(10).optional(),
  stressLevel: z.number().min(1).max(10).optional(),
  notes: z.string().max(5000).optional().nullable(),
});

export const FoodLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string(),
  name: z.string().min(1),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
});

export const WorkoutSessionSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  date: z.string(),
  type: z.string(),
  durationMinutes: z.number().min(1),
  notes: z.string().max(2000).optional().nullable(),
});
