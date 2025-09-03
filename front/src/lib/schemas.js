import { z } from "zod";

// Login Schema
export const loginSchema = z.object({
  username: z.string().min(1, "Usuario requerido"),
  password: z.string().min(1, "Contraseña requerida"),
});

// Trip Schema
export const tripSchema = z
  .object({
    origin: z.string().min(1, "Origen requerido"),
    destination: z.string().min(1, "Destino requerido"),
    passenger_count: z
      .number()
      .min(1, "Mínimo 1 pasajero")
      .max(10, "Máximo 10 pasajeros"),
    passenger_reference: z.string().optional(),
    comments: z.string().optional(),
    payment_method: z
      .enum(["cash", "card", "transfer", "other"])
      .default("cash"),
    payment_in_usd: z.boolean().default(false),
    amount_mxn: z.number().min(0, "Monto debe ser positivo").optional(),
    amount_usd: z.number().min(0, "Monto debe ser positivo").optional(),
    exchange_rate: z
      .number()
      .min(0, "Tipo de cambio debe ser positivo")
      .optional(),
    is_scheduled: z.boolean().default(false),
    scheduled_datetime: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.payment_in_usd && !data.amount_usd) {
        return false;
      }
      if (!data.payment_in_usd && !data.amount_mxn) {
        return false;
      }
      if (data.payment_in_usd && !data.exchange_rate) {
        return false;
      }
      return true;
    },
    {
      message: "Monto y tipo de cambio requeridos según el tipo de pago",
    }
  );

// Pause Schema
export const pauseSchema = z.object({
  reason_id: z.number().min(1, "Motivo requerido"),
  notes: z.string().optional(),
});

// Cancel Schema
export const cancelSchema = z.object({
  refund_credit: z.boolean().default(false),
});
