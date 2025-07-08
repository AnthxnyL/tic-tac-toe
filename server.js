const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Stockage des salles et des statistiques globales
let rooms = {};
let globalStats = {
    totalGames: 0,
    totalPlayers: 0,
    playerStats: {} // {playerId: {name, wins, losses, draws, gamesPlayed}}
};

// Fonction pour créer une nouvelle salle
function createRoom(roomId) {
    rooms[roomId] = {
        id: roomId,
        players: {},
        board: Array(9).fill(null),
        currentPlayer: 'X', // Sera randomisé quand le jeu commence
        gameStarted: false,
        winner: null,
        createdAt: new Date(),
        scores: {
            X: 0,
            O: 0,
            draws: 0
        },
        gameHistory: [], // Historique des parties
        totalGamesPlayed: 0,
        lastWinner: null // Pour alterner avec le perdant de la partie précédente
    };
    return rooms[roomId];
}

// Fonction pour mettre à jour les statistiques globales
function updateGlobalStats(winner, playerX, playerO) {
    globalStats.totalGames++;
    
    // Initialiser les stats des joueurs s'ils n'existent pas
    if (!globalStats.playerStats[playerX]) {
        globalStats.playerStats[playerX] = {
            name: `Player_${playerX.substr(0, 6)}`,
            wins: 0,
            losses: 0,
            draws: 0,
            gamesPlayed: 0
        };
    }
    
    if (!globalStats.playerStats[playerO]) {
        globalStats.playerStats[playerO] = {
            name: `Player_${playerO.substr(0, 6)}`,
            wins: 0,
            losses: 0,
            draws: 0,
            gamesPlayed: 0
        };
    }
    
    // Mettre à jour les statistiques
    globalStats.playerStats[playerX].gamesPlayed++;
    globalStats.playerStats[playerO].gamesPlayed++;
    
    if (winner === 'X') {
        globalStats.playerStats[playerX].wins++;
        globalStats.playerStats[playerO].losses++;
    } else if (winner === 'O') {
        globalStats.playerStats[playerO].wins++;
        globalStats.playerStats[playerX].losses++;
    } else if (winner === 'draw') {
        globalStats.playerStats[playerX].draws++;
        globalStats.playerStats[playerO].draws++;
    }
}

// Fonction pour obtenir le top des joueurs
function getTopPlayers(limit = 10) {
    return Object.entries(globalStats.playerStats)
        .map(([id, stats]) => ({
            id,
            ...stats,
            winRate: stats.gamesPlayed > 0 ? (stats.wins / stats.gamesPlayed * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate)
        .slice(0, limit);
}

// Fonction pour vérifier s'il y a un gagnant
function checkWinner(board) {
    const winningCombinations = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Lignes
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colonnes
        [0, 4, 8], [2, 4, 6] // Diagonales
    ];

    for (let combo of winningCombinations) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winner: board[a], combination: combo };
        }
    }

    if (board.every(cell => cell !== null)) {
        return { winner: 'draw', combination: null };
    }

    return { winner: null, combination: null };
}

// Fonction pour déterminer qui commence la partie
function determineFirstPlayer(room) {
    // Si c'est la première partie, choix aléatoire
    if (room.totalGamesPlayed === 0) {
        return Math.random() < 0.5 ? 'X' : 'O';
    }
    
    // Si match nul précédent, choix aléatoire
    if (room.lastWinner === 'draw') {
        return Math.random() < 0.5 ? 'X' : 'O';
    }
    
    // Si quelqu'un a gagné, le perdant commence
    if (room.lastWinner) {
        return room.lastWinner === 'X' ? 'O' : 'X';
    }
    
    // Par défaut, choix aléatoire
    return Math.random() < 0.5 ? 'X' : 'O';
}

