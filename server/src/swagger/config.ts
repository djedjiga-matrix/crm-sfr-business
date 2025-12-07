import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'CRM SFR Business API',
            version: '1.0.0',
            description: `
## API Documentation du CRM SFR Business

Cette API permet de gérer :
- **Authentification** : Login, gestion des tokens JWT
- **Contacts** : CRUD, qualification, import/export
- **Rendez-vous** : Création, modification, calendrier
- **Utilisateurs** : Gestion des agents et commerciaux
- **Campagnes** : Attribution des bases de données
- **Statistiques** : Dashboard, KPIs

### Authentification
Toutes les routes (sauf /auth/login) nécessitent un token JWT.
Ajoutez le header: \`Authorization: Bearer <token>\`
            `,
            contact: {
                name: 'Support CRM',
                email: 'support@crm.com'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000/api',
                description: 'Serveur de développement'
            },
            {
                url: 'https://api.crm.votre-domaine.com/api',
                description: 'Serveur de production'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Token JWT obtenu via /auth/login'
                }
            },
            schemas: {
                // Auth
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'admin@sfr.fr' },
                        password: { type: 'string', format: 'password', example: 'password123' }
                    }
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        token: { type: 'string', description: 'Token JWT' },
                        user: { $ref: '#/components/schemas/User' }
                    }
                },

                // User
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string', format: 'email' },
                        name: { type: 'string' },
                        role: { type: 'string', enum: ['ADMIN', 'AGENT', 'COMMERCIAL', 'SUPERVISEUR'] },
                        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                CreateUserRequest: {
                    type: 'object',
                    required: ['email', 'name', 'password', 'role'],
                    properties: {
                        email: { type: 'string', format: 'email' },
                        name: { type: 'string' },
                        password: { type: 'string', minLength: 6 },
                        role: { type: 'string', enum: ['ADMIN', 'AGENT', 'COMMERCIAL', 'SUPERVISEUR'] }
                    }
                },

                // Contact
                Contact: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        companyName: { type: 'string' },
                        phoneFixed: { type: 'string' },
                        phoneMobile: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        city: { type: 'string' },
                        postalCode: { type: 'string' },
                        siret: { type: 'string' },
                        activity: { type: 'string' },
                        effectif: { type: 'string' },
                        status: {
                            type: 'string',
                            enum: ['NEW', 'NRP', 'UNREACHABLE', 'CALLBACK_LATER', 'FOLLOW_UP', 'NOT_INTERESTED', 'APPOINTMENT_TAKEN', 'OUT_OF_TARGET', 'ALREADY_CLIENT', 'WRONG_NUMBER']
                        },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                ContactsList: {
                    type: 'object',
                    properties: {
                        contacts: { type: 'array', items: { $ref: '#/components/schemas/Contact' } },
                        pagination: { $ref: '#/components/schemas/Pagination' }
                    }
                },

                // Appointment
                Appointment: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        contactId: { type: 'string', format: 'uuid' },
                        commercialId: { type: 'string', format: 'uuid' },
                        scheduledAt: { type: 'string', format: 'date-time' },
                        durationMinutes: { type: 'integer', default: 60 },
                        status: {
                            type: 'string',
                            enum: ['SCHEDULED', 'TO_RESCHEDULE', 'TO_RECONTACT', 'RESCHEDULED', 'SIGNED', 'CANCELLED']
                        },
                        notes: { type: 'string' },
                        address: { type: 'string' }
                    }
                },
                CreateAppointmentRequest: {
                    type: 'object',
                    required: ['contactId', 'commercialId', 'scheduledAt'],
                    properties: {
                        contactId: { type: 'string', format: 'uuid' },
                        commercialId: { type: 'string', format: 'uuid' },
                        scheduledAt: { type: 'string', format: 'date-time' },
                        durationMinutes: { type: 'integer', default: 60 },
                        notes: { type: 'string' },
                        address: { type: 'string' }
                    }
                },

                // Stats
                DashboardStats: {
                    type: 'object',
                    properties: {
                        callsToday: { type: 'integer' },
                        appointmentsTotal: { type: 'integer' },
                        appointmentsToday: { type: 'integer' },
                        newContactsToday: { type: 'integer' },
                        conversionRate: { type: 'number' },
                        graphData: { type: 'array', items: { type: 'object' } }
                    }
                },

                // Common
                Pagination: {
                    type: 'object',
                    properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                        pages: { type: 'integer' }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        error: { type: 'string' }
                    }
                }
            }
        },
        security: [{ bearerAuth: [] }],
        tags: [
            { name: 'Auth', description: 'Authentification' },
            { name: 'Users', description: 'Gestion des utilisateurs' },
            { name: 'Contacts', description: 'Gestion des contacts/prospects' },
            { name: 'Appointments', description: 'Gestion des rendez-vous' },
            { name: 'Calls', description: 'Historique des appels' },
            { name: 'Stats', description: 'Statistiques et KPIs' },
            { name: 'Campaigns', description: 'Gestion des campagnes' },
            { name: 'Audit', description: 'Logs d\'audit' }
        ]
    },
    apis: ['./src/routes/*.ts', './src/swagger/*.yaml']
};

export const swaggerSpec = swaggerJsdoc(options);
