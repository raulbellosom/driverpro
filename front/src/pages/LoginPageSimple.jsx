import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPageSimple() {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await login(credentials.email, credentials.password);
    } catch (err) {
      console.error("Error de login:", err);
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eff7d0] to-[#c5f0a4] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-[#a9e978]/20">
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="Driver Pro Logo"
            className="w-16 h-16 mx-auto mb-4 object-contain"
          />
          <h1 className="text-3xl font-bold text-[#2a2a2a] mb-2">DriverPro</h1>
          <p className="text-[#2a2a2a]/70">Inicia sesión para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#2a2a2a] mb-2"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={credentials.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-[#a9e978]/50 rounded-lg focus:ring-2 focus:ring-[#c5f0a4] focus:border-transparent bg-white/70"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#2a2a2a] mb-2"
            >
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-[#a9e978]/50 rounded-lg focus:ring-2 focus:ring-[#c5f0a4] focus:border-transparent bg-white/70"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#a9e978] text-[#2a2a2a] py-3 px-4 rounded-lg hover:bg-[#c5f0a4] focus:ring-2 focus:ring-[#a9e978] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-[#2a2a2a]/70">
            ¿Problemas para acceder?{" "}
            <a
              href="#"
              className="text-[#2a2a2a] hover:text-[#000000] font-medium"
            >
              Contacta al administrador
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
