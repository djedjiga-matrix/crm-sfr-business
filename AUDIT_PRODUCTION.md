# 🔍 AUDIT COMPLET DU CRM - AVANT MISE EN PRODUCTION

**Date d'analyse**: 7 Décembre 2025  
**Version**: 1.0  
**Analyste**: Antigravity AI

---

## 📊 RÉSUMÉ EXÉCUTIF

| Catégorie | Niveau de Risque | Description |
|-----------|------------------|-------------|
| **Sécurité** | 🟠 MOYEN | Plusieurs points à corriger avant production |
| **Stabilité** | 🟢 FAIBLE | Code globalement stable avec gestion d'erreurs |
| **Performance** | 🟡 ATTENTION | Quelques optimisations recommandées |
| **Maintenabilité** | 🟢 BON | Code bien structuré |

---

## 🚨 PROBLÈMES CRITIQUES À CORRIGER

### 1. SÉCURITÉ - JWT Secret Hardcodé
**Fichier**: `server/src/utils/jwt.ts`
**Risque**: 🔴 CRITIQUE

```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_me';
```

**Problème**: Si la variable d'environnement n'est pas définie, un secret par défaut prévisible est utilisé.

**Solution**:
```typescript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
```

---

### 2. SÉCURITÉ - Route /register Ouverte
**Fichier**: `server/src/routes/authRoutes.ts`
**Risque**: 🔴 CRITIQUE

```typescript
router.post('/register', register);
```

**Problème**: N'importe qui peut créer un compte, même avec le rôle ADMIN.

**Solution**: Supprimer cette route ou la protéger :
```typescript
// Option 1: Supprimer la route
// router.post('/register', register);

// Option 2: Restreindre aux admins
router.post('/register', authenticate, authorize(['ADMIN']), register);
```

---

### 3. SÉCURITÉ - CORS Trop Permissif
**Fichier**: `server/src/index.ts`
**Risque**: 🟠 MOYEN

```typescript
app.use(cors({
    origin: true, // Allow any origin ⚠️
    credentials: true
}));
```

**Solution pour la production**:
```typescript
app.use(cors({
    origin: process.env.CLIENT_URL || 'https://votre-domaine.com',
    credentials: true
}));
```

---

### 4. SÉCURITÉ - URL API Hardcodée
**Fichier**: `client/src/services/api.ts`
**Risque**: 🟠 MOYEN

```typescript
const api = axios.create({
    baseURL: 'http://localhost:3000/api', // ⚠️ Hardcodé
});
```

**Solution**:
```typescript
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});
```

Et dans `.env.production`:
```env
VITE_API_URL=https://api.votre-domaine.com/api
```

---

### 5. SÉCURITÉ - Socket.IO Sans Authentification
**Fichier**: `server/src/socket.ts`
**Risque**: 🟠 MOYEN

Les événements Socket.IO ne vérifient pas l'authentification. Un utilisateur malveillant pourrait émettre des événements `user_login` avec n'importe quel userId.

**Solution**: Ajouter une authentification Socket.IO :
```typescript
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
        const decoded = verifyToken(token);
        socket.data.user = decoded;
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
});
```

---

## 🟡 PROBLÈMES IMPORTANTS

### 6. LOGS Excessifs en Production
**Fichiers**: Multiples contrôleurs
**Risque**: 🟡 PERFORMANCE + SÉCURITÉ

Il y a beaucoup de `console.log` dans le code qui peuvent :
- Ralentir l'application
- Exposer des données sensibles dans les logs
- Remplir le disque

**Solution**: Utiliser un logger avec niveaux (winston, pino) :
```typescript
import logger from './utils/logger';
if (process.env.NODE_ENV !== 'production') {
    logger.debug('Message de debug');
}
```

---

### 7. Validation des Entrées Insuffisante
**Fichiers**: Tous les contrôleurs
**Risque**: 🟡 SÉCURITÉ

Les données entrantes ne sont pas validées de manière systématique. Cela peut mener à des erreurs ou des attaques.

**Solution recommandée**: Utiliser Zod ou Joi pour valider les entrées :
```typescript
import { z } from 'zod';

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
});

export const login = async (req: Request, res: Response) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ errors: result.error.errors });
    }
    // ...
};
```

---

### 8. Pas de Rate Limiting
**Fichier**: `server/src/index.ts`
**Risque**: 🟡 SÉCURITÉ

Aucune protection contre les attaques par force brute (login), DDoS, ou spam.

**Solution**:
```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives
    message: 'Trop de tentatives, réessayez plus tard'
});

app.use('/api/auth/login', loginLimiter);
```

---

### 9. Gestion des Sessions Incomplète
**Fichier**: `server/src/socket.ts`
**Risque**: 🟡 STABILITÉ

Les sessions expirées ne sont jamais nettoyées de la base de données. Elles s'accumulent.

**Solution**: Ajouter un job de nettoyage périodique :
```typescript
// Toutes les 24h, supprimer les sessions de plus de 7 jours
setInterval(async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await prisma.userSession.deleteMany({
        where: { logoutTime: { lt: sevenDaysAgo } }
    });
}, 24 * 60 * 60 * 1000);
```