// Fonction pour réinitialiser le jeu dans une salle
function resetGame(roomId) {
    if (rooms[roomId]) {
        rooms[roomId].board = Array(9).fill(null);
        rooms[roomId].winner = null;
        rooms[roomId].gameStarted = Object.keys(rooms[roomId].players).length === 2;
        
        // Déterminer qui commence selon la logique définie
        if (rooms[roomId].gameStarted) {
            rooms[roomId].currentPlayer = determineFirstPlayer(rooms[roomId]);
        } else {
            rooms[roomId].currentPlayer = 'X'; // Valeur par défaut si pas assez de joueurs
        }
    }
}

// Fonction pour supprimer une salle vide
function cleanupRoom(roomId) {
    if (rooms[roomId] && Object.keys(rooms[roomId].players).length === 0) {
        delete rooms[roomId];
        console.log(`Salle ${roomId} supprimée`);
    }
}

// Fonction pour générer un ID de salle aléatoire
function generateRoomId() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Fonction pour obtenir la liste des salles publiques
function getPublicRooms() {
    return Object.values(rooms).map(room => ({
        id: room.id,
        players: Object.keys(room.players).length,
        maxPlayers: 2,
        gameStarted: room.gameStarted,
        createdAt: room.createdAt,
        totalGamesPlayed: room.totalGamesPlayed
    }));
}

