# Guide Mobile & Responsive Design - CRM V2

Ce guide détaille l'implémentation responsive et mobile-first de l'application CRM V2.

## 📱 Architecture Mobile

L'application utilise une approche **Mobile-First** avec Tailwind CSS.

### 1. Navigation (`Layout.tsx`)
- **Desktop**: Sidebar latérale fixe (`w-72`).
- **Mobile**: 
  - Sidebar cachée par défaut (`hidden md:flex`).
  - Menu "Burger" dans le header.
  - Drawer latéral (`fixed inset-y-0`) avec animation de glissement.
  - Overlay sombre (`bg-black/50`) pour fermer le menu.

### 2. Liste des Contacts (`Contacts.tsx`)
- **Desktop**: Tableau de données classique (`grid-cols-12`).
- **Mobile**:
  - Transformation en **Cartes** (`flex-col`).
  - En-têtes de colonnes cachés (`hidden md:grid`).
  - Chaque ligne devient une carte avec :
    - Entité et Contact en haut.
    - Pipeline et Statut en dessous.
    - Actions (Appel, Détails, Edit) en bas, pleine largeur.

### 3. Filtres (`Contacts.tsx`)
- **Desktop**: Dropdown classique (`absolute`).
- **Mobile**: 
  - **Bottom Sheet** (`fixed bottom-0`).
  - Animation de glissement depuis le bas (`slide-in-from-bottom`).
  - Overlay pour fermer.

### 4. Chat (`ChatWidget.tsx`)
- **Desktop**: Widget flottant (`w-96 h-[600px]`).
- **Mobile**:
  - **Plein écran** (`fixed inset-0 w-full h-full`).
  - Z-index élevé pour passer au-dessus de tout.

## 🚀 Optimisations Performance

### CSS (`index.css`)
- `touch-action: manipulation`: Améliore la réactivité des clics (supprime le délai de 300ms).
- `-webkit-tap-highlight-color: transparent`: Supprime le flash gris au clic sur iOS.
- `padding-bottom: env(safe-area-inset-bottom)`: Gestion de la barre de navigation iOS (iPhone X+).

### PWA (`index.html` & `manifest.json`)
- Manifeste web app ajouté.
- Meta tags pour iOS (`apple-mobile-web-app-capable`).
- Viewport optimisé (`user-scalable=yes` pour l'accessibilité, mais `maximum-scale=5.0`).

## 🛠 Maintenance

Pour modifier le comportement mobile :
1. Cherchez les classes préfixées par `md:` (ex: `md:hidden`, `md:w-96`).
2. Les classes sans préfixe s'appliquent au mobile (Mobile-First).
3. Utilisez l'état React `isMobileMenuOpen` ou `isFilterOpen` pour gérer la visibilité des overlays.

## 🧪 Test
Utilisez les outils de développement Chrome (F12) -> Toggle Device Toolbar (Ctrl+Shift+M) pour tester les résolutions mobiles (iPhone SE, iPhone 12 Pro, iPad).
