import { useState, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { MessageCircle, X, ChevronLeft, Send } from 'lucide-react';
import { format } from 'date-fns';
import Tooltip from '../ui/Tooltip';

const ChatWidget = () => {
    const { user } = useAuth();
    const { groups, currentGroup, setCurrentGroup, messages, sendMessage, markAsRead } = useChat();
    const [isOpen, setIsOpen] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const totalUnreadCount = groups.reduce((acc, group) => acc + (group.unreadCount || 0), 0);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen && currentGroup) {
            scrollToBottom();
        }
    }, [messages, isOpen, currentGroup]);

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

    const handleGroupClick = (group: any) => {
        setCurrentGroup(group);
        markAsRead(group.id);
    };

    const handleBack = () => {
        setCurrentGroup(null);
    };

    if (!user) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="fixed inset-0 z-[60] md:static md:z-auto md:mb-4 w-full h-full md:w-96 md:h-[600px] bg-white dark:bg-[#0E0E11] md:rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-200">
                    {/* Header */}
                    <div className="h-14 bg-red-600 flex items-center justify-between px-4 text-white shrink-0">
                        <div className="flex items-center gap-3">
                            {currentGroup ? (
                                <button onClick={handleBack} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                    <ChevronLeft size={20} />
                                </button>
                            ) : (
                                <MessageCircle size={20} />
                            )}
                            <div className="flex flex-col">
                                <span className="font-bold text-sm truncate max-w-[200px]">
                                    {currentGroup ? currentGroup.name : 'Messagerie'}
                                </span>
                                {currentGroup && (
                                    <span className="text-[10px] opacity-80">
                                        {currentGroup.members?.length || 0} membres
                                    </span>
                                )}
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden flex flex-col bg-gray-50 dark:bg-[#08080a]">
                        {!currentGroup ? (
                            // Group List
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                {groups.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <MessageCircle size={32} className="mb-2 opacity-50" />
                                        <p className="text-sm">Aucune conversation</p>
                                    </div>
                                ) : (
                                    groups.map(group => (
                                        <button
                                            key={group.id}
                                            onClick={() => handleGroupClick(group)}
                                            className="w-full p-3 flex items-center gap-3 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors border border-gray-100 dark:border-white/5"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-xs shrink-0">
                                                {group.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <span className="font-bold text-sm text-gray-900 dark:text-white truncate">{group.name}</span>
                                                    {group.messages && group.messages[0] && (
                                                        <span className="text-[10px] text-gray-400">
                                                            {format(new Date(group.messages[0].createdAt), 'HH:mm')}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                                                        {group.messages && group.messages[0] ? (
                                                            <>
                                                                <span className="font-semibold">{group.messages[0].sender?.name}: </span>
                                                                {group.messages[0].content}
                                                            </>
                                                        ) : (
                                                            <span className="italic">Aucun message</span>
                                                        )}
                                                    </p>
                                                    {group.unreadCount > 0 && (
                                                        <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                                            {group.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        ) : (
                            // Chat View
                            <>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white dark:bg-[#0E0E11]">
                                    {messages.map((msg, index) => {
                                        const isOwn = msg.senderId === user.id;
                                        const showHeader = index === 0 || messages[index - 1].senderId !== msg.senderId;

                                        return (
                                            <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                                                {showHeader && (
                                                    <div className={`flex items-end gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                                                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{msg.sender.name}</span>
                                                    </div>
                                                )}
                                                <div className={`max-w-[85%] p-2.5 rounded-2xl text-sm shadow-sm ${isOwn
                                                    ? 'bg-red-600 text-white rounded-tr-none'
                                                    : 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-tl-none'
                                                    }`}>
                                                    {msg.content}
                                                </div>
                                                <span className="text-[9px] text-gray-300 mt-1 px-1">
                                                    {format(new Date(msg.createdAt), 'HH:mm')}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input */}
                                <div className="p-3 bg-gray-50 dark:bg-[#08080a] border-t border-gray-200 dark:border-white/10">
                                    <div className="flex items-end gap-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-1.5 shadow-sm focus-within:border-red-500/50 transition-all">
                                        <textarea
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Message..."
                                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-white placeholder-gray-400 resize-none py-1.5 max-h-20 custom-scrollbar"
                                            rows={1}
                                            style={{ minHeight: '36px' }}
                                        />
                                        <button
                                            onClick={() => handleSend()}
                                            disabled={!newMessage.trim()}
                                            className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <Tooltip content="Messagerie" position="left">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 relative ${isOpen
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 rotate-90'
                        : 'bg-red-600 hover:bg-red-700 text-white hover:scale-110'
                        }`}
                >
                    {isOpen ? <X size={24} /> : <MessageCircle size={28} />}

                    {!isOpen && totalUnreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-6 h-6 bg-white dark:bg-[#0E0E11] rounded-full flex items-center justify-center">
                            <span className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-pulse">
                                {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                            </span>
                        </span>
                    )}
                </button>
            </Tooltip>
        </div>
    );
};

export default ChatWidget;
