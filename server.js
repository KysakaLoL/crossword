const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 100000 });
app.use(express.static(__dirname));
const links = new Map();
io.on('connection', socket => {
    links.set(socket.id, new Set());
    socket.on('relay:connect', (target, ack) => {
        const other = io.sockets.sockets.get(target);
        if (!other || other === socket) {
            if (typeof ack === 'function') ack({ error: 'Комната недоступна. Отсканируйте новый QR-код ведущего.' });
            return;
        }
        links.get(socket.id).add(target);
        links.get(target).add(socket.id);
        other.emit('relay:connection', socket.id);
        if (typeof ack === 'function') ack({ ok: true });
    });
    socket.on('relay:data', ({ target, data } = {}) => {
        if (links.get(socket.id)?.has(target)) io.to(target).emit('relay:data', { from: socket.id, data });
    });
    const closeLink = target => {
        if (!links.get(socket.id)?.delete(target)) return;
        links.get(target)?.delete(socket.id);
        io.to(target).emit('relay:close', socket.id);
    };
    socket.on('relay:close', closeLink);
    socket.on('disconnect', () => {
        for (const target of links.get(socket.id) || []) closeLink(target);
        links.delete(socket.id);
    });
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server listening on ${PORT}`));
