<h1 align="center">👋 Welcome to Pelican Discord Bot</h1>

<p align="center">
A powerful Discord bot to manage your Pelican panel.
</p>

---

## 📚 Table of Contents
- 📖 Description
- ⚡ Features
- ⚙️ Configuration
- 🚀 Getting Started
- 🔗 Links
- ⛔ Reporting Issues
- 📝 License

---

## 📖 Description
Pelican Discord Bot allows you to manage your **Pelican panel directly from Discord**.

### 🖥️ Pelican Management
- 📟 List all eggs
- 🥚 Get information about all nodes

### 🖥️ Admin Server Management
- ➕ Create servers
- ❌ Delete servers
- 📋 View and manage all servers or a specific one:
  - Server details (name, description)
  - Server features (egg, databases / backups / allocations limits)
  - Server limits (CPU / memory / disk)
  - Manage databases / backups (add / remove)
  - Reinstall
  - Transfert
- ⛔ Suspend / Unsuspend servers (can add timer to automatically suspend the server)

### 👤 Admin User Management
- ➕ Create users (email or PDF password delivery)
- ❌ Delete users
- 📋 View users or a specific one
- 🔗 Link / Unlink Discord accounts


### 👤 User Management
- 🔑 Add / Remove api key to be able to manage your servers from Discord
- ✏️ Get information about your Pelican account
- 🖥️ View and manage your servers:
  - Server details (name, description)
  - Manage power actions (start / stop / restart / kill)
  - Manage subusers (add / remove)
  - Manage databases / backups (add / remove)
  - Reinstall
  - Manage monitoring of the server by sending a private message to the users selected when the server is down or up (Add / Remove)

### 📊 Monitoring
- 📡 Monitor Discord bot status:
  - ➕ Add monitored Discord bots
  - ❌ Remove monitored Discord bots
  - 📋 View a list of Discord bots monitored
- 🖥️ Monitor Pelican servers

---

## ⚡ Features

### 🤖 Discord Interactions
- Slash commands
- Autocomplete (users, servers, nodes)
- Buttons & select menus & modals
- Modern Discord UI components (Embed V2 style)
- Cron system to automatically restart tasks after restart of the bot

### 🔐 Flexible API System
- 🌐 Global API key (application-level actions)
- 👤 User API keys (personalized actions per user)

---

## ⚙️ Configuration
### 1. Setup bot
Go to the Discord Developer Portal and create a new application:

🔗 https://discord.com/developers/applications

> 🚨 **IMPORTANT**  
> If you don't add a profile picture to your bot, some commands will not work correctly.

> 🚨 **IMPORTANT 2**  
> You need to add the following Intents to your bot:
>- Presence Intent
> - Server Members Intent

### 2. Config file
Rename config.example.json to config.json

```json
{
  "serverIdDeploySlash": "Id of the server where the slash commands will be deployed",
  "database": {
    "client": "mysql",
    "connection": {
      "host": "Host of the database",
      "port": "3306",
      "user": "User of the database",
      "password": "Password of the database",
      "database": "Name of the database",
      "charset": "utf8mb4"
    },
    "pool": {
      "min": 0,
      "max": 7
    }
  },
  "monitoringBot": {
    "channelId": "Channel where the bot will send the monitoring messages of the status of the bot",
    "roleId": "Role to ping when the bot is down"
  },
  "pelican": {
    "url": "URL of the panel : https://panel.xxx.com",
    "apiKeyApp": "App API key on pelican : ptla_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "mailSetup": "If the mail system is enabled on the panel : true or false",
    "host": "SFTP of the pelican : xxx.com",
    "port": "Port of the pelican : 2022"
  }
}
```
### 3. Environment file
Rename .env.example to .env

```
TOKEN=YOUR_BOT_TOKEN
DEPLOY_SLASH=true : If you want to deploy the slash commands or not (true or false)
```
### 4. API Permissions
Make sure your API key has the correct permissions:
![apiKey.png](assets/apiKey.png)

---

## 🚀 Getting Started
▶️ Invite the bot to your server with the following link:

🔗 https://discord.com/oauth2/authorize?client_id=YOUR_BOT_ID&permissions=8

> 🚨 **IMPORTANT**  
> Replace YOUR_BOT_ID with the ID of your bot.

```md id="i3"
# Install dependencies
npm install

# Start the bot
node main.js
```

---

## 🔗 Links
- If you have any questions, don't hesitate to join the Discord server:

    💬 Discord Support: https://discord.gg/Dwn5Nc6WgR 


- Our website where you can find all our bots:

    🌐 Website: https://botmarket.ovh

---

## ⛔ Reporting Issues
If you find any bugs or encounter unexpected behavior, please don't hesitate to open an issue. Your feedback is valuable and helps improve the project.

You can report issues here: https://github.com/Kirit049-RW/pelican-discord-bot/issues

---

## 📝 License
This project is licensed under the MIT License

