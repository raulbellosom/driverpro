import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, MessageCircle, Users } from "lucide-react";

const ChatPanel = ({ isOpen, onClose, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading) return;

    const message = {
      id: Date.now(),
      text: newMessage,
      sender: currentUser?.name || "Usuario",
      timestamp: new Date().toISOString(),
      type: "user",
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage("");
    setIsLoading(true);

    try {
      // TODO: Implementar envío real de mensajes al backend
      console.log("📨 Enviando mensaje:", message);

      // Simular respuesta del sistema por ahora
      setTimeout(() => {
        const systemResponse = {
          id: Date.now() + 1,
          text: "Mensaje recibido. La funcionalidad de chat está en desarrollo.",
          sender: "Sistema",
          timestamp: new Date().toISOString(),
          type: "system",
        };
        setMessages((prev) => [...prev, systemResponse]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error enviando mensaje:", error);
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md h-[600px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#c5f0a4] rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-[#2a2a2a]" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Chat de Equipo</h3>
              <p className="text-sm text-gray-500">Mensajes y comunicación</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
              <Users className="w-4 h-4" />
              Chat en desarrollo - Funcionalidad básica
            </div>
          </div>

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-2xl ${
                  message.type === "user"
                    ? "bg-[#c5f0a4] text-[#2a2a2a]"
                    : message.type === "system"
                    ? "bg-blue-50 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <div className="text-sm font-medium mb-1">{message.sender}</div>
                <div className="text-sm">{message.text}</div>
                <div className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 p-3 rounded-2xl">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#c5f0a4] focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isLoading}
              className="w-10 h-10 bg-[#c5f0a4] text-[#2a2a2a] rounded-full flex items-center justify-center hover:bg-[#a9e978] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default ChatPanel;
