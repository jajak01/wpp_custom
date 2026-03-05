const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const wppconnect = require('@wppconnect-team/wppconnect');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3006;

let clientInstance = null;

wppconnect
  .create({
    session: 'My Session 1',
    catchQR: (base64Qr, asciiQR, attempts, urlCode) => {
      console.log('Scan the QR below:');
      console.log(asciiQR);
    },
    statusFind: (status) => console.log(`🟢 Session status: ${status}`),
    headless: true,
    devtools: false
  })
  .then((client) => {
    clientInstance = client;
    console.log('✅ WPPConnect client is ready!');

    client.onMessage((message) => {
      console.log('📩 New message:', message.body);
      io.emit('new_message', message);
    });
  });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Return all chats
app.get('/api/:session/chats', async (req, res) => {
  if (!clientInstance) return res.status(503).json({ error: 'Client not ready' });
  try {
    const chats = await clientInstance.listChats();
    const formatted = chats.map((chat) => ({
      id: chat.id._serialized,
      // Priority: Contact Name > Pushname > Phone Number
      name: chat.name || chat.contact?.pushname || chat.contact?.name || chat.id.user,
      unreadCount: chat.unreadCount || 0,
      lastMessage: chat.lastMessage?.body || '(Media or Link)',
      timestamp: chat.t // Useful for sorting
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ✅ Return messages for a chat
app.get('/api/:session/messages/:chatId', async (req, res) => {
  if (!clientInstance) return res.status(503).json({ error: 'Client not ready' });
  try {
    // Fetching all messages without slicing
    const messages = await clientInstance.getAllMessagesInChat(req.params.chatId, true, true);
    
    const result = messages.map((msg) => ({
      fromMe: msg.fromMe,
      // Fallback for different message types to avoid 'undefined'
      body: msg.body || (msg.type === 'image' ? '📷 Image' : '📎 Media'),
      timestamp: msg.timestamp * 1000,
    }));

    res.json(result);
  } catch (err) {
    console.error('Failed to get messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ✅ Send a message
// ✅ Refined Send Message (Works for both Groups and Private)
app.post('/api/:session/send-message', async (req, res) => {
  const { chatId, message } = req.body; // Use chatId instead of 'phone'

  if (!clientInstance) {
    return res.status(503).json({ error: 'Client not ready' });
  }

  try {
    // Sending to the full ID (e.g., 12345@c.us or 12345-6789@g.us)
    await clientInstance.sendText(chatId, message);
    res.json({ status: 'Message sent' });
  } catch (err) {
    console.error('Send failed:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is live on your network!`);
    console.log(`🏠 Local: http://localhost:${PORT}`);
    console.log(`🌐 Network: http://192.168.1.15:${PORT}`); 
});
