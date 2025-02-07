const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const rooms = {};  // Store rooms and tokens
const peers = {};  // Track users in each room

async function validate(req) {
    console.log(req.headers.authorization);  // Log the authorization header

    try {
        const authResponse = await fetch('http://127.0.0.1:8000/api/validate/', {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': req.headers.authorization // Use Bearer or Token if required
            },
        });

        if (!authResponse.ok) {
            return { is_allowed: false, error: 'Failed security validation' };
        }

        const data = await authResponse.json();  // Wait for JSON to be parsed
        console.log("Django response:", data);  // Log actual response

        return data;
    } catch (error) {
        console.error('Validation error:', error);
        return { is_allowed: false, error: 'Internal validation error' };
    }
}

// Create Room
app.post('/create-room', async (req, res) => {  // Make the route async
    try {
        // security check
        const validationResponse = await validate(req);  // Await validation
        console.log("Auth server response:", validationResponse);  // Log the response
        console.log(validationResponse.is_allowed);
        if (validationResponse.is_allowed) {
            // Security passed, create the room
            const roomId = crypto.randomBytes(4).toString('hex');
            const token = crypto.randomBytes(8).toString('hex');
            rooms[roomId] = token;

            res.json({ roomId, token });
        } else {
            return res.status(403).json({ error: 'Unauthorized: Security check failed' });
        }

    } catch (error) {
        console.error("Error during room creation:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Join Room
app.post('/join-room', async (req, res) => {
    // security check
    const validationResponse = await validate(req);
    if (validationResponse.is_allowed) {
        const { roomId, token } = req.body;
        if (rooms[roomId] && rooms[roomId] === token) {
            res.json({ success: true });
        } else {
            res.status(403).json({ success: false, message: 'Invalid room or token' });
        }
    } else {
        return res.status(403).json({ error: 'Unauthorized: Security check failed' });
    }
});

// WebSocket Handling
wss.on('connection', (ws) => {
    // security check
    // const validationResponse = validate(req);
    // if (validationResponse.is_allowed) {

        console.log('A user connected');

        ws.on('message', (message) => {
            const data = JSON.parse(message);
            const { roomId, userId } = data;

            if (!peers[roomId]) peers[roomId] = [];
            if (!peers[roomId].includes(ws)) peers[roomId].push(ws);

            // Notify existing users of a new participant
            if (data.type === 'join-room') {
                peers[roomId].forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'user-joined', userId }));
                    }
                });
            }

            // Relay offers, answers, and ICE candidates
            if (['offer', 'answer', 'ice-candidate'].includes(data.type)) {
                peers[roomId].forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(data));
                    }
                });
            }
        });

        ws.on('close', () => {
            for (const roomId in peers) {
                peers[roomId] = peers[roomId].filter(client => client !== ws);
            }
            console.log('User disconnected');
        });
    // } 
    // else {
    //     return res.status(403).json({ error: 'Unauthorized: Security check failed' });
    // }
});

server.listen(3000, () => {
    console.log('Server running on port 3000');
});