import { useState, useEffect } from 'react';
import {
    Clock,
    Plus,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    User,
    MapPin,
    Video,
    Download,
    Phone,
    Calendar as CalendarIcon
} from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, getHours, getMinutes, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../services/api';
import AppointmentModal from '../components/AppointmentModal';

// --- Types ---
interface Appointment {
    id: string;
    date: string;
    status: string;
    notes?: string;
    contact: {
        companyName: string;
        managerName?: string;
        city?: string;
        phoneFixed?: string;
        phoneMobile?: string;
        address?: string;
    };
    commercial: {
        name: string;
    };
}

interface FormattedEvent {
    id: string;
    title: string;
    type: string;
    day: number;
    startHour: number;
    duration: number;
    contact: string;
    location: string;
    originalDate: Date;
    phone?: string;
    address?: string;
    onClick?: () => void;
}

// --- Color Config ---
const EVENT_STYLES: Record<string, { bg: string, border: string, text: string, glow: string, icon: string, opacity?: string }> = {
    'SCHEDULED': { bg: 'bg-[#E3F2FD]', border: 'border-[#2196F3]', text: 'text-[#1976D2]', glow: 'shadow-[0_0_10px_rgba(33,150,243,0.3)]', icon: '📅' },
    'TO_RESCHEDULE': { bg: 'bg-[#FFF3E0]', border: 'border-[#FFA726]', text: 'text-[#F57C00]', glow: 'shadow-[0_0_10px_rgba(255,167,38,0.3)]', icon: '🔄' },
    'TO_RECONTACT': { bg: 'bg-[#FFE0B2]', border: 'border-[#FF9800]', text: 'text-[#E65100]', glow: 'shadow-[0_0_10px_rgba(255,152,0,0.3)]', icon: '📞' },
    'RESCHEDULED': { bg: 'bg-[#F3E5F5]', border: 'border-[#9C27B0]', text: 'text-[#7B1FA2]', glow: 'shadow-[0_0_10px_rgba(156,39,176,0.3)]', icon: '⏰' },
    'SIGNED': { bg: 'bg-[#E8F5E9]', border: 'border-[#4CAF50]', text: 'text-[#2E7D32]', glow: 'shadow-[0_0_10px_rgba(76,175,80,0.3)]', icon: '✅' },
    'CANCELLED': { bg: 'bg-[#FFEBEE]', border: 'border-[#F44336]', text: 'text-[#C62828]', glow: 'shadow-[0_0_10px_rgba(244,67,54,0.3)]', icon: '❌', opacity: 'opacity-70 line-through' },
    'TO_CALLBACK': { bg: 'bg-[#EFEBE9]', border: 'border-[#795548]', text: 'text-[#4E342E]', glow: 'shadow-[0_0_10px_rgba(121,85,72,0.3)]', icon: '📲' },
    'CONFIRMED': { bg: 'bg-[#E3F2FD]', border: 'border-[#2196F3]', text: 'text-[#1976D2]', glow: 'shadow-[0_0_10px_rgba(33,150,243,0.3)]', icon: '📅' },
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);

