import { PrismaClient } from '@prisma/client';

// Singleton pattern pour éviter multiple instances en développement (hot reload)
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// Configuration optimisée pour la production avec pool de connexions
const prismaClientSingleton = () => {
    return new PrismaClient({
        log: process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
        // Configuration du pool de connexions via datasource URL
        // PostgreSQL: ?connection_limit=20&pool_timeout=10
    });
};

// Utiliser l'instance existante ou en créer une nouvelle
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// En développement, sauvegarder dans global pour éviter les instances multiples
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

// Gestion de la fermeture propre
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

export default prisma;
