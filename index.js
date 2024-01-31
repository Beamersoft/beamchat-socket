import express from 'express';
import http from 'node:http';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import { Server } from 'socket.io';
import { join } from 'node:path';

const {
	MONGODB_URL,
	MONGODB_NAME,
	PORT,
	COLLECTION_CHATS,
	COLLECTION_USERS,
} = process.env;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new MongoClient(MONGODB_URL);
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

server.listen(PORT, () => {
	console.info(`server running at http://localhost:${PORT}`);
});

await client.connect();
const db = client.db(MONGODB_NAME);
const chatsCollection = db.collection(COLLECTION_CHATS);
const usersCollection = db.collection(COLLECTION_USERS);

console.info('Connected successfully to MongoDB');

app.get('/', (req, res) => {
	res.sendFile(join(__dirname, 'index.html'));
});

// TODO: Needs authentication
app.post('/chats', async (req, res) => {
	try {
		const chatId = uuidv4();

		const {
			usersIds,
			isPrivate,
		} = req.body;

		if (!usersIds ||
      (usersIds && !Array.isArray(usersIds)) ||
      (usersIds && usersIds.length === 0)) throw new Error('No users provided to create a valid chat');

		const newChat = {
			chatId,
			participantsId: usersIds,
			messages: [],
			isPrivate: isPrivate || true,
			createdAt: new Date(),
		};

		chatsCollection.insertOne(newChat);

		const usersObjectIds = usersIds.map((id) => new ObjectId(id));

		const updated = await usersCollection.updateMany(
			{ _id: { $in: usersObjectIds } },
			{ $push: { chats: chatId } },
		);

		if (updated) {
			return res.json({ updated, chatId });
		}
		return res.status(400).send('Cannot create a chat');
	} catch (err) {
		return res.status(400).send(err.toString());
	}
});

io.on('connection', async (socket) => {
	socket.on('chat message', (msg) => {
		console.info('message ', msg);
		io.emit('chat message', msg);
	});
});
