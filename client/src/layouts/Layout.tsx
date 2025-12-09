import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Phone, Users, Calendar, Settings, LogOut, Menu, Bell, Search, Target, Database, Monitor, Coffee, FileText, MessageCircle, Mic, Trophy, FileSpreadsheet } from 'lucide-react';
import clsx from 'clsx';
import NotificationCenter from '../components/NotificationCenter';
import ThemeToggle from '../components/ThemeToggle';
import { useState, useEffect, useCallback } from 'react';
import PauseModal from '../components/monitoring/PauseModal';
import { socketService } from '../services/socket';
import { useChat } from '../context/ChatContext';
import ChatWidget from '../components/chat/ChatWidget';
import GlobalSearch from '../components/GlobalSearch';
import ShortcutsHelp from '../components/ShortcutsHelp';
import { useGlobalShortcuts, useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

const SidebarItem = ({ icon: Icon, label, to, badge }: { icon: any, label: string, to: string, badge?: number }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            className={clsx(
                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 group relative overflow-hidden border border-transparent",
                isActive
                    ? "bg-red-600/10 text-red-600 dark:text-red-500 border-red-500/20 shadow-[0_0_15px_rgba(220,38,38,0.15)]"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-200 dark:hover:border-white/5"
            )}
        >
            {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
            )}
            <Icon size={18} className={clsx("transition-transform duration-300", isActive ? "scale-110 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" : "group-hover:scale-110")} />
            <span className="font-medium tracking-wide text-sm flex-1">{label}</span>
            {badge !== undefined && badge > 0 && (
                <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto shadow-sm">
                    {badge > 99 ? '99+' : badge}
                </span>
            )}
        </Link>
    );
};

