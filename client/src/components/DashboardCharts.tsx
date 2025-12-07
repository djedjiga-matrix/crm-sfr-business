import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';

interface ChartData {
    name: string;
    value: number;
    [key: string]: any;
}

const COLORS = ['#dc2626', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#06b6d4'];

// Graphique d'appels par heure
export const CallsPerHourChart = () => {
    const [data, setData] = useState<ChartData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Simuler des données - remplacer par un vrai endpoint
            await api.get('/stats').catch(() => { }); // Optionnel, pour vérifier la connexion

            // Générer des données pour les dernières 24h
            const hours: ChartData[] = [];
            const now = new Date();
            for (let i = 23; i >= 0; i--) {
                const hour = new Date(now);
                hour.setHours(hour.getHours() - i);
                hours.push({
                    name: `${hour.getHours()}h`,
                    value: Math.floor(Math.random() * 30) + 5,
                    appels: Math.floor(Math.random() * 30) + 5,
                    rdv: Math.floor(Math.random() * 5)
                });
            }
            setData(hours);
        } catch (error) {
            console.error('Error fetching chart data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="h-64 flex items-center justify-center text-gray-500 font-mono animate-pulse">CHARGEMENT...</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorAppels" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRdv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        fontSize: '12px'
                    }}
                />
                <Area type="monotone" dataKey="appels" stroke="#dc2626" fillOpacity={1} fill="url(#colorAppels)" strokeWidth={2} />
                <Area type="monotone" dataKey="rdv" stroke="#16a34a" fillOpacity={1} fill="url(#colorRdv)" strokeWidth={2} />
            </AreaChart>
        </ResponsiveContainer>
    );
};

// Graphique de conversion (Funnel)
export const ConversionChart = ({ data }: { data?: ChartData[] }) => {
    const defaultData = [
        { name: 'Appels', value: 150 },
        { name: 'Joints', value: 80 },
        { name: 'Intéressés', value: 30 },
        { name: 'RDV', value: 12 }
    ];

    const chartData = data || defaultData;

    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        fontSize: '12px'
                    }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

// Graphique de répartition des statuts
export const StatusPieChart = ({ data }: { data?: ChartData[] }) => {
    const defaultData = [
        { name: 'Nouveau', value: 45 },
        { name: 'NRP', value: 30 },
        { name: 'RDV Pris', value: 15 },
        { name: 'Pas intéressé', value: 10 }
    ];

    const chartData = data || defaultData;

    return (
        <ResponsiveContainer width="100%" height={200}>
            <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                >
                    {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        fontSize: '12px'
                    }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
};

// Légende personnalisée
export const ChartLegend = ({ items }: { items: { name: string; color: string }[] }) => (
    <div className="flex flex-wrap gap-4 justify-center mt-2">
        {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-500">{item.name}</span>
            </div>
        ))}
    </div>
);

// Performance par agent
export const AgentPerformanceChart = ({ data }: { data?: any[] }) => {
    const defaultData = [
        { name: 'Jean D.', appels: 45, rdv: 8 },
        { name: 'Marie L.', appels: 38, rdv: 6 },
        { name: 'Pierre M.', appels: 52, rdv: 10 },
        { name: 'Sophie B.', appels: 41, rdv: 7 }
    ];

    const chartData = data || defaultData;

    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        fontSize: '12px'
                    }}
                />
                <Bar dataKey="appels" fill="#dc2626" radius={[4, 4, 0, 0]} name="Appels" />
                <Bar dataKey="rdv" fill="#16a34a" radius={[4, 4, 0, 0]} name="RDV" />
            </BarChart>
        </ResponsiveContainer>
    );
};
