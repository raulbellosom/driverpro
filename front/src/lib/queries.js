import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authAPI, driverAPI } from "./api";

// Query Keys
export const queryKeys = {
  auth: ["auth"],
  databases: ["databases"],
  assignment: ["assignment"],
  trips: (filters) => ["trips", filters],
  pauseReasons: ["pause-reasons"],
  health: ["health"],
};

// Auth Hooks
export const useDatabases = () => {
  return useQuery({
    queryKey: queryKeys.databases,
    queryFn: authAPI.getDatabaseList,
    retry: false,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};

// Auth Hooks
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ username, password }) =>
      authAPI.smartLogin(username, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignment });
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authAPI.logout,
    onSuccess: () => {
      queryClient.clear();
    },
  });
};

export const useSessionInfo = () => {
  return useQuery({
    queryKey: queryKeys.auth,
    queryFn: authAPI.getSessionInfo,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Driver Hooks
export const useAssignment = () => {
  return useQuery({
    queryKey: queryKeys.assignment,
    queryFn: driverAPI.getAssignment,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
};

export const useTrips = (filters = {}) => {
  return useQuery({
    queryKey: queryKeys.trips(filters),
    queryFn: () => driverAPI.getTrips(filters),
    staleTime: 30 * 1000, // 30 segundos
  });
};

export const useCreateTrip = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: driverAPI.createTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignment });
    },
  });
};

export const useTripAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, action, data }) => {
      switch (action) {
        case "start":
          return driverAPI.startTrip(tripId);
        case "pause":
          return driverAPI.pauseTrip(tripId, data);
        case "resume":
          return driverAPI.resumeTrip(tripId);
        case "complete":
          return driverAPI.completeTrip(tripId);
        case "cancel":
          return driverAPI.cancelTrip(tripId, data);
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignment });
    },
  });
};

export const usePauseReasons = () => {
  return useQuery({
    queryKey: queryKeys.pauseReasons,
    queryFn: driverAPI.getPauseReasons,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};

export const useHealth = () => {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: driverAPI.getHealth,
    retry: 3,
    staleTime: 60 * 1000, // 1 minuto
  });
};
