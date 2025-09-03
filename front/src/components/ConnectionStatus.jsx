import { useEffect, useState } from "react";
import { authAPI } from "../lib/api";
import { motion } from "motion/react";
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react";

const ConnectionStatus = () => {
  const [status, setStatus] = useState("checking"); // checking, connected, error
  const [databases, setDatabases] = useState([]);
  const [error, setError] = useState(null);

  const checkConnection = async () => {
    setStatus("checking");
    setError(null);

    try {
      const result = await authAPI.getDatabaseList();
      if (result.result && Array.isArray(result.result)) {
        setDatabases(result.result);
        setStatus("connected");
      } else {
        setStatus("error");
        setError("Respuesta inválida del servidor");
      }
    } catch (err) {
      setStatus("error");
      setError(err.message || "Error de conexión");
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case "checking":
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />;
      case "connected":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "checking":
        return "Verificando conexión...";
      case "connected":
        return `Conectado - ${databases.length} base(s) disponible(s)`;
      case "error":
        return `Error: ${error}`;
      default:
        return "";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "checking":
        return "bg-blue-50 border-blue-200 text-blue-800";
      case "connected":
        return "bg-green-50 border-green-200 text-green-800";
      case "error":
        return "bg-red-50 border-red-200 text-red-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${getStatusColor()}`}
    >
      {getStatusIcon()}
      <span>{getStatusText()}</span>
      {status === "error" && (
        <button
          onClick={checkConnection}
          className="ml-auto text-xs px-2 py-1 bg-white rounded border hover:bg-gray-50"
        >
          Reintentar
        </button>
      )}
      {status === "connected" && databases.length > 0 && (
        <div className="ml-auto text-xs">[{databases.join(", ")}]</div>
      )}
    </motion.div>
  );
};

export default ConnectionStatus;
