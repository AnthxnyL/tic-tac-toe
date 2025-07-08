# 🎮 Morpion Socket.IO - Version Optimisée

## 📋 Description

Application de jeu de morpion multijoueur en temps réel utilisant Node.js, Express, Socket.IO avec une architecture modulaire et optimisée.

## 🏗️ Architecture

### 📁 Structure du projet

```
morpion-socketio/
├── package.json
├── README.md
├── server.js (version originale)
├── server-optimized.js (serveur optimisé - RECOMMANDÉ)
├── public/
│   ├── index.html
│   ├── style.css (styles originaux)
│   ├── css/ (styles modulaires)
│   │   ├── base.css (styles de base et variables)
│   │   ├── components.css (composants réutilisables)
│   │   ├── lobby.css (styles du lobby)
│   │   └── game.css (styles du jeu)
│   └── js/ (JavaScript modulaire)
│       ├── config.js (configuration)
│       ├── ui-manager.js (gestion de l'interface)
│       ├── socket-manager.js (gestion des connexions)
│       ├── game-manager.js (logique de jeu)
│       └── app.js (point d'entrée)
└── src/ (modules serveur)
    ├── config/
    │   └── config.js
    ├── models/
    │   └── Room.js
    ├── services/
    │   ├── RoomManager.js
    │   └── StatsManager.js
    ├── controllers/
    │   └── SocketController.js
    └── utils/
        └── helpers.js
```

## 🚀 Démarrage rapide

### Installation des dépendances
```bash
npm install
```

### Démarrage du serveur optimisé
```bash
# Utiliser le serveur optimisé (recommandé)
node server-optimized.js

# Ou utiliser npm start (configure dans package.json)
npm start
```

### Accès à l'application
Ouvrez votre navigateur et allez à : `http://localhost:3000`

## 🔧 Optimisations apportées

### 🔙 Backend (Serveur)

#### Modularisation
- **Configuration centralisée** : `src/config/config.js`
- **Modèles de données** : `src/models/Room.js`
- **Services métier** : `src/services/RoomManager.js`, `StatsManager.js`
- **Contrôleurs** : `src/controllers/SocketController.js`
- **Utilitaires** : `src/utils/helpers.js`

#### Améliorations
- ✅ Gestion d'erreurs robuste
- ✅ Logging structuré
- ✅ Arrêt propre du serveur
- ✅ API REST pour les statistiques
- ✅ Validation des données
- ✅ Code réutilisable et testable

### 🎨 Frontend (Client)

#### Modularisation JavaScript
- **Configuration** : `js/config.js` - Constants et paramètres
- **Interface** : `js/ui-manager.js` - Gestion du DOM et de l'affichage
- **Communication** : `js/socket-manager.js` - Gestion Socket.IO
- **Logique de jeu** : `js/game-manager.js` - État du jeu et règles
- **Application** : `js/app.js` - Point d'entrée et coordination

#### Modularisation CSS
- **Base** : `css/base.css` - Variables CSS, reset, styles de base
- **Composants** : `css/components.css` - Éléments réutilisables
- **Lobby** : `css/lobby.css` - Interface de sélection de salle
- **Jeu** : `css/game.css` - Interface de jeu

#### Améliorations
- ✅ Séparation des responsabilités
- ✅ Code réutilisable et maintenable
- ✅ Gestion d'erreurs côté client
- ✅ Interface responsive
- ✅ Animations et transitions fluides
- ✅ Mode debug intégré

## 📊 Fonctionnalités

### 🎮 Jeu
- Création/rejoindre des salles
- Jeu de morpion en temps réel
- Système de scores persistants
- Gestion des déconnexions
- Rotation automatique du premier joueur

### 🔧 Administration
- Statistiques globales
- Gestion des salles
- Logs détaillés
- API REST pour monitoring

### 🎨 Interface
- Design moderne et responsive
- Animations fluides
- Messages informatifs
- Mode sombre/clair automatique

## 🛠️ Development

### Mode Debug
Pour activer le mode debug côté client :
```javascript
// Dans la console du navigateur
localStorage.setItem('morpion_debug', 'true');
// Ou ajouter ?debug=true à l'URL
```

### Scripts disponibles
```bash
# Démarrer le serveur optimisé
npm start

# Démarrer le serveur original
npm run start:legacy

# Tests (si configurés)
npm test
```

### API Endpoints
- `GET /api/stats` - Statistiques globales
- `GET /api/rooms` - Liste des salles
- `GET /api/health` - État du serveur

## 🔒 Configuration

### Variables d'environnement
```env
PORT=3000                    # Port du serveur
NODE_ENV=production          # Environment
LOG_LEVEL=info              # Niveau de log
MAX_ROOMS=100               # Nombre max de salles
ROOM_TIMEOUT=3600000        # Timeout des salles (ms)
```

### Configuration serveur
Modifiez `src/config/config.js` pour personnaliser :
- Limits de salles et joueurs
- Timeouts
- Messages
- Paramètres Socket.IO

## 📈 Performance

### Optimisations appliquées
- ✅ Nettoyage automatique des salles vides
- ✅ Gestion de la mémoire optimisée
- ✅ Compression des données Socket.IO
- ✅ Cache des ressources statiques
- ✅ Minification CSS/JS automatique (en production)

## 🚀 Migration du serveur original

Pour migrer de `server.js` vers `server-optimized.js` :

1. **Sauvegardez** votre configuration actuelle
2. **Testez** le nouveau serveur :
   ```bash
   node server-optimized.js
   ```
3. **Modifiez** package.json si nécessaire :
   ```json
   {
     "scripts": {
       "start": "node server-optimized.js"
     }
   }
   ```

## 🐛 Débogage

### Logs serveur
Les logs sont disponibles dans la console avec différents niveaux :
```
[INFO] Serveur démarré sur le port 3000
[DEBUG] Nouvelle connexion: socket_id
[ERROR] Erreur lors de la création de salle
```

### Debug client
Utilisez les outils de développement du navigateur et les commandes debug :
```javascript
// État du jeu
debugCommands.getState()

// Forcer reconnexion
debugCommands.forceReconnect()

// Afficher message
debugCommands.showMessage('Test', 'success')
```

## 📦 Déploiement

### Production
1. Installer les dépendances : `npm ci --production`
2. Configurer les variables d'environnement
3. Démarrer : `npm start`

### Docker (optionnel)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature
3. Commiter les changements
4. Push vers la branche
5. Ouvrir une Pull Request

## 📝 Licence

MIT - Voir le fichier LICENSE pour plus de détails.

## 🆘 Support

- **Issues** : Ouvrir un ticket GitHub
- **Documentation** : Voir ce README
- **Debug** : Activer le mode debug pour plus d'informations

---

**Version** : 2.0.0 (Optimisée)  
**Auteur** : Votre nom  
**Date** : 2025
# tic-tac-toe
