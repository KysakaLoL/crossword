const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Раздаем статику из корня (или создай папку public, если хочешь порядка)
app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log('Игрок подключился:', socket.id);

    // Когда кто-то отгадал слово, сервер пересылает это ВСЕМ остальным
    socket.on('word_guessed', (data) => {
        socket.broadcast.emit('sync_word', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});