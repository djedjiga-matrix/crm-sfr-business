# 🚀 Guide de Déploiement Production - CRM SFR Business

## Prérequis

- Node.js 18+ 
- PostgreSQL 14+
- PM2 installé globalement: `npm install -g pm2`
- Serveur Linux (Ubuntu 22.04 recommandé)

## 1. Installation PM2

```bash
# Installation globale
npm install -g pm2

# Vérifier l'installation
pm2 --version
```

## 2. Build de Production

```bash
# Backend - Compiler TypeScript
cd server
npm run build

# Frontend - Build Vite
cd ../client
npm run build
```

## 3. Variables d'Environnement Production

Créer le fichier `server/.env.production`:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/crm_sfr_prod"
JWT_SECRET="votre-secret-jwt-production-tres-long-et-securise"
AIRCALL_API_ID="your-aircall-api-id"
AIRCALL_API_TOKEN="your-aircall-api-token"
AIRCALL_WEBHOOK_SECRET="your-webhook-secret"
```

## 4. Démarrage avec PM2

```bash
# Depuis la racine du projet
cd /path/to/CRM_Prise rdv

# Démarrer en mode production
pm2 start ecosystem.config.js --env production

# Vérifier le statut
pm2 status

# Voir les logs en temps réel
pm2 logs

# Voir les logs d'une app spécifique
pm2 logs crm-sfr-api
```

## 5. Commandes PM2 Utiles

```bash
# Arrêter toutes les apps
pm2 stop all

# Redémarrer toutes les apps
pm2 restart all

# Recharger sans downtime (zero-downtime reload)
pm2 reload ecosystem.config.js --env production

# Supprimer toutes les apps
pm2 delete all

# Monitorer en temps réel (CPU, RAM)
pm2 monit

# Dashboard web
pm2 plus
```

## 6. Persistence au Redémarrage

```bash
# Sauvegarder la liste des processus
pm2 save

# Générer le script de démarrage automatique
pm2 startup

# Exécuter la commande affichée par pm2 startup
# Exemple: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy
```

## 7. Configuration Nginx (Reverse Proxy)

Créer `/etc/nginx/sites-available/crm-sfr`:

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    # Redirection HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name votre-domaine.com;

    # Certificats SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;

    # Frontend (fichiers statiques)
    location / {
        root /var/www/crm-sfr/client/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache pour les assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket (Socket.io)
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }

    # Webhooks Aircall
    location /webhooks {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Activer le site:
```bash
sudo ln -s /etc/nginx/sites-available/crm-sfr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 8. Certificat SSL avec Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

## 9. Mise à Jour en Production

```bash
# Pull les dernières modifications
git pull origin main

# Rebuild
cd server && npm run build
cd ../client && npm run build

# Reload sans downtime
pm2 reload ecosystem.config.js --env production
```

## 10. Monitoring & Alertes

```bash
# Activer PM2 Plus (monitoring cloud)
pm2 link <secret_key> <public_key>

# Ou configurer les alertes locales
pm2 set pm2:alert true
```

## 11. Backup Base de Données

```bash
# Backup PostgreSQL
pg_dump -U postgres crm_sfr_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Automatiser avec cron (tous les jours à 2h)
0 2 * * * pg_dump -U postgres crm_sfr_prod > /backups/crm_$(date +\%Y\%m\%d).sql
```

## Structure des Logs

Les logs sont stockés dans `./logs/`:
- `combined.log` - Tous les logs API
- `out.log` - Sorties standard
- `error.log` - Erreurs uniquement
- `client-*.log` - Logs du serveur frontend

---

**By Proximeo Vd Services @2025**
