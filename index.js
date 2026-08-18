const express = require('express');
const venom = require('venom-bot');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Store chat sessions
const userSessions = {};
let qrCode = 'No QR code yet. Waiting for connection...';
let botStatus = 'Connecting...';

// Express route to show QR code on webpage
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>WhatsApp Bot</title>
      <style>
        body { font-family: Arial; text-align: center; padding: 50px; background: #0a0a0a; color: #fff; }
        .container { max-width: 600px; margin: 0 auto; }
        .status { background: #1a1a1a; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .qr-container { background: #fff; padding: 20px; border-radius: 10px; display: inline-block; }
        .qr-container img { max-width: 300px; }
        .info { color: #888; font-size: 14px; }
        .success { color: #4CAF50; }
        .error { color: #f44336; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 WhatsApp Bot</h1>
        <div class="status">
          <h3>Status: <span id="status">${botStatus}</span></h3>
        </div>
        <div id="qrSection" class="qr-container">
          <p>Scan QR Code with WhatsApp</p>
          <div id="qrImage">${qrCode}</div>
          <p class="info">Open WhatsApp → Linked Devices → Link a Device</p>
        </div>
        <div id="connectedSection" style="display:none;">
          <h2 class="success">✅ Bot Connected!</h2>
          <p>Your bot is now active. Send a message to test it!</p>
        </div>
        <p class="info">Bot is running on Render.com</p>
      </div>
      <script>
        // Auto-refresh every 5 seconds to check for QR code
        setInterval(() => {
          fetch('/qr-status')
            .then(res => res.json())
            .then(data => {
              document.getElementById('status').textContent = data.status;
              if (data.qr && data.qr !== 'No QR code yet. Waiting for connection...') {
                document.getElementById('qrImage').innerHTML = data.qr;
                document.getElementById('qrSection').style.display = 'block';
                document.getElementById('connectedSection').style.display = 'none';
              }
              if (data.status === 'Connected') {
                document.getElementById('qrSection').style.display = 'none';
                document.getElementById('connectedSection').style.display = 'block';
              }
            });
        }, 5000);
      </script>
    </body>
    </html>
  `);
});

// API to check QR status
app.get('/qr-status', (req, res) => {
  res.json({
    status: botStatus,
    qr: qrCode
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Start Venom WhatsApp client
venom
  .create({
    session: 'whatsapp-bot',
    multidevice: true
  })
  .then((client) => {
    console.log('✅ Bot is ready! Scanning QR code...');
    botStatus = 'Ready to scan QR';
    startBot(client);
  })
  .catch((error) => {
    console.log('❌ Error starting bot:', error);
    botStatus = 'Error: ' + error.message;
  });

function startBot(client) {
  // Capture QR code
  client.on('qr', (qr) => {
    console.log('📱 Scan this QR code:');
    qrCode = `<img src="${qr}" alt="QR Code"/>`;
    botStatus = 'Scan QR code with WhatsApp';
    console.log(qr);
  });

  // Connection success
  client.on('ready', () => {
    console.log('✅ WhatsApp connected successfully!');
    botStatus = 'Connected ✅';
    qrCode = 'Connected!';
  });

  // When disconnected
  client.on('disconnected', (reason) => {
    console.log('❌ Disconnected:', reason);
    botStatus = 'Disconnected: ' + reason;
  });

  // Message handler
  client.onMessage(async (message) => {
    // Ignore group messages
    if (message.isGroupMsg) return;

    const from = message.from;
    const body = message.body.trim().toLowerCase();
    const userId = from;

    console.log(`📩 Message from ${from}: ${body}`);

    // Show typing indicator
    await client.sendSeen(from);
    await client.startTyping(from);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await client.stopTyping(from);

    let reply = '';

    // Menu system
    if (body === 'hi' || body === 'hello' || body === 'menu' || body === 'start') {
      reply = `🤖 *Welcome to the Bot!*\n\n` +
        `I'm your personal assistant. Here's what I can do:\n\n` +
        `1️⃣ *Info* - About this bot\n` +
        `2️⃣ *Time* - Current date & time\n` +
        `3️⃣ *Joke* - Get a random joke\n` +
        `4️⃣ *Quote* - Motivation quote\n` +
        `5️⃣ *Todo* - Manage your tasks\n` +
        `6️⃣ *Weather* - Check weather\n\n` +
        `Type *menu* to see this again.`;
    }
    else if (body === '1' || body === 'info') {
      reply = `ℹ️ *About This Bot*\n\n` +
        `This bot runs 24/7 for free using:\n` +
        `• Venom (WhatsApp library)\n` +
        `• Render.com (free hosting)\n` +
        `• No credit card needed 💯\n\n` +
        `Type *menu* to see options.`;
    }
    else if (body === '2' || body === 'time') {
      const now = new Date();
      reply = `🕐 *Current Time*\n\n` +
        `${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n` +
        `${now.toLocaleTimeString()}`;
    }
    else if (body === '3' || body === 'joke') {
      const jokes = [
        'Why do programmers prefer dark mode? Because light attracts bugs! 🐛',
        'What do you call a fake noodle? An impasta! 🍝',
        'Why don\'t scientists trust atoms? Because they make up everything! ⚛️',
        'What do you call a bear with no teeth? A gummy bear! 🐻',
        'Why did the scarecrow win an award? He was outstanding in his field! 🌾'
      ];
      reply = `😂 *Joke Time!*\n\n${jokes[Math.floor(Math.random() * jokes.length)]}`;
    }
    else if (body === '4' || body === 'quote') {
      const quotes = [
        '💪 The only way to do great work is to love what you do - Steve Jobs',
        '🚀 Success is not final, failure is not fatal: it\'s the courage to continue that counts',
        '🌟 Believe you can and you\'re halfway there - Theodore Roosevelt',
        '🎯 It does not matter how slowly you go as long as you do not stop - Confucius'
      ];
      reply = `💡 *Motivation*\n\n${quotes[Math.floor(Math.random() * quotes.length)]}`;
    }
    else if (body === '5' || body === 'todo') {
      if (!userSessions[userId]) {
        userSessions[userId] = { todos: [] };
      }
      const todos = userSessions[userId].todos;
      if (todos.length === 0) {
        reply = `📋 *Your Todo List*\n\nNo tasks yet!\n\nAdd tasks by typing: *add Buy milk*`;
      } else {
        let list = `📋 *Your Todo List*\n\n`;
        todos.forEach((task, i) => {
          list += `${i+1}. ${task}\n`;
        });
        reply = list + `\nTo add: *add Task*\nTo remove: *remove 1*`;
      }
    }
    else if (body.startsWith('add ')) {
      const task = body.substring(4);
      if (!userSessions[userId]) {
        userSessions[userId] = { todos: [] };
      }
      userSessions[userId].todos.push(task);
      reply = `✅ Added: *"${task}"*\nTotal tasks: ${userSessions[userId].todos.length}`;
    }
    else if (body.startsWith('remove ')) {
      const num = parseInt(body.substring(7));
      if (!userSessions[userId] || userSessions[userId].todos.length === 0) {
        reply = `❌ No tasks to remove.`;
      } else if (num > 0 && num <= userSessions[userId].todos.length) {
        const removed = userSessions[userId].todos.splice(num - 1, 1)[0];
        reply = `🗑️ Removed: *"${removed}"*`;
      } else {
        reply = `❌ Invalid number. Type *todo* to see your list.`;
      }
    }
    else if (body === '6' || body === 'weather') {
      reply = `🌤️ *Weather Service*\n\n` +
        `I'm using simulated weather for now.\n` +
        `Type a city name like *New York* or *London*`;
      userSessions[userId] = { ...userSessions[userId], action: 'weather' };
    }
    else if (userSessions[userId]?.action === 'weather') {
      const city = body;
      const weatherData = {
        'new york': '☀️ 72°F, Sunny',
        'london': '🌧️ 58°F, Rainy',
        'tokyo': '⛅ 65°F, Partly Cloudy',
        'sydney': '☀️ 80°F, Clear'
      };
      const result = weatherData[city.toLowerCase()] || '🌤️ 70°F, Nice weather!';
      reply = `🌤️ *Weather in ${city}*\n\n${result}`;
      delete userSessions[userId].action;
    }
    else {
      reply = `🤔 I didn't understand that.\n\n` +
        `Type *menu* to see all commands\n` +
        `Type *help* for quick tips`;
    }

    await client.sendText(from, reply);
    await client.stopTyping(from);
  });

  console.log('🤖 Bot is listening for messages...');
}

app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});
