const wppconnect = require('@wppconnect-team/wppconnect');
const fs = require('fs');

wppconnect.create({
    session: 'my-session',
}).then((client) => {
    console.log('✅ Bot is Active');

    client.onMessage((message) => {
        const filePath = './messages.json';
        let data = [];

        // 1. Read existing data
        if (fs.existsSync(filePath)) {
            data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }

        // 2. Format the new message
        const newMessage = {
            from: message.from,
            name: message.sender.pushname || message.from,
            text: message.body,
            timestamp: new Date().toISOString()
        };

        // 3. Save it
        data.push(newMessage);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        console.log(`💾 Saved message from ${newMessage.name}`);
    });
});