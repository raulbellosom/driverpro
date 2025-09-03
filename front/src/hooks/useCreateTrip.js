import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export const useCreateTrip = () => {
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const createTrip = async (tripData, files = []) => {
    setIsCreating(true);

    try {
      // Crear FormData para enviar archivos
      const formData = new FormData();

      // Agregar todos los campos del viaje
      Object.keys(tripData).forEach((key) => {
        if (tripData[key] !== null && tripData[key] !== undefined) {
          formData.append(key, tripData[key]);
        }
      });

      // Agregar archivos
      files.forEach((file, index) => {
        if (file instanceof File) {
          formData.append(`file_${index}`, file);
        }
      });

      // Hacer petición HTTP
      const response = await fetch("/api/trips/create", {
        method: "POST",
        body: formData,
        credentials: "include", // Para incluir cookies de sesión
      });

      // Verificar si la respuesta HTTP es exitosa
      if (!response.ok) {
        let errorMessage = `Error ${response.status}`;
        try {
          const errorResult = await response.json();
          errorMessage =
            errorResult.message || errorResult.error || errorMessage;
        } catch (e) {
          // Si no se puede parsear el JSON, usar el mensaje por defecto
          console.warn("No se pudo parsear la respuesta de error:", e);
        }

        toast.error(errorMessage, {
          icon: "❌",
        });

        return {
          success: false,
          error: errorMessage,
          code: response.status,
        };
      }

      const result = await response.json();

      if (result.success) {
        toast.success(`Viaje creado exitosamente: ${result.data.name}`, {
          icon: "🚗",
        });

        if (result.data.files_count > 0) {
          toast.success(
            `${result.data.files_count} archivo(s) subido(s) correctamente`,
            {
              icon: "📎",
            }
          );
        }

        if (result.data.card_credits_warning) {
          toast.error(result.data.card_credits_warning, {
            icon: "⚠️",
            duration: 6000,
          });
        }

        // Navegar al viaje creado
        setTimeout(() => {
          navigate(`/trip/${result.data.trip_id}`);
        }, 1000); // Dar tiempo para que se vean las notificaciones

        return {
          success: true,
          data: result.data,
        };
      } else {
        const errorMessage = result.error || "Error desconocido al crear viaje";
        toast.error(errorMessage, {
          icon: "❌",
        });

        return {
          success: false,
          error: errorMessage,
          code: result.code,
        };
      }
    } catch (error) {
      console.error("Error creating trip:", error);

      const errorMessage = error.message || "Error de conexión al crear viaje";
      toast.error(errorMessage, {
        icon: "🔌",
      });

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createTrip,
    isCreating,
  };
};
