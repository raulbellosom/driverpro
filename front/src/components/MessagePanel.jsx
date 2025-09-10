import React, { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  X,
  Send,
  User,
  Clock,
  Search,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MessagePanel = ({
  contacts = [],
  messages = [],
  onSendMessage,
  onStartChat,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showContactsList, setShowContactsList] = useState(false);
  const panelRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Cerrar panel al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-scroll al final de mensajes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Filtrar contactos por término de búsqueda
  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.email &&
        contact.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Obtener mensajes del chat activo
  const activeChatMessages = activeChat
    ? messages
        .filter(
          (m) =>
            m.sender_id === activeChat.id || m.recipient_id === activeChat.id
        )
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    : [];

  // Obtener último mensaje por contacto
  const getLastMessage = (contactId) => {
    const contactMessages = messages.filter(
      (m) => m.sender_id === contactId || m.recipient_id === contactId
    );
    return contactMessages.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    )[0];
  };

  // Contar mensajes no leídos por contacto
  const getUnreadCount = (contactId) => {
    return messages.filter((m) => m.sender_id === contactId && !m.read).length;
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && activeChat && onSendMessage) {
      onSendMessage({
        recipient_id: activeChat.id,
        message: newMessage.trim(),
        timestamp: new Date().toISOString(),
      });
      setNewMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));

    if (diffInMinutes < 1) return "Ahora";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return messageTime.toLocaleDateString();
  };

  const startNewChat = (contact) => {
    setActiveChat(contact);
    setShowContactsList(false);
    setSearchTerm("");
    if (onStartChat) {
      onStartChat(contact);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Botón de mensajes */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <MessageCircle className="w-6 h-6 text-gray-700 dark:text-gray-300" />

        {/* Badge de mensajes no leídos */}
        {messages.filter((m) => !m.read).length > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold"
          >
            {messages.filter((m) => !m.read).length > 99
              ? "99+"
              : messages.filter((m) => !m.read).length}
          </motion.div>
        )}
      </button>

      {/* Panel de mensajes */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-96 h-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {activeChat && !showContactsList ? (
                  <>
                    <button
                      onClick={() => setActiveChat(null)}
                      className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      ←
                    </button>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white truncate">
                        {activeChat.name}
                      </span>
                    </div>
                  </>
                ) : (
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Mensajes
                  </h3>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {!activeChat && (
                  <button
                    onClick={() => setShowContactsList(!showContactsList)}
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Nuevo chat"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contenido principal */}
            <div className="flex-1 overflow-hidden">
              {showContactsList ? (
                /* Lista de contactos */
                <div className="h-full flex flex-col">
                  {/* Buscador */}
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar contactos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Lista de contactos */}
                  <div className="flex-1 overflow-y-auto">
                    {filteredContacts.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        No se encontraron contactos
                      </div>
                    ) : (
                      filteredContacts.map((contact) => (
                        <div
                          key={contact.id}
                          onClick={() => startNewChat(contact)}
                          className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                {contact.name}
                              </p>
                              {contact.email && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                  {contact.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : activeChat ? (
                /* Chat activo */
                <div className="h-full flex flex-col">
                  {/* Mensajes */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {activeChatMessages.length === 0 ? (
                      <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                        No hay mensajes aún. ¡Inicia la conversación!
                      </div>
                    ) : (
                      activeChatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender_id === activeChat.id
                              ? "justify-start"
                              : "justify-end"
                          }`}
                        >
                          <div
                            className={`max-w-xs px-3 py-2 rounded-lg ${
                              message.sender_id === activeChat.id
                                ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                                : "bg-blue-500 text-white"
                            }`}
                          >
                            <p className="text-sm">{message.message}</p>
                            <p
                              className={`text-xs mt-1 ${
                                message.sender_id === activeChat.id
                                  ? "text-gray-500 dark:text-gray-400"
                                  : "text-blue-100"
                              }`}
                            >
                              {formatTime(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input de mensaje */}
                  <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Escribe un mensaje..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Lista de chats existentes */
                <div className="h-full overflow-y-auto">
                  {contacts.length === 0 ? (
                    <div className="p-8 text-center">
                      <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">
                        No hay conversaciones
                      </p>
                      <button
                        onClick={() => setShowContactsList(true)}
                        className="mt-4 text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium"
                      >
                        Iniciar nueva conversación
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {contacts.map((contact) => {
                        const lastMessage = getLastMessage(contact.id);
                        const unreadCount = getUnreadCount(contact.id);

                        return (
                          <div
                            key={contact.id}
                            onClick={() => setActiveChat(contact)}
                            className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center relative">
                                <User className="w-5 h-5 text-gray-600" />
                                {unreadCount > 0 && (
                                  <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-gray-900 dark:text-white truncate">
                                    {contact.name}
                                  </p>
                                  {lastMessage && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {formatTime(lastMessage.timestamp)}
                                    </p>
                                  )}
                                </div>
                                {lastMessage && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                    {lastMessage.message}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessagePanel;