const Layout = () => {
    const { user, logout } = useAuth();
    const { groups } = useChat();
    const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const totalUnreadCount = groups.reduce((acc, group) => acc + (group.unreadCount || 0), 0);

    // Raccourcis clavier globaux
    const openSearch = useCallback(() => setIsSearchOpen(true), []);
    useGlobalShortcuts(openSearch);

    // Raccourci pour l'aide
    useKeyboardShortcuts([
        { key: '?', action: () => setIsShortcutsHelpOpen(true), description: 'Aide raccourcis' },
        { key: 'Escape', action: () => { setIsSearchOpen(false); setIsShortcutsHelpOpen(false); }, description: 'Fermer' }
    ]);

    useEffect(() => {
        let heartbeatInterval: any;
        let handleStatusUpdate: ((data: any) => void) | undefined;

        if (user) {
            socketService.connect();
            socketService.emit('user_login', { userId: user.id });

            // Send heartbeat every 5 seconds
            heartbeatInterval = setInterval(() => {
                socketService.emit('heartbeat', { userId: user.id });
            }, 5000);

            handleStatusUpdate = (data: any) => {
                if (data.userId === user.id) {
                    setIsPaused(data.status === 'PAUSED');
                }
            };

            socketService.on('user_status_update', handleStatusUpdate);
        }
        return () => {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            if (handleStatusUpdate) socketService.off('user_status_update', handleStatusUpdate);
        };
    }, [user]);

    const handleStartPause = (type: string, duration: number, reason?: string) => {
        if (user) {
            socketService.emit('start_pause', { userId: user.id, type, duration, reason });
            setIsPaused(true);
        }
    };

    const handleEndPause = () => {
        if (user) {
            socketService.emit('end_pause', { userId: user.id });
            setIsPaused(false);
        }
    };

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const SidebarContent = () => (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-10 px-2">
                        <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                            <span className="font-bold text-xl text-white">S</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-wider text-gray-900 dark:text-white uppercase">SFR Business</h1>
                            <p className="text-[10px] text-red-500 font-mono tracking-widest uppercase">Système v2.0</p>
                            <p className="text-[8px] text-gray-400 dark:text-gray-500 font-mono tracking-wide">By Proximeo Vd Services @2025</p>
                        </div>
                    </div>

                    <nav className="space-y-1">
                        <p className="px-4 text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em] mb-4 mt-6">Module Principal</p>

                        {user.role === 'COMMERCIAL' ? (
                            <>
                                <SidebarItem icon={Calendar} label="AGENDA" to="/calendar" />
                                <SidebarItem icon={MessageCircle} label="MESSAGERIE" to="/chat" badge={totalUnreadCount} />
                            </>
                        ) : (
                            <>
                                <SidebarItem icon={LayoutDashboard} label="TABLEAU DE BORD" to="/" />
                                <SidebarItem icon={Users} label="CONTACTS" to="/contacts" />
                                <SidebarItem icon={Target} label="MODE PREVIEW" to="/preview" />
                                <SidebarItem icon={Calendar} label="AGENDA" to="/calendar" />
                                <SidebarItem icon={Phone} label="APPELS" to="/calls" />
                                <SidebarItem icon={Trophy} label="OBJECTIFS" to="/objectives" />
                                <SidebarItem icon={MessageCircle} label="MESSAGERIE" to="/chat" badge={totalUnreadCount} />
                            </>
                        )}

                        {(user.role === 'ADMIN' || user.role === 'SUPERVISEUR') && (
                            <>
                                <p className="px-4 text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em] mb-4 mt-8">Supervision</p>
                                <SidebarItem icon={Monitor} label="MONITORING LIVE" to="/monitoring" />
                                <SidebarItem icon={Mic} label="ENREGISTREMENTS" to="/recordings" />
                            </>
                        )}

                        {user.role === 'ADMIN' && (
                            <>
                                <p className="px-4 text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em] mb-4 mt-8">Admin Core</p>
                                <SidebarItem icon={Users} label="UTILISATEURS" to="/admin" />
                                <SidebarItem icon={Target} label="CAMPAGNES" to="/admin/campaigns" />
                                <SidebarItem icon={Database} label="BASES DE DONNÉES" to="/admin/databases" />
                                <SidebarItem icon={FileSpreadsheet} label="MODÈLES EXPORT" to="/admin/export-templates" />
                                <SidebarItem icon={FileText} label="EXPORT GRH" to="/admin/grh" />
                                <SidebarItem icon={MessageCircle} label="HISTORIQUE CHAT" to="/admin/chat-history" />
                                <SidebarItem icon={FileText} label="AUDIT LOGS" to="/admin/audit" />
                                <SidebarItem icon={Settings} label="SYSTÈME" to="/admin/system" />
                            </>
                        )}
                    </nav>
                </div>
            </div>

            {/* Fixed footer - always visible */}
            <div className="flex-shrink-0 p-6 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#08080a] transition-colors duration-300">
                <div className="flex items-center gap-3 mb-4 p-3 bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/5 backdrop-blur-sm shadow-sm dark:shadow-none">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-red-600 to-orange-600 flex items-center justify-center text-sm font-bold text-white shadow-inner">
                        {user.name.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-200 truncate">{user.name}</p>
                        <p className="text-[10px] text-gray-500 truncate uppercase tracking-wider font-mono">{user.role}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center justify-center space-x-2 text-red-500/80 hover:text-red-400 hover:bg-red-500/10 w-full px-4 py-2.5 rounded-lg transition-all duration-200 text-xs font-bold uppercase tracking-widest border border-transparent hover:border-red-500/20 hover:shadow-[0_0_10px_rgba(220,38,38,0.2)]"
                >
                    <LogOut size={16} />
                    <span>Déconnexion</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#050507] text-gray-900 dark:text-white transition-colors duration-300">
            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar Drawer */}
            <aside className={clsx(
                "fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#050507] shadow-2xl transform transition-transform duration-300 md:hidden",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <SidebarContent />
            </aside>

            {/* Sidebar Desktop */}
            <aside className="hidden md:flex w-72 bg-white dark:bg-[#050507] border-r border-gray-200 dark:border-white/5 flex-col shadow-2xl z-20 relative transition-colors duration-300">
                {/* Glow effect behind sidebar */}
                <div className="absolute -right-20 top-0 bottom-0 w-20 bg-red-500/5 blur-[100px] pointer-events-none" />
                <SidebarContent />
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* Top Glow */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-50" />

                {/* Header */}
                <header className="h-20 bg-white/80 dark:bg-[#050507]/80 backdrop-blur-md border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-4 md:px-8 z-10 sticky top-0 transition-colors duration-300">
                    <div className="flex items-center gap-4">
                        <button
                            className="md:hidden p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gray-100 dark:bg-[#0E0E11]/50 rounded-lg border border-gray-200 dark:border-white/5 focus-within:bg-white dark:focus-within:bg-[#0E0E11] focus-within:border-red-500/30 transition-all duration-300 w-96 group">
                            <Search size={16} className="text-gray-400 dark:text-gray-600 group-focus-within:text-red-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="RECHERCHER..."
                                className="bg-transparent border-none outline-none text-sm w-full text-gray-900 dark:text-gray-300 placeholder:text-gray-500 dark:placeholder:text-gray-700 font-mono"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Pause Button */}
                        {isPaused ? (
                            <button
                                onClick={handleEndPause}
                                className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-600 hover:bg-orange-500/20 transition-colors"
                            >
                                <Coffee size={18} />
                                <span className="hidden md:inline text-xs font-bold uppercase tracking-wider">Reprendre</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsPauseModalOpen(true)}
                                className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-gray-600 dark:text-gray-300"
                            >
                                <Coffee size={18} />
                                <span className="hidden md:inline text-xs font-bold uppercase tracking-wider">Pause</span>
                            </button>
                        )}

                        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                            <span className="text-[10px] font-mono text-red-600 dark:text-red-400 tracking-widest uppercase">En Ligne</span>
                        </div>

                        <ThemeToggle />

                        <div
                            className="relative"
                            onMouseEnter={() => setShowNotifications(true)}
                            onMouseLeave={() => setShowNotifications(false)}
                        >
                            <button
                                className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all duration-300 relative group"
                                onClick={() => setShowNotifications(!showNotifications)}
                            >
                                <Bell size={20} className="group-hover:drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                                {totalUnreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-[#050507] px-1">
                                        {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifications && (
                                <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-[#18181b] rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                    <div className="p-3 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                                        <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Notifications</h3>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                        {groups.filter(g => (g.unreadCount || 0) > 0).length > 0 ? (
                                            groups.filter(g => (g.unreadCount || 0) > 0).map(group => (
                                                <Link
                                                    key={group.id}
                                                    to="/chat"
                                                    className="block p-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5 last:border-0"
                                                >
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-bold text-sm text-gray-900 dark:text-white">{group.name}</span>
                                                        <span className="text-[10px] text-gray-400">
                                                            {group.messages[0] && new Date(group.messages[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                                        <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                                {group.messages[0]?.sender?.name || 'Système'}:
                                                            </span> {group.messages[0]?.content || 'Nouveau message'}
                                                        </p>
                                                    </div>
                                                </Link>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center">
                                                <Bell size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Aucune nouvelle notification</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-4 md:p-8 scroll-smooth relative">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
            <NotificationCenter />
            <ChatWidget />
            <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
            <ShortcutsHelp isOpen={isShortcutsHelpOpen} onClose={() => setIsShortcutsHelpOpen(false)} />
            <PauseModal
                isOpen={isPauseModalOpen}
                onClose={() => setIsPauseModalOpen(false)}
                onStartPause={handleStartPause}
            />
        </div>
    );
};

export default Layout;
