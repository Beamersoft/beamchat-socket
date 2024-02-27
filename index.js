import express from 'express';
import http from 'node:http';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import {
	MongoClient,
} from 'mongodb';
import { Server } from 'socket.io';

const {
	MONGODB_URL,
	MONGODB_NAME,
	PORT,
} = process.env;

const client = new MongoClient(MONGODB_URL);
const app = express();
const server = http.createServer(app);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

const io = new Server(server, {
	cors: {
		origin: `http://localhost:${PORT}`,
	},
});

server.listen(PORT, () => {
	console.info(`server running at http://localhost:${PORT}`);
});

await client.connect();
const db = client.db(MONGODB_NAME);
const messagesCollection = db.collection('messages');

console.info('Connected successfully to MongoDB');

io.on('connection', async (socket) => {
	socket.on('CHAT_JOIN', (chatId) => {
		socket.join(chatId);
	});

	socket.on('CHAT_MESSAGE', (msg) => {
		const {
			chatId,
			message,
			iv,
			userId,
		} = msg;

		if (chatId && message) {
			io.to(chatId).emit('CHAT_MESSAGE', {
				chatId,
				message,
				iv,
				userId,
			});

			const messageToInsert = {
				messageId: uuidv4(),
				chatId,
				senderId: userId,
				status: 'sent',
				createdAt: new Date(),
				text: message,
				iv,
			};

			messagesCollection.insertOne(messageToInsert);
		}
	});
});