// --- Mobile Event Card ---
const MobileEventCard = ({ event }: { event: FormattedEvent }) => {
    const style = EVENT_STYLES[event.type] || EVENT_STYLES['SCHEDULED'];

    return (
        <div
            className={`p-4 rounded-xl border-l-4 ${style.bg} ${style.border} ${style.glow} ${style.opacity || ''} cursor-pointer active:scale-[0.98] transition-all`}
            onClick={event.onClick}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{style.icon}</span>
                        <span className={`text-sm font-bold font-mono ${style.text}`}>
                            {format(event.originalDate, 'HH:mm')}
                        </span>
                    </div>
                    <h3 className={`font-bold ${style.text} text-base truncate`}>{event.title}</h3>
                    <p className={`text-sm ${style.text} opacity-80 mt-1 flex items-center gap-1`}>
                        <User size={12} /> {event.contact}
                    </p>
                    {event.location && (
                        <p className={`text-sm ${style.text} opacity-70 mt-1 flex items-center gap-1`}>
                            <MapPin size={12} /> {event.location}
                        </p>
                    )}
                </div>
                {event.phone && (
                    <a
                        href={`tel:${event.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-3 bg-green-500 text-white rounded-full shadow-lg active:scale-95 transition-transform"
                    >
                        <Phone size={20} />
                    </a>
                )}
            </div>
        </div>
    );
};

// --- Desktop Event Block ---
const EventBlock = ({ event }: { event: FormattedEvent }) => {
    const style = EVENT_STYLES[event.type] || EVENT_STYLES['SCHEDULED'];
    const topPosition = (event.startHour - 8) * 60;
    const height = event.duration * 60;

    return (
        <div
            className={`absolute left-1 right-1 p-2 rounded border-l-[5px] backdrop-blur-md cursor-pointer hover:brightness-105 transition-all group z-10 ${style.bg} ${style.border} ${style.glow} ${style.opacity || ''}`}
            style={{ top: `${topPosition}px`, height: `${height}px`, minHeight: '40px' }}
            title={`${event.title} - ${event.contact}`}
            onClick={event.onClick}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-1">
                    <span className="text-xs">{style.icon}</span>
                    <span className={`text-[9px] font-bold font-mono ${style.text} tracking-wider truncate`}>
                        {Math.floor(event.startHour)}:{Math.round((event.startHour % 1) * 60).toString().padStart(2, '0')}
                    </span>
                </div>
                {event.type === 'SIGNED' && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_currentColor]"></span>}
            </div>
            <h4 className={`text-[10px] font-bold ${style.text} mt-0.5 leading-tight truncate`}>{event.title}</h4>

            {event.duration >= 1 && (
                <div className="mt-1 flex flex-col gap-0.5">
                    <div className={`flex items-center gap-1.5 text-[9px] ${style.text} opacity-80 font-mono truncate`}>
                        <User size={8} /> {event.contact}
                    </div>
                    <div className={`flex items-center gap-1.5 text-[9px] ${style.text} opacity-80 font-mono truncate`}>
                        {event.location.includes('Teams') || event.location.includes('Phone') ? <Video size={8} /> : <MapPin size={8} />}
                        {event.location}
                    </div>
                </div>
            )}
        </div>
    );
};

const Calendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<FormattedEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY'); // Default to DAY for mobile

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | undefined>(undefined);

    // Export states
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportPeriod, setExportPeriod] = useState<'day' | 'week' | 'month' | 'all' | 'custom'>('week');
    const [exportLoading, setExportLoading] = useState(false);
    const [customStartDate, setCustomStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));



    // Fonction d'export
    const handleExport = async () => {
        setExportLoading(true);
        try {
            const now = new Date();
            let startDate: Date;
            let endDate: Date;

            switch (exportPeriod) {
                case 'day':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                    break;
                case 'week':
                    startDate = startOfWeek(now, { weekStartsOn: 1 });
                    endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 6);
                    endDate.setHours(23, 59, 59);
                    break;
                case 'month':
                    startDate = startOfMonth(now);
                    endDate = endOfMonth(now);
                    break;
                case 'custom':
                    startDate = new Date(customStartDate);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(customEndDate);
                    endDate.setHours(23, 59, 59, 999);
                    break;
                case 'all':
                default:
                    startDate = new Date(2020, 0, 1);
                    endDate = new Date(2099, 11, 31);
                    break;
            }

            const response = await api.get('/appointments/export', {
                params: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Export_RDV_${format(now, 'dd-MM-yyyy')}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            setIsExportModalOpen(false);
        } catch (error) {
            console.error('Error exporting appointments:', error);
            alert('Erreur lors de l\'export');
        } finally {
            setExportLoading(false);
        }
    };

    // Calculate days to display based on view
    let daysToDisplay: Date[] = [];
    if (view === 'DAY') {
        daysToDisplay = [currentDate];
    } else if (view === 'WEEK') {
        const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
        daysToDisplay = Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i));
    } else if (view === 'MONTH') {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        daysToDisplay = eachDayOfInterval({ start, end });
    }

    useEffect(() => {
        fetchAppointments();
    }, [currentDate, view]);

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const response = await api.get('/appointments');
            const appointments: Appointment[] = response.data;

            const formattedEvents: FormattedEvent[] = appointments.map(appt => {
                const date = parseISO(appt.date);
                const startHour = getHours(date) + getMinutes(date) / 60;

                return {
                    id: appt.id,
                    title: appt.contact.companyName,
                    type: appt.status as any,
                    day: -1,
                    startHour,
                    duration: 1,
                    contact: appt.contact.managerName || appt.commercial.name,
                    location: appt.contact.city || 'À définir',
                    originalDate: date,
                    phone: appt.contact.phoneFixed || appt.contact.phoneMobile,
                    address: appt.contact.address,
                    onClick: () => {
                        setSelectedAppointmentId(appt.id);
                        setIsModalOpen(true);
                    }
                };
            });

            const currentViewEvents = formattedEvents.filter(event => {
                const eventDate = event.originalDate;
                return daysToDisplay.some(day => isSameDay(day, eventDate));
            });

            // Sort by date for mobile list view
            currentViewEvents.sort((a, b) => a.originalDate.getTime() - b.originalDate.getTime());

            setEvents(currentViewEvents);
        } catch (error) {
            console.error('Error fetching appointments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevious = () => {
        if (view === 'DAY') setCurrentDate(addDays(currentDate, -1));
        else if (view === 'WEEK') setCurrentDate(subWeeks(currentDate, 1));
        else if (view === 'MONTH') setCurrentDate(subMonths(currentDate, 1));
    };

    const handleNext = () => {
        if (view === 'DAY') setCurrentDate(addDays(currentDate, 1));
        else if (view === 'WEEK') setCurrentDate(addWeeks(currentDate, 1));
        else if (view === 'MONTH') setCurrentDate(addMonths(currentDate, 1));
    };

    const handleToday = () => setCurrentDate(new Date());

    // Group events by day for mobile view
    const eventsByDay = events.reduce((acc, event) => {
        const dateKey = format(event.originalDate, 'yyyy-MM-dd');
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(event);
        return acc;
    }, {} as Record<string, FormattedEvent[]>);

    return (
        <div className="flex flex-col h-full">
            {/* ============ MOBILE HEADER ============ */}
            <div className="md:hidden sticky top-0 z-20 bg-white dark:bg-[#0E0E11] border-b border-gray-200 dark:border-white/10 -mx-4 px-4 py-3">
                {/* Top row: Title & Add button */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <CalendarIcon className="text-red-500" size={20} />
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Agenda</h1>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedAppointmentId(undefined);
                            setIsModalOpen(true);
                        }}
                        className="p-2 bg-red-600 text-white rounded-full shadow-lg"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                {/* Date Navigation */}
                <div className="flex items-center justify-between mb-3">
                    <button onClick={handlePrevious} className="p-2 rounded-lg bg-gray-100 dark:bg-white/10">
                        <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <div className="text-center">
                        <p className="font-bold text-gray-900 dark:text-white">
                            {view === 'DAY' && format(currentDate, 'EEEE d MMMM', { locale: fr })}
                            {view === 'WEEK' && `Semaine ${format(currentDate, 'w')} - ${format(currentDate, 'MMMM yyyy', { locale: fr })}`}
                            {view === 'MONTH' && format(currentDate, 'MMMM yyyy', { locale: fr })}
                        </p>
                        {isSameDay(currentDate, new Date()) && (
                            <span className="text-xs text-red-500 font-bold uppercase">Aujourd'hui</span>
                        )}
                    </div>
                    <button onClick={handleNext} className="p-2 rounded-lg bg-gray-100 dark:bg-white/10">
                        <ChevronRight size={20} className="text-gray-600 dark:text-gray-300" />
                    </button>
                </div>

                {/* View Switcher */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setView('DAY')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${view === 'DAY' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'}`}
                    >
                        Jour
                    </button>
                    <button
                        onClick={() => setView('WEEK')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${view === 'WEEK' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'}`}
                    >
                        Semaine
                    </button>
                    <button
                        onClick={() => setView('MONTH')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${view === 'MONTH' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'}`}
                    >
                        Mois
                    </button>
                    <button onClick={handleToday} className="px-3 py-2 text-xs font-bold text-red-500 border border-red-500/30 rounded-lg">
                        Auj.
                    </button>
                </div>
            </div>

            {/* ============ DESKTOP HEADER ============ */}
            <div className="hidden md:flex h-20 border-b border-gray-200 dark:border-white/5 items-center justify-between px-8 bg-white/90 dark:bg-[#050507]/60 backdrop-blur-md z-10 sticky top-0 -mx-8 -mt-8 mb-0 transition-colors">
                <div className="flex items-center gap-4">
                    <Clock className="text-red-600" size={18} />
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-widest uppercase">
                        Matrice Temporelle <span className="text-gray-400 dark:text-gray-600 mx-2">//</span> <span className="text-red-600 dark:text-red-500 font-mono text-sm">{view === 'MONTH' ? format(currentDate, 'MMMM yyyy', { locale: fr }) : `SEMAINE ${format(currentDate, 'w')}`}</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-1 transition-colors">
                        <button onClick={() => setView('DAY')} className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${view === 'DAY' ? 'text-gray-900 dark:text-white bg-white dark:bg-white/10 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/5'}`}>JOUR</button>
                        <button onClick={() => setView('WEEK')} className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${view === 'WEEK' ? 'text-gray-900 dark:text-white bg-white dark:bg-white/10 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/5'}`}>SEMAINE</button>
                        <button onClick={() => setView('MONTH')} className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${view === 'MONTH' ? 'text-gray-900 dark:text-white bg-white dark:bg-white/10 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/5'}`}>MOIS</button>
                    </div>
                    <div className="h-6 w-px bg-gray-200 dark:bg-white/10 mx-2"></div>
                    <button
                        onClick={() => { setSelectedAppointmentId(undefined); setIsModalOpen(true); }}
                        className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-sm text-xs font-bold tracking-widest uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] transition-all border border-red-500/30"
                    >
                        <Plus size={14} fill="currentColor" />
                        Ajouter RDV
                    </button>
                </div>
            </div>

            {/* Desktop Toolbar */}
            <div className="hidden md:flex px-8 py-4 border-b border-gray-200 dark:border-white/5 justify-between items-center bg-white/90 dark:bg-[#050507]/40 backdrop-blur-sm z-10 -mx-8 transition-colors">
                <div className="flex items-center gap-4">
                    <button onClick={handlePrevious} className="p-1.5 rounded border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-red-600 transition-all">
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-lg font-bold text-gray-900 dark:text-white font-mono tracking-wider uppercase">
                        {format(currentDate, 'MMMM yyyy', { locale: fr })}
                    </span>
                    <button onClick={handleNext} className="p-1.5 rounded border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-red-600 transition-all">
                        <ChevronRight size={16} />
                    </button>
                    <button onClick={handleToday} className="ml-4 px-3 py-1 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold font-mono uppercase rounded hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                        Aujourd'hui
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 uppercase">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_5px_currentColor]"></span> RDV
                        <span className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_5px_currentColor] ml-2"></span> Appel
                        <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_5px_currentColor] ml-2"></span> Closing
                    </div>
                    <button onClick={fetchAppointments} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setIsExportModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded transition-all shadow-[0_0_10px_rgba(22,163,74,0.3)]"
                    >
                        <Download size={14} />
                        Export
                    </button>
                </div>
            </div>

            {/* ============ MOBILE CONTENT (List View) ============ */}
            <div className="md:hidden flex-1 overflow-auto -mx-4 px-4 py-4 space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw size={24} className="animate-spin text-gray-400" />
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-12">
                        <CalendarIcon size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Aucun rendez-vous</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">pour cette période</p>
                    </div>
                ) : (
                    Object.entries(eventsByDay).map(([dateKey, dayEvents]) => (
                        <div key={dateKey}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${isSameDay(new Date(dateKey), new Date()) ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'}`}>
                                    {format(new Date(dateKey), 'EEE d', { locale: fr })}
                                </div>
                                <div className="flex-1 h-px bg-gray-200 dark:bg-white/10"></div>
                                <span className="text-xs text-gray-400">{dayEvents.length} RDV</span>
                            </div>
                            <div className="space-y-3">
                                {dayEvents.map(event => (
                                    <MobileEventCard key={event.id} event={event} />
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ============ DESKTOP CONTENT (Grid View) ============ */}
            <div className="hidden md:block flex-1 overflow-auto relative custom-scrollbar -mx-8 px-8">
                <div className="min-w-[1000px] bg-gray-50 dark:bg-[#08080a] relative pb-20 transition-colors">
                    {/* Grid Header (Days) */}
                    <div className="sticky top-0 z-30 flex border-b border-gray-200 dark:border-white/10 bg-white/95 dark:bg-[#08080a]/95 backdrop-blur-md transition-colors">
                        <div className="w-16 border-r border-gray-200 dark:border-white/10 bg-white dark:bg-[#050507]"></div>
                        {daysToDisplay.map((day, i) => {
                            const isToday = isSameDay(day, new Date());
                            return (
                                <div key={i} className={`flex-1 py-3 text-center border-r border-gray-200 dark:border-white/5 relative group ${isToday ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                                    <span className={`text-xs font-bold tracking-widest uppercase ${isToday ? 'text-red-600 dark:text-red-500 drop-shadow-[0_0_5px_rgba(220,38,38,0.6)]' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'}`}>
                                        {format(day, 'EEE dd', { locale: fr })}
                                    </span>
                                    {isToday && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 dark:bg-red-500 shadow-[0_0_10px_currentColor]"></div>}
                                </div>
                            );
                        })}
                    </div>

                    {/* Grid Body */}
                    <div className="flex relative">
                        {/* Current Time Indicator Line */}
                        {daysToDisplay.some(d => isSameDay(d, new Date())) && (
                            <div
                                className="absolute left-0 right-0 h-px bg-red-600 z-20 pointer-events-none shadow-[0_0_10px_rgba(220,38,38,0.8)] flex items-center"
                                style={{ top: `${(getHours(new Date()) - 8) * 60 + getMinutes(new Date())}px` }}
                            >
                                <div className="absolute left-0 bg-red-600 text-black text-[9px] font-bold px-1 rounded-r font-mono">
                                    {format(new Date(), 'HH:mm')}
                                </div>
                            </div>
                        )}

                        {/* Time Column */}
                        <div className="w-16 flex-shrink-0 bg-white dark:bg-[#050507] border-r border-gray-200 dark:border-white/10 text-right transition-colors">
                            {HOURS.map((hour) => (
                                <div key={hour} className="h-[60px] pr-2 relative">
                                    <span className="absolute -top-2 right-2 text-[10px] font-mono text-gray-400 dark:text-gray-600">{hour}:00</span>
                                </div>
                            ))}
                        </div>

                        {/* Days Columns */}
                        {daysToDisplay.map((day, dayIndex) => (
                            <div key={dayIndex} className={`flex-1 border-r border-gray-200 dark:border-white/5 relative ${isSameDay(day, new Date()) ? 'bg-red-50/50 dark:bg-red-500/[0.02]' : ''}`}>
                                {HOURS.map((hour) => (
                                    <div key={hour} className="h-[60px] border-b border-gray-100 dark:border-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.02] transition-colors relative group">
                                        <button onClick={() => setIsModalOpen(true)} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Plus size={12} className="text-gray-500" />
                                        </button>
                                    </div>
                                ))}
                                {events.filter(e => isSameDay(e.originalDate, day)).map(event => (
                                    <EventBlock key={event.id} event={event} />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <AppointmentModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedAppointmentId(undefined); }}
                onSuccess={() => { fetchAppointments(); }}
                appointmentId={selectedAppointmentId}
            />

            {/* Export Modal */}
            {isExportModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#0E0E11] border border-gray-200 dark:border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                            <Download size={20} className="text-green-500" />
                            Export des RDV
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Période</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['day', 'week', 'month', 'all', 'custom'] as const).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setExportPeriod(p)}
                                            className={`px-4 py-3 text-sm font-bold rounded-lg border transition-all ${p === 'custom' ? 'col-span-2' : ''} ${exportPeriod === p ? 'bg-green-600 text-white border-green-600' : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10'}`}
                                        >
                                            {p === 'day' && "Aujourd'hui"}
                                            {p === 'week' && "Cette semaine"}
                                            {p === 'month' && "Ce mois"}
                                            {p === 'all' && "Tout"}
                                            {p === 'custom' && "📅 Personnalisé"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {exportPeriod === 'custom' && (
                                <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Début</label>
                                            <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#0E0E11] border border-gray-300 dark:border-white/20 rounded-lg text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Fin</label>
                                            <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#0E0E11] border border-gray-300 dark:border-white/20 rounded-lg text-sm" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setIsExportModalOpen(false)} className="flex-1 px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg">
                                Annuler
                            </button>
                            <button onClick={handleExport} disabled={exportLoading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50">
                                {exportLoading ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                                {exportLoading ? 'Export...' : 'Télécharger'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;