---

### 10. Fichiers Temporaires Non Sécurisés
**Fichier**: `server/src/middleware/uploadMiddleware.ts`  
**Risque**: 🟡 SÉCURITÉ

Les fichiers sont uploadés dans un dossier `uploads/` sans vérification du contenu réel.

**Recommandations**:
- Limiter les types de fichiers autorisés
- Vérifier le vrai type MIME (pas juste l'extension)
- Scanner les fichiers avec un antivirus en production
- Limiter la taille des fichiers

---

## 🟢 POINTS POSITIFS

### ✅ Authentification JWT Correcte
- Tokens avec expiration (24h)
- Middleware d'authentification bien implémenté
- Vérification des rôles (authorize)

### ✅ Mots de Passe Hashés
- Utilisation de bcrypt avec salt rounds = 10
- Pas de stockage en clair

### ✅ Protection XSS
- Pas de `dangerouslySetInnerHTML`
- Pas d'`eval()`
- React échappe automatiquement les valeurs

### ✅ Structure de Code Propre
- Séparation claire des routes/controllers
- Utilisation de Prisma pour les requêtes (évite les injections SQL)
- TypeScript pour le typage statique

### ✅ Gestion d'Erreurs
- Try/catch dans la plupart des contrôleurs
- Codes HTTP appropriés retournés

---

## 📋 CHECKLIST AVANT MISE EN PRODUCTION

### Obligatoire (Bloquant)
- [ ] Configurer JWT_SECRET en variable d'environnement (≥ 64 caractères aléatoires)
- [ ] Supprimer ou protéger la route `/register`
- [ ] Configurer CORS avec le domaine exact
- [ ] Configurer VITE_API_URL pour le frontend
- [ ] Activer HTTPS (certificat SSL/TLS)
- [ ] Mettre à jour les variables d'environnement de production

### Très Recommandé
- [ ] Ajouter rate limiting sur /login et routes critiques
- [ ] Authentifier les connexions Socket.IO
- [ ] Configurer un logger de production (pas console.log)
- [ ] Ajouter validation des entrées (Zod/Joi)
- [ ] Configurer Helmet pour les headers de sécurité

### Recommandé
- [ ] Configurer un job de nettoyage des sessions anciennes
- [ ] Mettre en place du monitoring (Sentry, New Relic)
- [ ] Configurer des backups automatiques de la base de données
- [ ] Supprimer les logs de debug du code de production
- [ ] Tester avec différents navigateurs

---

## 🛠️ FICHIERS DE CONFIGURATION PRODUCTION

### `.env` (serveur)
```env
# OBLIGATOIRE - Générer avec: openssl rand -hex 64
JWT_SECRET=votre_secret_tres_long_et_aleatoire_ici

# Base de données (adapter selon votre hébergeur)
DATABASE_URL=postgresql://user:password@host:5432/crm_production

# Client URL pour CORS
CLIENT_URL=https://crm.votre-entreprise.fr

# Aircall (si utilisé)
AIRCALL_WEBHOOK_TOKEN=votre_token_aircall
AIRCALL_API_ID=votre_api_id
AIRCALL_API_TOKEN=votre_api_token

# Email (SMTP)
SMTP_HOST=smtp.votre-provider.com
SMTP_PORT=587
SMTP_USER=noreply@votre-entreprise.fr
SMTP_PASS=votre_mot_de_passe

# Port
PORT=3000
NODE_ENV=production
```

### `.env.production` (client)
```env
VITE_API_URL=https://api.crm.votre-entreprise.fr/api
VITE_SOCKET_URL=https://api.crm.votre-entreprise.fr
```

---

## 🔧 CORRECTIONS RAPIDES À APPLIQUER

### Correction 1: JWT Secret Obligatoire
```typescript
// server/src/utils/jwt.ts
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET is not defined');
    process.exit(1);
}
```

### Correction 2: Désactiver /register
```typescript
// server/src/routes/authRoutes.ts
// Commenter ou supprimer cette ligne:
// router.post('/register', register);
```

### Correction 3: API URL Dynamique
```typescript
// client/src/services/api.ts
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});
```

---

## 📈 RECOMMANDATIONS FUTURES

1. **Tests Automatisés**: Ajouter des tests unitaires et d'intégration
2. **CI/CD**: Mettre en place un pipeline de déploiement automatique
3. **Containerisation**: Docker pour un déploiement reproductible
4. **CDN**: Utiliser un CDN pour les assets statiques
5. **Caching**: Ajouter Redis pour le cache des données fréquentes

---

## ✅ CONCLUSION

Le projet est **fonctionnellement prêt** pour la production, mais nécessite quelques **corrections de sécurité obligatoires** avant le déploiement. Les points critiques concernent principalement :

1. La configuration des secrets JWT
2. La sécurisation de la route d'inscription
3. La configuration CORS restrictive

Une fois ces corrections appliquées, le CRM peut être déployé en toute sécurité.

**Temps estimé pour les corrections obligatoires**: ~1-2 heures
