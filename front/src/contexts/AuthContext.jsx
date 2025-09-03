import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSessionInfo } from "../lib/queries";
import { authAPI } from "../lib/api";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const queryClient = useQueryClient();
  const { data: sessionData, isLoading, error, refetch } = useSessionInfo();

  useEffect(() => {
    if (!isLoading) {
      if (sessionData?.result?.uid && !error) {
        setIsAuthenticated(true);
        setUser(sessionData.result);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
      setLoading(false);
    }
  }, [sessionData, isLoading, error]);

  const login = async (email, password) => {
    try {
      const result = await authAPI.smartLogin(email, password);
      if (result?.result?.uid) {
        await refetch(); // Refrecar la información de sesión
        return result;
      } else {
        throw new Error("Credenciales inválidas");
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.warn("Error al cerrar sesión en el servidor:", error);
    } finally {
      // Siempre limpiar el estado local
      setIsAuthenticated(false);
      setUser(null);
      // Limpiar todas las queries en caché
      queryClient?.clear();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
