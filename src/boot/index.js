function boot(chatsDb, messagesDb, notificationsDb) {
	// Chats collection
	chatsDb.createIndex({ chatId: 1 });
	chatsDb.createIndex({ participantsId: 1 });

	// Messages collection
	messagesDb.createIndex({ chatId: 1 });
	messagesDb.createIndex({ senderId: 1 });
	messagesDb.createIndex({ createdAt: 1 });
	messagesDb.createIndex({ messageId: 1 });

	// Notifications collection
	notificationsDb.createIndex({ senderId: 1 });
	notificationsDb.createIndex({ receiverId: 1 });
	notificationsDb.createIndex({ sentAt: 1 });
	notificationsDb.createIndex({ type: 1 });
}

export default boot;
