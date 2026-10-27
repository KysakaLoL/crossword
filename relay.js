// Connection interface used by the game; all traffic travels through Render.
class RelayEvents {
    constructor() { this.events = new Map(); }
    on(name, callback) {
        if (!this.events.has(name)) this.events.set(name, []);
        this.events.get(name).push(callback);
        return this;
    }
    emit(name, value) { for (const callback of this.events.get(name) || []) callback(value); }
}
class RelayConnection extends RelayEvents {
    constructor(owner, id) { super(); this.owner = owner; this.peer = id; this.open = false; }
    send(data) { if (this.open) this.owner.socket.emit('relay:data', { target: this.peer, data }); }
    close() {
        this.owner.socket.emit('relay:close', this.peer);
        this.finish();
    }
    finish() {
        this.open = false;
        this.owner.connections.delete(this.peer);
        this.emit('close');
    }
}
class RelayPeer extends RelayEvents {
    constructor() {
        super();
        this.connections = new Map();
        this.socket = io();
        this.socket.on('connect', () => this.emit('open', this.socket.id));
        this.socket.on('connect_error', () => this.emit('error', new Error('Сервер недоступен. Проверьте интернет и дождитесь запуска Render.')));
        this.socket.on('relay:connection', id => {
            const conn = new RelayConnection(this, id);
            conn.open = true;
            this.connections.set(id, conn);
            this.emit('connection', conn);
        });
        this.socket.on('relay:data', ({ from, data }) => this.connections.get(from)?.emit('data', data));
        this.socket.on('relay:close', id => this.connections.get(id)?.finish());
        this.socket.on('disconnect', () => {
            for (const conn of this.connections.values()) conn.finish();
            this.emit('error', new Error('Связь с сервером потеряна. После восстановления откройте свежий QR-код ведущего.'));
        });
    }
    connect(id) {
        const conn = new RelayConnection(this, id);
        this.connections.set(id, conn);
        this.socket.timeout(20000).emit('relay:connect', id, (error, result) => {
            if (error || !result?.ok) {
                conn.finish();
                this.emit('error', new Error(result?.error || 'Сервер не ответил. Повторите вход.'));
                return;
            }
            conn.open = true;
            conn.emit('open');
        });
        return conn;
    }
}
