const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log('Игрок подключился:', socket.id);

    socket.on('word_guessed', (data) => {
        socket.broadcast.emit('sync_word', data);
    });

    socket.on('disconnect', () => {
        console.log('Игрок отключился:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
