/* eslint-disable import/no-extraneous-dependencies */
const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');

async function main() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server);

  app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
  });

  io.on('connection', async (socket) => {
    socket.on('chat message', (msg) => {
      console.info('message ', msg);
      io.emit('chat message', msg);
    });
  });

  const port = process.env.PORT;

  server.listen(port, () => {
    console.info(`server running at http://localhost:${port}`);
  });
}

main();
