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
  COLLECTION_MESSAGES
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
const messagesCollection = db.collection(COLLECTION_MESSAGES);

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
      (usersIds && usersIds.length === 0)) return res.status(400).send('No users provided to create a valid chat');

		const newChat = {
			chatId,
			participantsId: usersIds,
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

app.get('/chats/messages', async (req, res) => {
  try {
    const {
      userId,
      chatId,
      skip,
      limit
    } = req.query;

    if (!userId || !chatId || !skip || !limit) return res.status(400).send('Cannot return messages, you must provide a userId, a chatId, a limit and a skip');

    const userBelongToChat = await chatsCollection.findOne({ chatId: chatId, participantsId: { $in: [userId]} });

    if (!userBelongToChat) return res.status(400).send('User does not belong to chat');

    const messages = await messagesCollection.find({ chatId: chatId })
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .toArray();

    if (messages) {
      return res.json({ messages })
    }

    return res.status(400).send('Cannot find a chat');
  } catch (err) {
    return res.status(400).send(err.toString());
  }
})

io.on('connection', async (socket) => {
	socket.on('chat message', (msg) => {
    const { chatId, message, userId } = msg;
    if (chatId && message) {
      socket.join(chatId);
      io.to(chatId).emit('chat message', { chatId, message, userId });

      const messageToInsert = {
        messageId: uuidv4(),
        chatId: chatId,
        senderId: userId,
        status: 'sent',
        createdAt: new Date(),
        text: message,
      }

      messagesCollection.insertOne(messageToInsert);
    }
	});
});
