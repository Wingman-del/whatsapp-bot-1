const express = require('express');
const venom = require('venom-bot');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Store chat sessions (simple in-memory)
const userSessions = {};

// Start Venom WhatsApp client
venom
  .create({
    session: 'whatsapp-bot',
    multidevice: true
  })
  .then((client) => startBot(client))
  .catch((error) => {
    console.log('Error starting bot:', error);
  });

function startBot(client) {
  console.log('✅ Bot is ready! Scan QR code to connect.');

  // Welcome message when someone sends a message
  client.onMessage(async (message) => {
    // Ignore messages from groups (optional)
    if (message.isGroupMsg) return;

    const from = message.from;
    const body = message.body.trim().toLowerCase();
    const userId = from;

    console.log(`📩 Message from ${from}: ${body}`);

    // Show typing indicator (makes it feel human)
    await client.sendSeen(from);
    await client.startTyping(from);

    // Wait a moment to simulate human response
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Stop typing
    await client.stopTyping(from);

    // --- Menu System ---
    let reply = '';

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
      // Simulated weather response
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

    // Send the reply
    await client.sendText(from, reply);

    // Stop typing after sending
    await client.stopTyping(from);
  });

  console.log('🤖 Bot is listening for messages...');
}

// Express server for Render health checks
app.get('/', (req, res) => {
  res.send('🤖 WhatsApp Bot is running!');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

// Self-ping to keep Render awake (runs every 14 minutes)
setInterval(() => {
  fetch(`https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost'}/health`)
    .catch(err => console.log('Self-ping: no response'));
}, 14 * 60 * 1000);