io.on('connection', (socket) => {
    console.log('Un joueur s\'est connecté:', socket.id);
    
    // Compter le nombre total de joueurs connectés
    globalStats.totalPlayers = io.engine.clientsCount;

    // Envoyer la liste des salles et les stats globales au nouveau client
    socket.emit('rooms-list', getPublicRooms());
    socket.emit('global-stats', {
        totalGames: globalStats.totalGames,
        totalPlayers: globalStats.totalPlayers,
        topPlayers: getTopPlayers(5)
    });

    // Définir le nom du joueur
    socket.on('set-player-name', (name) => {
        if (name && name.trim()) {
            socket.playerName = name.trim();
            if (globalStats.playerStats[socket.id]) {
                globalStats.playerStats[socket.id].name = name.trim();
            }
        }
    });

    // Créer une nouvelle salle
    socket.on('create-room', (callback) => {
        const roomId = generateRoomId();
        const room = createRoom(roomId);
        
        socket.join(roomId);
        socket.currentRoom = roomId;
        
        // Assigner le joueur X au créateur
        room.players[socket.id] = {
            symbol: 'X',
            id: socket.id,
            name: socket.playerName || `Player_${socket.id.substr(0, 6)}`,
            isCreator: true
        };
        
        console.log(`Salle ${roomId} créée par ${socket.id}`);
        
        // Confirmer la création
        if (callback) callback({ success: true, roomId: roomId });
        
        socket.emit('room-joined', { roomId: roomId, symbol: 'X', isCreator: true });
        socket.emit('game-state', room);
        socket.emit('score-update', room.scores);
        
        // Mettre à jour la liste des salles pour tous
        io.emit('rooms-list', getPublicRooms());
    });

    // Rejoindre une salle existante
    socket.on('join-room', (roomId, callback) => {
        if (!rooms[roomId]) {
            if (callback) callback({ success: false, error: 'Salle inexistante' });
            return;
        }

        const room = rooms[roomId];
        const playerCount = Object.keys(room.players).length;

        if (playerCount >= 2) {
            if (callback) callback({ success: false, error: 'Salle complète' });
            return;
        }

        socket.join(roomId);
        socket.currentRoom = roomId;
        
        // Assigner le joueur O au second joueur
        room.players[socket.id] = {
            symbol: 'O',
            id: socket.id,
            name: socket.playerName || `Player_${socket.id.substr(0, 6)}`,
            isCreator: false
        };
        
        console.log(`${socket.id} a rejoint la salle ${roomId}`);
        
        // Démarrer le jeu si 2 joueurs
        if (Object.keys(room.players).length === 2) {
            room.gameStarted = true;
            room.currentPlayer = determineFirstPlayer(room);
            io.to(roomId).emit('game-started', {
                firstPlayer: room.currentPlayer,
                firstPlayerName: room.players[Object.keys(room.players).find(id => 
                    room.players[id].symbol === room.currentPlayer)].name
            });
        }
        
        // Confirmer la connexion
        if (callback) callback({ success: true, roomId: roomId });
        
        socket.emit('room-joined', { roomId: roomId, symbol: 'O', isCreator: false });
        io.to(roomId).emit('game-state', room);
        io.to(roomId).emit('score-update', room.scores);
        
        // Notifier les autres joueurs
        socket.to(roomId).emit('player-joined', {
            playerId: socket.id,
            playerName: socket.playerName || `Player_${socket.id.substr(0, 6)}`,
            symbol: 'O'
        });
        
        // Mettre à jour la liste des salles pour tous
        io.emit('rooms-list', getPublicRooms());
    });

    // Quitter une salle
    socket.on('leave-room', () => {
        if (socket.currentRoom) {
            const roomId = socket.currentRoom;
            const room = rooms[roomId];
            
            if (room) {
                delete room.players[socket.id];
                socket.leave(roomId);
                
                // Notifier les autres joueurs
                socket.to(roomId).emit('player-left', socket.id);
                
                // Arrêter le jeu si moins de 2 joueurs
                if (Object.keys(room.players).length < 2) {
                    room.gameStarted = false;
                    room.winner = null;
                    io.to(roomId).emit('game-stopped');
                }
                
                // Nettoyer la salle si vide
                cleanupRoom(roomId);
                
                console.log(`${socket.id} a quitté la salle ${roomId}`);
            }
            
            socket.currentRoom = null;
            socket.emit('room-left');
            
            // Mettre à jour la liste des salles pour tous
            io.emit('rooms-list', getPublicRooms());
        }
    });

    // Demander la liste des salles
    socket.on('get-rooms', () => {
        socket.emit('rooms-list', getPublicRooms());
    });

    // Demander les statistiques globales
    socket.on('get-global-stats', () => {
        socket.emit('global-stats', {
            totalGames: globalStats.totalGames,
            totalPlayers: globalStats.totalPlayers,
            topPlayers: getTopPlayers(10)
        });
    });

    // Demander les statistiques personnelles
    socket.on('get-player-stats', () => {
        const playerStats = globalStats.playerStats[socket.id] || {
            name: socket.playerName || `Player_${socket.id.substr(0, 6)}`,
            wins: 0,
            losses: 0,
            draws: 0,
            gamesPlayed: 0
        };
        
        socket.emit('player-stats', {
            ...playerStats,
            winRate: playerStats.gamesPlayed > 0 ? (playerStats.wins / playerStats.gamesPlayed * 100).toFixed(1) : 0
        });
    });

    // Gérer les mouvements
    socket.on('make-move', (position) => {
        if (!socket.currentRoom) {
            socket.emit('error', 'Vous n\'êtes dans aucune salle');
            return;
        }

        const room = rooms[socket.currentRoom];
        if (!room) {
            socket.emit('error', 'Salle inexistante');
            return;
        }

        if (!room.gameStarted) {
            socket.emit('error', 'Le jeu n\'a pas encore commencé');
            return;
        }

        if (room.winner) {
            socket.emit('error', 'Le jeu est terminé');
            return;
        }

        if (room.players[socket.id].symbol !== room.currentPlayer) {
            socket.emit('error', 'Ce n\'est pas votre tour');
            return;
        }

        if (room.board[position] !== null) {
            socket.emit('error', 'Cette case est déjà occupée');
            return;
        }

        // Faire le mouvement
        room.board[position] = room.currentPlayer;
        
        // Vérifier s'il y a un gagnant
        const result = checkWinner(room.board);
        if (result.winner) {
            room.winner = result.winner;
            room.lastWinner = result.winner; // Sauvegarder le gagnant pour la prochaine partie
            room.totalGamesPlayed++;
            
            // Obtenir les IDs des joueurs
            const playerIds = Object.keys(room.players);
            const playerX = playerIds.find(id => room.players[id].symbol === 'X');
            const playerO = playerIds.find(id => room.players[id].symbol === 'O');
            
            // Mettre à jour les scores de la salle
            if (result.winner === 'draw') {
                room.scores.draws++;
            } else {
                room.scores[result.winner]++;
            }
            
            // Mettre à jour les statistiques globales
            updateGlobalStats(result.winner, playerX, playerO);
            
            // Ajouter à l'historique de la salle
            room.gameHistory.push({
                winner: result.winner,
                playerX: room.players[playerX].name,
                playerO: room.players[playerO].name,
                timestamp: new Date(),
                board: [...room.board]
            });
            
            // Garder seulement les 10 dernières parties
            if (room.gameHistory.length > 10) {
                room.gameHistory = room.gameHistory.slice(-10);
            }
            
            io.to(socket.currentRoom).emit('game-over', {
                winner: result.winner,
                combination: result.combination,
                gameHistory: room.gameHistory
            });
            io.to(socket.currentRoom).emit('score-update', room.scores);
            
            // Envoyer les stats globales mises à jour
            io.emit('global-stats', {
                totalGames: globalStats.totalGames,
                totalPlayers: globalStats.totalPlayers,
                topPlayers: getTopPlayers(5)
            });
        } else {
            // Changer de joueur
            room.currentPlayer = room.currentPlayer === 'X' ? 'O' : 'X';
        }

        // Envoyer l'état mis à jour
        io.to(socket.currentRoom).emit('game-state', room);
    });

    // Gérer la demande de nouveau jeu
    socket.on('new-game', () => {
        if (!socket.currentRoom) {
            socket.emit('error', 'Vous n\'êtes dans aucune salle');
            return;
        }

        const room = rooms[socket.currentRoom];
        if (!room) {
            socket.emit('error', 'Salle inexistante');
            return;
        }

        // Seul le créateur peut démarrer une nouvelle partie
        if (!room.players[socket.id] || !room.players[socket.id].isCreator) {
            socket.emit('error', 'Seul le créateur peut démarrer une nouvelle partie');
            return;
        }

        resetGame(socket.currentRoom);
        const updatedRoom = rooms[socket.currentRoom];
        io.to(socket.currentRoom).emit('game-state', updatedRoom);
        io.to(socket.currentRoom).emit('score-update', updatedRoom.scores);
        if (updatedRoom.gameStarted) {
            io.to(socket.currentRoom).emit('game-started', {
                firstPlayer: updatedRoom.currentPlayer,
                firstPlayerName: updatedRoom.players[Object.keys(updatedRoom.players).find(id => 
                    updatedRoom.players[id].symbol === updatedRoom.currentPlayer)].name
            });
        }
    });

    // Gérer la déconnexion
    socket.on('disconnect', () => {
        console.log('Un joueur s\'est déconnecté:', socket.id);
        
        // Mettre à jour le nombre de joueurs connectés
        globalStats.totalPlayers = io.engine.clientsCount;
        
        if (socket.currentRoom) {
            const roomId = socket.currentRoom;
            const room = rooms[roomId];
            
            if (room) {
                delete room.players[socket.id];
                
                // Notifier les autres joueurs
                socket.to(roomId).emit('player-disconnected', socket.id);
                
                // Arrêter le jeu si moins de 2 joueurs
                if (Object.keys(room.players).length < 2) {
                    room.gameStarted = false;
                    room.winner = null;
                    io.to(roomId).emit('game-stopped');
                }
                
                // Nettoyer la salle si vide
                cleanupRoom(roomId);
            }
            
            // Mettre à jour la liste des salles pour tous
            io.emit('rooms-list', getPublicRooms());
        }
        
        // Envoyer les stats globales mises à jour
        io.emit('global-stats', {
            totalGames: globalStats.totalGames,
            totalPlayers: globalStats.totalPlayers,
            topPlayers: getTopPlayers(5)
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});