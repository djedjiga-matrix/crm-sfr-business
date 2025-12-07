import { Clock, Phone, Coffee, AlertCircle, Monitor, MapPin } from 'lucide-react';

interface UserCardProps {
    user: {
        id: string;
        name: string;
        role: string;
        status: string;
        campaign: string;
        zone?: string;
        loginTime?: string;
        lastActivity?: string;
        pauseType?: string;
        pauseStartTime?: string;
        stats: {
            contacts: number;
            appointments: number;
            calls: number;
            workTime: number;
        };
    };
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'CONNECTED_ACTIVE': return 'text-green-500 bg-green-500/10 border-green-500/20';
        case 'CONNECTED_INACTIVE': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
        case 'PAUSED': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
        case 'ON_CALL': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
        case 'DISCONNECTED': return 'text-red-500 bg-red-500/10 border-red-500/20';
        default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'CONNECTED_ACTIVE': return <Monitor size={16} />;
        case 'CONNECTED_INACTIVE': return <Clock size={16} />;
        case 'PAUSED': return <Coffee size={16} />;
        case 'ON_CALL': return <Phone size={16} />;
        case 'DISCONNECTED': return <AlertCircle size={16} />;
        default: return <AlertCircle size={16} />;
    }
};

const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
};

const UserCard = ({ user }: UserCardProps) => {
    const statusColor = getStatusColor(user.status);

    return (
        <div className="bg-white dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusColor}`}>
                        {getStatusIcon(user.status)}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{user.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{user.role}</p>
                    </div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${statusColor}`}>
                    {user.status.replace('_', ' ')}
                </div>
            </div>

            <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Campagne:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{user.campaign}</span>
                </div>
                {user.zone && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Zone:</span>
                        <span className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                            <MapPin size={12} /> {user.zone}
                        </span>
                    </div>
                )}

                <div className="pt-3 border-t border-gray-100 dark:border-white/5 grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 dark:bg-white/5 p-2 rounded-lg text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Contacts</div>
                        <div className="font-bold text-gray-900 dark:text-white">{user.stats.contacts}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-white/5 p-2 rounded-lg text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">RDV</div>
                        <div className="font-bold text-gray-900 dark:text-white">{user.stats.appointments}</div>
                    </div>
                </div>

                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 pt-2">
                    <span>Actif: {formatTime(user.stats.workTime)}</span>
                    {user.lastActivity && (
                        <span>Dernière activité: {new Date(user.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserCard;
