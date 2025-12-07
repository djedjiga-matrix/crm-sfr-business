import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock as LockIcon, Mail, ArrowRight } from 'lucide-react';
import api from '../services/api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', { email: email.trim(), password });
            login(response.data.token, response.data.user);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Échec de la connexion');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#050507] relative overflow-hidden transition-colors duration-300">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-red-600/5 dark:bg-red-600/10 blur-[120px] rounded-full" />
                <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-blue-600/5 blur-[100px] rounded-full" />
            </div>

            <div className="w-full max-w-md p-8 relative z-10">
                <div className="mb-10 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-800 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.4)] transform rotate-3 hover:rotate-0 transition-transform duration-500">
                        <span className="text-3xl font-bold text-white">S</span>
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight transition-colors">SFR Business</h1>
                    <p className="text-gray-500 font-mono text-sm tracking-widest uppercase">Système d'Accès Sécurisé</p>
                </div>

                <div className="bg-white dark:bg-[#0A0A0C] p-8 rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-mono flex items-center gap-2 animate-shake">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Email Professionnel</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-red-600 dark:group-focus-within:text-red-500 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all outline-none text-sm font-medium"
                                    placeholder="nom@entreprise.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Mot de Passe</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <LockIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-red-600 dark:group-focus-within:text-red-500 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-[#0A0A0C] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all outline-none text-sm font-medium"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-[#050507] transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                        >
                            {loading ? (
                                <span className="animate-pulse">Connexion...</span>
                            ) : (
                                <>
                                    Se Connecter
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-600 font-mono">
                    &copy; 2024 SFR Business. Tous droits réservés.
                </p>
            </div>
        </div>
    );
};

export default Login;
