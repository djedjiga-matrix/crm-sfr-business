import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Users, Calendar, Phone, LayoutDashboard, Target, Database, Settings, MessageCircle, ArrowRight, Command } from 'lucide-react';
import api from '../services/api';

interface SearchResult {
    id: string;
    type: 'contact' | 'appointment' | 'page';
    title: string;
    subtitle?: string;
    icon: any;
    path: string;
}

interface GlobalSearchProps {
    isOpen: boolean;
    onClose: () => void;
}

const pages: SearchResult[] = [
    { id: 'dashboard', type: 'page', title: 'Tableau de bord', icon: LayoutDashboard, path: '/' },
    { id: 'contacts', type: 'page', title: 'Contacts', icon: Users, path: '/contacts' },
    { id: 'preview', type: 'page', title: 'Mode Preview', icon: Target, path: '/preview' },
    { id: 'calendar', type: 'page', title: 'Agenda', icon: Calendar, path: '/calendar' },
    { id: 'calls', type: 'page', title: 'Appels', icon: Phone, path: '/calls' },
    { id: 'chat', type: 'page', title: 'Messagerie', icon: MessageCircle, path: '/chat' },
    { id: 'campaigns', type: 'page', title: 'Campagnes', subtitle: 'Admin', icon: Target, path: '/admin/campaigns' },
    { id: 'databases', type: 'page', title: 'Bases de données', subtitle: 'Admin', icon: Database, path: '/admin/databases' },
    { id: 'users', type: 'page', title: 'Utilisateurs', subtitle: 'Admin', icon: Settings, path: '/admin' },
];

const GlobalSearch = ({ isOpen, onClose }: GlobalSearchProps) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        const searchContacts = async () => {
            if (query.length < 2) {
                // Afficher les pages par défaut
                const filteredPages = pages.filter(p =>
                    p.title.toLowerCase().includes(query.toLowerCase()) ||
                    p.subtitle?.toLowerCase().includes(query.toLowerCase())
                );
                setResults(filteredPages);
                return;
            }

            setLoading(true);
            try {
                // Rechercher dans les contacts
                const response = await api.get(`/contacts?search=${encodeURIComponent(query)}&limit=5`);
                const contacts = response.data.contacts || response.data;

                const contactResults: SearchResult[] = contacts.slice(0, 5).map((c: any) => ({
                    id: c.id,
                    type: 'contact' as const,
                    title: c.companyName,
                    subtitle: c.phoneFixed || c.email || c.city,
                    icon: Users,
                    path: `/contacts/${c.id}`
                }));

                // Filtrer les pages aussi
                const filteredPages = pages.filter(p =>
                    p.title.toLowerCase().includes(query.toLowerCase())
                );

                setResults([...filteredPages, ...contactResults]);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(searchContacts, 200);
        return () => clearTimeout(debounce);
    }, [query]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, results.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (results[selectedIndex]) {
                    navigate(results[selectedIndex].path);
                    onClose();
                }
                break;
            case 'Escape':
                onClose();
                break;
        }
    };

    const handleResultClick = (result: SearchResult) => {
        navigate(result.path);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Search Modal */}
            <div className="relative w-full max-w-xl mx-4 bg-white dark:bg-[#0E0E11] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Search Input */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-white/10">
                    <Search size={20} className="text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Rechercher contacts, pages..."
                        className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none text-lg"
                    />
                    <div className="flex items-center gap-1 text-xs text-gray-400 px-2 py-1 bg-gray-100 dark:bg-white/5 rounded">
                        <Command size={12} />
                        <span>K</span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                        <X size={18} className="text-gray-400" />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500 font-mono text-sm animate-pulse">
                            RECHERCHE_EN_COURS...
                        </div>
                    ) : results.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            {query ? 'Aucun résultat trouvé' : 'Commencez à taper pour rechercher'}
                        </div>
                    ) : (
                        <div className="py-2">
                            {results.map((result, index) => (
                                <button
                                    key={result.id}
                                    onClick={() => handleResultClick(result)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${index === selectedIndex
                                            ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                                            : 'hover:bg-gray-50 dark:hover:bg-white/5 text-gray-900 dark:text-white'
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg ${result.type === 'contact'
                                            ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                                            : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                                        }`}>
                                        <result.icon size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{result.title}</div>
                                        {result.subtitle && (
                                            <div className="text-xs text-gray-500 truncate">{result.subtitle}</div>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400 uppercase font-mono">
                                        {result.type === 'contact' ? 'Contact' : 'Page'}
                                    </div>
                                    {index === selectedIndex && (
                                        <ArrowRight size={16} className="text-red-500" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-white/10 rounded text-[10px] font-mono">↑↓</kbd>
                        <span>naviguer</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-white/10 rounded text-[10px] font-mono">↵</kbd>
                        <span>ouvrir</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-white/10 rounded text-[10px] font-mono">esc</kbd>
                        <span>fermer</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalSearch;
