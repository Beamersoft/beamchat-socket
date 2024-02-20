import express from 'express';
import http from 'node:http';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import {
	MongoClient,
	ObjectId,
} from 'mongodb';
import { Server } from 'socket.io';
import { join } from 'node:path';
import boot from './src/boot/index.js';
import {
	authenticateToken,
	getUserDataFromToken,
} from './src/middlewares/auth.js';

const {
	MONGODB_URL,
	MONGODB_NAME,
	PORT,
	COLLECTION_CHATS,
	COLLECTION_MESSAGES,
	COLLECTION_USERS,
	COLLECTION_NOTIFICATIONS,
} = process.env;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const chatsCollection = db.collection(COLLECTION_CHATS);
const messagesCollection = db.collection(COLLECTION_MESSAGES);
const usersCollection = db.collection(COLLECTION_USERS);
const notificationsCollection = db.collection(COLLECTION_NOTIFICATIONS);

boot(
	chatsCollection,
	messagesCollection,
	notificationsCollection,
);

console.info('Connected successfully to MongoDB');

app.get('/', (req, res) => {
	res.sendFile(join(__dirname, 'index.html'));
});

app.get('/chat/all', authenticateToken, async (req, res) => {
	try {
		const userJwt = getUserDataFromToken(req);

		if (!userJwt) return res.status(400).send('No userjwt data supplied');
		if (!userJwt.email) return res.status(400).send('No userjwt email supplied');

		const user = await usersCollection.findOne({ email: userJwt.email });

		if (!user) return res.status(400).send('No user data supplied');

		const chats = await chatsCollection.find({
			participants: { $elemMatch: { id: user._id } }, // Convert ObjectId to string
		}).toArray();

		const participantIds = chats.reduce((acc, chat) => {
			chat.participants.forEach((participant) => {
				if (acc.indexOf(participant.id) === -1) acc.push(participant.id.toString());
			});
			return acc;
		}, []);

		const participantObjectId = participantIds.map((id) => new ObjectId(id));

		const userDetails = await usersCollection.find({
			_id: { $in: participantObjectId },
		}, {
			projection: { firstName: 1, lastName: 1 },
		}).toArray();

		const users = {};

		// eslint-disable-next-line no-restricted-syntax
		for (const u of userDetails) {
			if (user._id.toString() !== u._id.toString()) users[u._id] = u;
		}

		return res.json({ chats, users });
	} catch (err) {
		return res.status(400).send(err.toString());
	}
});

app.post('/chat', authenticateToken, async (req, res) => {
	try {
		const userJwt = getUserDataFromToken(req);

		const {
			isPrivate,
			pubKey,
			invitedEmail,
		} = req.body;

		if (!pubKey) return res.status(400).send('No pubKey provided to join a valid chat');

		if (userJwt.email === invitedEmail) return res.status(400).send('Cannot invite yourself to a chat');

		const user = await usersCollection.findOne({ email: userJwt.email });

		if (!user) return res.status(400).send('User not found');

		const invitedUser = await usersCollection.findOne({ email: invitedEmail });

		if (!invitedUser) return res.status(400).send('Invited user not found');

		const newNotification = {
			senderId: user._id,
			receiverId: invitedUser._id,
			status: 'pending',
			type: 'NOTIFICATION_CHAT_INVITE',
			sentAt: new Date(),
			respondedAt: null,
		};

		notificationsCollection.insertOne(newNotification);

		// TODO: Send push notification to invitedUser

		const chatId = uuidv4();

		const newChat = {
			chatId,
			participants: [{
				id: user._id,
				pubKey,
			}, {
				id: invitedUser._id,
				pubKey: null,
			}],
			isPrivate: isPrivate || true,
			createdAt: new Date(),
		};

		chatsCollection.insertOne(newChat);

		return res.json({ chatId });
	} catch (err) {
		return res.status(400).send(err.toString());
	}
});

app.post('/chat/join', authenticateToken, async (req, res) => {
	try {
		const userJwt = getUserDataFromToken(req);

		const {
			chatId,
			pubKey,
		} = req.body;

		if (!userJwt) return res.status(400).send('No userjwt data supplied');
		if (!userJwt.email) return res.status(400).send('No userjwt email supplied');
		if (!chatId) return res.status(400).send('No chatId provided to join a valid chat');
		if (!pubKey) return res.status(400).send('No pubKey provided to join a valid chat');

		const user = await usersCollection.findOne({ email: userJwt.email });

		if (!user) return res.status(400).send('User not found');

		const chat = await chatsCollection.findOne({ chatId });

		if (!chat) return res.status(400).send('Chat not found');

		await chatsCollection.updateOne({
			chatId,
		}, {
			$push: {
				participants: {
					id: user._id,
					pubKey,
				},
			},
		});

		return res.json(true);
	} catch (err) {
		return res.status(400).send(err.toString());
	}
});

app.get('/messages', authenticateToken, async (req, res) => {
	try {
		const {
			userId,
			chatId,
			skip,
			limit,
		} = req.query;

		if (!userId || !chatId || !skip || !limit) return res.status(400).send('Cannot return messages, you must provide a userId, a chatId, a limit and a skip');

		const userBelongToChat = await chatsCollection.findOne({ chatId, participantsId: { $in: [userId] } });

		if (!userBelongToChat) return res.status(400).send('User does not belong to chat');

		const messages = await messagesCollection.find({ chatId })
			.sort({ createdAt: -1 })
			.skip(Number(skip))
			.limit(Number(limit))
			.toArray();

		if (messages) {
			return res.json({ messages });
		}

		return res.status(400).send('Cannot find a chat');
	} catch (err) {
		return res.status(400).send(err.toString());
	}
});

app.get('/notifications', authenticateToken, async (req, res) => {
	try {
		const userJwt = getUserDataFromToken(req);

		if (!userJwt) return res.status(400).send('No userjwt data supplied');
		if (!userJwt.email) return res.status(400).send('No userjwt email supplied');

		const user = await usersCollection.findOne({ email: userJwt.email });

		if (!user) return res.status(400).send('User does not exist');

		const notifications = await notificationsCollection.find({ receiverId: user._id }).toArray();

		return res.json({ notifications });
	} catch (err) {
		return res.status(400).send(err.toString());
	}
});

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
