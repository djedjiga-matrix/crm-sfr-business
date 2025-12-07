import { useState, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { Send, Paperclip, Smile, MoreVertical, Phone, Video, Search, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import Tooltip from '../ui/Tooltip';

const ChatWindow = () => {
    const { currentGroup, messages, sendMessage } = useChat();
    const { user } = useAuth();
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim()) return;

        await sendMessage(newMessage);
        setNewMessage('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!currentGroup) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#0E0E11] text-gray-400">
                <div className="w-24 h-24 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle size={48} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Messagerie Interne</h3>
                <p className="max-w-md text-center">Sélectionnez une conversation pour commencer à échanger avec votre équipe.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-white dark:bg-[#0E0E11] h-full">
            {/* Header */}
            <div className="h-16 border-b border-gray-200 dark:border-white/10 flex items-center justify-between px-6 bg-white/50 dark:bg-[#0E0E11]/50 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white font-bold">
                        {currentGroup.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{currentGroup.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            {currentGroup.members?.length || 0} membres
                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                            <span className="text-green-500">En ligne</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-gray-400">
                    <Tooltip content="Rechercher" position="bottom">
                        <button className="hover:text-gray-900 dark:hover:text-white transition-colors"><Search size={20} /></button>
                    </Tooltip>
                    <Tooltip content="Appel audio" position="bottom">
                        <button className="hover:text-gray-900 dark:hover:text-white transition-colors"><Phone size={20} /></button>
                    </Tooltip>
                    <Tooltip content="Appel vidéo" position="bottom">
                        <button className="hover:text-gray-900 dark:hover:text-white transition-colors"><Video size={20} /></button>
                    </Tooltip>
                    <div className="w-px h-6 bg-gray-200 dark:bg-white/10"></div>
                    <Tooltip content="Plus d'options" position="bottom">
                        <button className="hover:text-gray-900 dark:hover:text-white transition-colors"><MoreVertical size={20} /></button>
                    </Tooltip>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.map((msg, index) => {
                    const isOwn = msg.senderId === user?.id;
                    const showHeader = index === 0 || messages[index - 1].senderId !== msg.senderId || (new Date(msg.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 300000); // 5 min gap

                    return (
                        <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                            {showHeader && (
                                <div className={`flex items-end gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <span className="text-xs font-bold text-gray-900 dark:text-white">{msg.sender.name}</span>
                                    <span className="text-[10px] text-gray-400">{format(new Date(msg.createdAt), 'HH:mm')}</span>
                                </div>
                            )}
                            <div className={`max-w-[70%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${isOwn
                                ? 'bg-red-600 text-white rounded-tr-none'
                                : 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-tl-none'
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#08080a]">
                <div className="flex items-end gap-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-2 shadow-sm focus-within:border-red-500/50 focus-within:ring-1 focus-within:ring-red-500/50 transition-all">
                    <Tooltip content="Joindre un fichier" position="top">
                        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            <Paperclip size={20} />
                        </button>
                    </Tooltip>
                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Écrire un message..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-white placeholder-gray-400 resize-none py-2 max-h-32 custom-scrollbar"
                        rows={1}
                        style={{ minHeight: '40px' }}
                    />
                    <Tooltip content="Emoji" position="top">
                        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            <Smile size={20} />
                        </button>
                    </Tooltip>
                    <Tooltip content="Envoyer (Entrée)" position="top">
                        <button
                            onClick={() => handleSend()}
                            disabled={!newMessage.trim()}
                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-red-600/20"
                        >
                            <Send size={18} />
                        </button>
                    </Tooltip>
                </div>
                <div className="mt-2 text-center">
                    <p className="text-[10px] text-gray-400">
                        <strong>Entrée</strong> pour envoyer, <strong>Maj + Entrée</strong> pour sauter une ligne
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;
