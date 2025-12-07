import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import api from '../../services/api';
import { useChat } from '../../context/ChatContext';

interface User {
    id: string;
    name: string;
    role: string;
}

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CreateGroupModal = ({ isOpen, onClose }: CreateGroupModalProps) => {
    const { fetchGroups } = useChat();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('GROUP');
    const [privacy, setPrivacy] = useState('PRIVATE');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/chat/groups', {
                name,
                description,
                type,
                privacy,
                members: selectedMembers
            });
            await fetchGroups();
            onClose();
            // Reset form
            setName('');
            setDescription('');
            setType('GROUP');
            setPrivacy('PRIVATE');
            setSelectedMembers([]);
        } catch (error) {
            console.error('Error creating group:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleMember = (userId: string) => {
        setSelectedMembers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#0E0E11] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-white/10">
                <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Créer un nouveau groupe</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom du groupe *</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-red-500/50 outline-none transition-all"
                            placeholder="Ex: Équipe Alpha"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-red-500/50 outline-none transition-all resize-none h-20"
                            placeholder="Objectif du groupe..."
                        />
                    </div>

                    {/* Type & Privacy */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg outline-none"
                            >
                                <option value="GROUP">Groupe</option>
                                <option value="CHANNEL">Canal</option>
                                <option value="DIRECT">Direct</option>
                                <option value="BROADCAST">Annonce</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confidentialité</label>
                            <select
                                value={privacy}
                                onChange={(e) => setPrivacy(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg outline-none"
                            >
                                <option value="PRIVATE">Privé</option>
                                <option value="PUBLIC">Public</option>
                                <option value="SECRET">Secret</option>
                            </select>
                        </div>
                    </div>

                    {/* Members */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ajouter des membres</label>
                        <div className="border border-gray-200 dark:border-white/10 rounded-lg max-h-40 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-white/5">
                            {users.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => toggleMember(user.id)}
                                    className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-red-600/20 text-red-600 flex items-center justify-center text-xs font-bold">
                                            {user.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                                            <p className="text-[10px] text-gray-500 uppercase">{user.role}</p>
                                        </div>
                                    </div>
                                    {selectedMembers.includes(user.id) && (
                                        <Check size={16} className="text-red-600" />
                                    )}
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{selectedMembers.length} membres sélectionnés</p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-lg shadow-red-600/20 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Création...' : 'Créer le groupe'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateGroupModal;
