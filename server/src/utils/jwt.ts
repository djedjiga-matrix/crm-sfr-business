import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// En production, le secret est obligatoire
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL: JWT_SECRET environment variable is required in production');
    process.exit(1);
}

// En développement, utiliser un secret par défaut avec avertissement
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'dev_secret_change_in_production';
if (!JWT_SECRET) {
    console.warn('⚠️  WARNING: JWT_SECRET not set. Using default dev secret. DO NOT USE IN PRODUCTION!');
}

export const generateToken = (userId: string, role: string) => {
    return jwt.sign({ userId, role }, EFFECTIVE_JWT_SECRET, { expiresIn: '24h' });
};

export const verifyToken = (token: string) => {
    return jwt.verify(token, EFFECTIVE_JWT_SECRET) as { userId: string; role: string };
};
