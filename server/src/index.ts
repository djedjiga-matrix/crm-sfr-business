import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { initSocket } from './socket';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger/config';
import prisma from './prisma';

dotenv.config();

import authRoutes from './routes/authRoutes';
import contactRoutes from './routes/contactRoutes';
import aircallRoutes from './routes/aircallRoutes';
import userRoutes from './routes/userRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import statsRoutes from './routes/statsRoutes';
import callRoutes from './routes/callRoutes';
import campaignRoutes from './routes/campaignRoutes';
import databaseRoutes from './routes/databaseRoutes';
import monitoringRoutes from './routes/monitoringRoutes';
import grhRoutes from './routes/grhRoutes';
import chatRoutes from './routes/chatRoutes';
import recordingRoutes from './routes/recordingRoutes';
import auditRoutes from './routes/auditRoutes';
import calendarRoutes from './routes/calendarRoutes';
import scriptRoutes from './routes/scriptRoutes';
import exportTemplateRoutes from './routes/exportTemplateRoutes';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// ===========================================
// SÉCURITÉ - CONFIGURATION
// ===========================================

// Trust proxy (si derrière nginx/load balancer)
if (isProduction) {
    app.set('trust proxy', 1);
}

// CORS Configuration
const corsOptions = {
    origin: isProduction
        ? process.env.CLIENT_URL || 'https://crm.votre-domaine.com'
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Helmet pour les headers de sécurité
app.use(helmet({
    contentSecurityPolicy: isProduction ? undefined : false, // Désactivé en dev pour Swagger
    crossOriginEmbedderPolicy: false
}));

// Compression GZIP pour les réponses
app.use(compression());

// Body parser avec limite de taille (protection DoS)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===========================================
// HEALTH CHECK ENDPOINT (pour monitoring)
// ===========================================
app.get('/health', async (req, res) => {
    try {
        // Vérifier la connexion DB
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage()
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: 'Database connection failed'
        });
    }
});

// Initialize Socket.IO
const io = initSocket(httpServer);
app.set('io', io);

// ===========================================
// SWAGGER DOCUMENTATION
// ===========================================
// En production, protéger ou désactiver Swagger
if (!isProduction || process.env.ENABLE_SWAGGER === 'true') {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customCss: `
            .swagger-ui .topbar { display: none }
            .swagger-ui .info { margin-bottom: 20px }
            .swagger-ui .info .title { color: #dc2626 }
        `,
        customSiteTitle: 'CRM SFR Business - API Documentation',
        customfavIcon: '/favicon.ico'
    }));

    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
}

// ===========================================
// API ROUTES
// ===========================================
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/aircall', aircallRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/databases', databaseRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/grh', grhRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api/export-templates', exportTemplateRoutes);

// Page d'accueil
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head><title>CRM SFR Business API</title></head>
            <body style="font-family: Arial; padding: 40px; text-align: center;">
                <h1 style="color: #dc2626;">CRM SFR Business API</h1>
                <p>API is running</p>
                ${!isProduction ? '<p><a href="/api-docs" style="color: #dc2626;">📚 Documentation API (Swagger)</a></p>' : ''}
            </body>
        </html>
    `);
});

// ===========================================
// GESTION D'ERREURS GLOBALE
// ===========================================

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`
    });
});

// Error Handler Global
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${req.method} ${req.path}:`, err);

    // Ne pas exposer les détails d'erreur en production
    const errorResponse = isProduction
        ? { error: 'Internal Server Error', message: 'Une erreur est survenue' }
        : { error: err.name, message: err.message, stack: err.stack };

    res.status(500).json(errorResponse);
});

// ===========================================
// GESTION DES SIGNAUX - GRACEFUL SHUTDOWN
// ===========================================
const gracefulShutdown = async (signal: string) => {
    console.log(`\n[${signal}] Graceful shutdown initiated...`);

    // Arrêter d'accepter de nouvelles connexions
    httpServer.close(async () => {
        console.log('[SHUTDOWN] HTTP server closed');

        // Fermer la connexion Prisma
        await prisma.$disconnect();
        console.log('[SHUTDOWN] Database connection closed');

        // Fermer Socket.IO
        io.close(() => {
            console.log('[SHUTDOWN] Socket.IO closed');
            process.exit(0);
        });
    });

    // Force exit après 30 secondes
    setTimeout(() => {
        console.error('[SHUTDOWN] Forced shutdown after timeout');
        process.exit(1);
    }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
    console.error('[FATAL] Uncaught Exception:', error);
    // En production, on pourrait notifier un service externe
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
    // En production, on pourrait notifier un service externe
});

// ===========================================
// DÉMARRAGE DU SERVEUR
// ===========================================
httpServer.listen(PORT, () => {
    console.log(`\n🚀 Server is running on port ${PORT}`);
    console.log(`📊 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
    if (!isProduction) {
        console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    }
    console.log('');
});
