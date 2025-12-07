import { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { Search, Plus, Hash, Users, MessageCircle, Volume2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CreateGroupModal from './CreateGroupModal';
import Tooltip from '../ui/Tooltip';

const ChatSidebar = () => {
    const { groups, currentGroup, setCurrentGroup } = useChat();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const canCreateGroup = user?.role === 'ADMIN' || user?.role === 'SUPERVISEUR';

    const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const directs = filteredGroups.filter(g => g.type === 'DIRECT');
    const teamGroups = filteredGroups.filter(g => g.type === 'GROUP');
    const channels = filteredGroups.filter(g => g.type === 'CHANNEL');
    const broadcasts = filteredGroups.filter(g => g.type === 'BROADCAST');

    const getIcon = (type: string) => {
        switch (type) {
            case 'DIRECT': return <MessageCircle size={16} />;
            case 'GROUP': return <Users size={16} />;
            case 'CHANNEL': return <Hash size={16} />;
            case 'BROADCAST': return <Volume2 size={16} />;
            default: return <MessageCircle size={16} />;
        }
    };

    return (
        <div className="w-80 border-r border-gray-200 dark:border-white/10 flex flex-col bg-gray-50 dark:bg-[#08080a]">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <MessageCircle className="text-red-600" />
                    MESSAGERIE
                </h2>
                <div className="flex gap-2">
                    {canCreateGroup && (
                        <Tooltip content="Créer un groupe" position="bottom">
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <Plus size={18} className="text-gray-500 dark:text-gray-400" />
                            </button>
                        </Tooltip>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-red-500 transition-colors"
                    />
                </div>
            </div>

            {/* Lists */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-6">

                {/* Pinned / Favorites (Mocked for now as schema support is basic) */}
                {/* 
                <div>
                    <h3 className="px-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Épinglés</h3>
                    ...
                </div>
                */}

                {/* Broadcasts (Admin) */}
                {broadcasts.length > 0 && (
                    <div>
                        <h3 className="px-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Volume2 size={12} /> Annonces
                        </h3>
                        <div className="space-y-1">
                            {broadcasts.map(group => (
                                <GroupItem key={group.id} group={group} isActive={currentGroup?.id === group.id} onClick={() => setCurrentGroup(group)} icon={getIcon(group.type)} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Directs */}
                <div>
                    <h3 className="px-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <MessageCircle size={12} /> Messages Directs
                    </h3>
                    <div className="space-y-1">
                        {directs.map(group => (
                            <GroupItem key={group.id} group={group} isActive={currentGroup?.id === group.id} onClick={() => setCurrentGroup(group)} icon={getIcon(group.type)} />
                        ))}
                        {directs.length === 0 && <p className="px-2 text-xs text-gray-400 italic">Aucune conversation</p>}
                    </div>
                </div>

                {/* Groups */}
                <div>
                    <h3 className="px-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Users size={12} /> Groupes
                    </h3>
                    <div className="space-y-1">
                        {teamGroups.map(group => (
                            <GroupItem key={group.id} group={group} isActive={currentGroup?.id === group.id} onClick={() => setCurrentGroup(group)} icon={getIcon(group.type)} />
                        ))}
                    </div>
                </div>

                {/* Channels */}
                <div>
                    <h3 className="px-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Hash size={12} /> Canaux
                    </h3>
                    <div className="space-y-1">
                        {channels.map(group => (
                            <GroupItem key={group.id} group={group} isActive={currentGroup?.id === group.id} onClick={() => setCurrentGroup(group)} icon={getIcon(group.type)} />
                        ))}
                    </div>
                </div>
            </div>

            {/* User Status Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-white/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-xs">
                    {user?.name?.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.name}</p>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">En ligne</p>
                    </div>
                </div>
            </div>

            <CreateGroupModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
        </div>
    );
};

const GroupItem = ({ group, isActive, onClick, icon }: any) => {
    return (
        <button
            onClick={onClick}
            className={`w-full p-2 flex items-center gap-3 rounded-lg transition-all ${isActive ? 'bg-white dark:bg-white/10 shadow-sm text-red-600 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}
        >
            <div className={`p-2 rounded-lg ${isActive ? 'bg-red-50 dark:bg-red-500/20' : 'bg-gray-100 dark:bg-white/5'}`}>
                {icon}
            </div>
            <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-center">
                    <span className="font-medium text-sm truncate">{group.name}</span>
                    {group.unreadCount > 0 && (
                        <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {group.unreadCount}
                        </span>
                    )}
                </div>
                {group.messages && group.messages.length > 0 && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                        {group.messages[0].sender?.name}: {group.messages[0].content}
                    </p>
                )}
            </div>
        </button>
    );
};

export default ChatSidebar;
