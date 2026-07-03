const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Stockage en mémoire — redémarrer le serveur efface tout.
const users = {};       // { username: socketId }
const publicKeys = {};  // { username: preKeyBundle }

io.on('connection', (socket) => {
  console.log('Connexion :', socket.id);

  socket.on('register', ({ username, keyBundle }) => {
    socket.username = username;
    users[username] = socket.id;
    publicKeys[username] = keyBundle;
    console.log(`${username} enregistré.`);
  });

  socket.on('get-keys', (targetUsername, callback) => {
    if (publicKeys[targetUsername]) {
      callback(publicKeys[targetUsername]);
    } else {
      callback({ error: 'Utilisateur introuvable' });
    }
  });

  socket.on('send-message', ({ to, encryptedMessage }) => {
    const targetSocketId = users[to];
    if (targetSocketId) {
      io.to(targetSocketId).emit('receive-message', {
        from: socket.username,
        encryptedMessage,
      });
    }
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      delete users[socket.username];
      delete publicKeys[socket.username];
      console.log(`${socket.username} déconnecté.`);
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
