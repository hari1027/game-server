const WebSocket = require('ws');
const http = require('http');
const express = require("express");
const cors = require('cors');
const app = express();

app.use(express.json({ type: "application/json" }));
app.use(cors());

app.get("/", (req, res) => {
    res.send("Api is connected");
});

const server = http.createServer(app);
const wsServer = new WebSocket.Server({ server: server });
const rooms = {};
const websockets = []

function broadcastToRoom(webSocketmessage) {
    const mes = JSON.parse(webSocketmessage);
    if (mes.type === "delete") {
        for (const client of wsServer.clients) {
            client.send(webSocketmessage);
        }
    }
    else if (mes.type === "kicked") {
        for (const client of wsServer.clients) {
            client.send(webSocketmessage);
        }
    }
    else {
        for (const client of wsServer.clients) {
            client.send(webSocketmessage);
        }
    }
};

wsServer.on('connection', function (ws) {
    ws.on('message', (message) => {
        let mes = JSON.parse(message)
        console.log(mes);
        broadcastToRoom(JSON.stringify(mes));
    });
});

app.post('/create-room', (req, res) => {
    let randomNumber = Math.floor(Math.random() * 10000);
    let fourDigitCode = randomNumber.toString().padStart(4, '0');
    const roomId = fourDigitCode;
    rooms[roomId] = { participants: [] };
    res.json({ roomId });
});

app.post('/join-room', (req, res) => {
    const { roomId, name } = req.body;
    if (!rooms[roomId]) {
        return res.status(404).json({ error: 'Room not found' });
    }
    rooms[roomId].participants.push(name);

    const ws = {}
    ws.roomId = roomId;
    ws.name = name;
    websockets.push(ws);

    broadcastToRoom(JSON.stringify({ roomId: roomId, sender: name, type: 'join', notifyMessage: `${name} joined the room` }));

    res.json({ message: `${name} joined the room` });
});

app.get('/get-participants/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    if (!rooms[roomId]) {
        return res.status(404).json({ error: 'Room not found' });
    }
    const participants = rooms[roomId].participants;
    res.json(participants);
});

app.post('/leave-room', (req, res) => {
    const { roomId, name, type } = req.body;
    if (!rooms[roomId]) {
        return res.status(404).json({ error: 'Room not found' });
    }
    const participants = rooms[roomId].participants;
    const index = participants.indexOf(name);
    if (index !== -1) {
        participants.splice(index, 1);

        for (let i = websockets.length - 1; i >= 0; i--) {
            const ws = websockets[i];
            if (ws.roomId === roomId && ws.name === name && type === "kick") {
                websockets.splice(i, 1);
                broadcastToRoom(JSON.stringify({ roomId: roomId, sender: name, type: "kicked", notifyMessage: "Sorry you have been kicked out of the room by host" }));
                broadcastToRoom(JSON.stringify({ roomId: roomId, sender: name, type: type, notifyMessage: type === "leave" ? `${name} left the room` : `${name} has been kicked out by the host` }));
            }
            else if (ws.roomId === roomId && ws.name === name) {
                websockets.splice(i, 1);
                broadcastToRoom(JSON.stringify({ roomId: roomId, sender: name, type: type, notifyMessage: type === "leave" ? `${name} left the room` : `${name} has been kicked out by the host` }));
            }
        }
        res.json({ message: `${name} left the room` });
    } else {
        res.status(404).json({ error: 'User not found in the room' });
    }
});

app.delete('/delete-room/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    if (!rooms[roomId]) {
        return res.status(404).json({ error: 'Room not found' });
    }

    for (let i = websockets.length - 1; i >= 0; i--) {
        const ws = websockets[i];
        if (ws.roomId === roomId) {
            websockets.splice(i, 1);
            broadcastToRoom(JSON.stringify({ roomId: roomId, type: 'delete', notifyMessage: `Room ${roomId} has been deleted, and all participants have been removed.` }));
        }
    }
    rooms[roomId].participants = [];
    delete rooms[roomId];
    res.json({ message: `Room ${roomId} has been deleted, and all participants have been removed.` });
});

server.listen(5000, () => {
    console.log('WebSocket server listening on port 5000');
});