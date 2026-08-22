const express = require("express");
const app = express();
const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, GatewayIntentBits, AttachmentBuilder } = require("discord.js");
const quiz = require("./quiz.json");
const { createStore } = require("./store");
const { buildSystemPrompt, buildContents } = require("./persona");
const { rosterCache } = require("./events/ready");
const { geminiChat, geminiImage } = require("./gemini");

const store = createStore(process.env.DB_PATH || "aniquiz.db");

// ---- config: env vars first (Render), config.json fallback (local dev) ----
let token = process.env.DISCORD_TOKEN;
let GEMINI_API_KEY = process.env.GEMINI_API_KEY;
try {
  const cfg = require("./config.json");
  token = token || cfg.token;
  GEMINI_API_KEY = GEMINI_API_KEY || cfg.GEMINI_API_KEY || cfg.OPENAI_API_KEY;
} catch {}

if (!token) {
  console.error(
    "No bot token found!\n" +
      "Set DISCORD_TOKEN env var (Render) or create config.json with { \"token\": \"...\", \"GEMINI_API_KEY\": \"...\" }"
  );
  process.exit(1);
}

// ---- web server (keeps Render free service alive when pinged) ----
app.get("/", (req, res) => {
  res.send("bot runing!");
});
app.listen(process.env.PORT || 3000, () => {
  console.log("Project is running!");
});

// ---- discord client ----
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

//get commands files from commands folder
client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
    );
  }
}

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

let prefix = "let ";
let chatPrefix = "chat ";
let imgPrefix = "giveimg ";

function requesterProfile(message) {
  const member = message.member;
  return {
    name: member?.displayName || message.author.username,
    roles: member?.roles?.cache
      ? member.roles.cache
          .filter((r) => r.name !== "@everyone")
          .map((r) => r.name)
          .slice(0, 10)
      : [],
    joined: member?.joinedAt ? member.joinedAt.toISOString().slice(0, 10) : null,
  };
}

client.on("messageCreate", async (message) => {
  let msg = message.content;

  if (msg.startsWith(prefix)) {
    const command = msg.slice(prefix.length).split(" ")[0];

    if (command === "test") {
      message.reply("yea runing 😀");
    }

    if (command === "forget") {
      await store.clearUser(message.author.id);
      message.reply("done, I forgot everything about you 🧹");
    }

    if (command === "remember") {
      const fact = msg.slice(prefix.length + 9).trim();
      if (!fact) return message.reply("give me something to remember! like: let remember my fav anime is FMAB");
      await store.addFact(message.author.id, fact);
      message.reply(`got it, I'll remember that ✨`);
    }

    if (command === "quiz") {
      const item = quiz[Math.floor(Math.random() * quiz.length)];
      const filter = response => {
        return item.answers.some(answer => answer.toLowerCase() === response.content.toLowerCase());
      };

      message.reply({ content: item.question, fetchReply: true })
        .then(() => {
          message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] })
            .then(collected => {
              const winner = collected.first().author;
              store.addScorePoint(winner.id, winner.username).catch(() => {});
              message.reply(`${winner} got the correct answer! +1 point 🎉`);
            })
            .catch(collected => {
              message.reply('Looks like nobody got the answer this time.');
            });
        });
    }
    // normal quiz
    if (command === "trivia") {
      try {
        const responce = await fetch("https://opentdb.com/api.php?amount=1&category=31&difficulty=easy&type=boolean");
        const data = await responce.json();

        const getq = data.results[0]["question"];
        const p1 = /&quot;/gi;
        const p2 = /&#039;/gi;
        const p3 = /&eacute;/gi;

        const q = getq.replace(p1, '"').replace(p2, "'").replace(p3, "é");

        const ans = data.results[0]["correct_answer"];

        message.channel.send("qustion: " + q + "\nans with True/False");

        const masg_filter = m => m.author.id === message.author.id;
        const waitans = await message.channel.awaitMessages({
          filter: masg_filter,
          max: 1,
          time: 60000,
        });
        const uans = waitans.first();
        if (!uans) return;
        if (uans.content === "True" || uans.content === "False") {
          if (uans.content === ans) {
            uans.reply("correct 😒");
          }
          else {
            uans.reply("wrong 🤣");
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  }


  const usedChatPrefix = [chatPrefix, "c "].find((p) => msg.startsWith(p));
  if (usedChatPrefix) {
    if (message.author.bot) return;
    const chatMsg = msg.slice(usedChatPrefix.length).trim();
    if (!chatMsg) return message.reply("talk to me! like: chat recommend an anime");
    if (!GEMINI_API_KEY) return message.reply("Gemini API key not set 🥲");

    async function chatbot() {
      let waitmsg;
      try {
        const requester = requesterProfile(message);
        const [facts, history] = await Promise.all([
          store.getFacts(message.author.id),
          store.getHistory(message.author.id, 16),
        ]);
        const roster = rosterCache.get(message.guildId) || [];
        const systemPrompt = buildSystemPrompt({ requester, roster, facts });
        const contents = buildContents(history, `${requester.name}: ${chatMsg}`);

        waitmsg = await message.reply("wait....");
        const reply = await geminiChat(systemPrompt, contents);

        await store.addMessage(message.author.id, message.channelId, "user", `${requester.name}: ${chatMsg}`);
        await store.addMessage(message.author.id, message.channelId, "model", reply);
        await store.trimHistory(message.author.id);

        await waitmsg.edit(reply.slice(0, 2000));
      } catch (err) {
        console.error(err);
        if (waitmsg) waitmsg.edit("soory we geting some error🥲").catch(() => {});
        else message.channel.send("soory we geting some error🥲").catch(() => {});
      }
    }
    return chatbot();
  }

  // text to img
  if (msg.startsWith(imgPrefix)) {
    if (message.author.bot) return;
    const imgMsg = msg.replace(imgPrefix, "");
    if (!GEMINI_API_KEY) return message.reply("Gemini API key not set 🥲");

    async function textToImg(prompt) {
      try {
        const waitmsg = await message.reply("wait....");
        const imageBuffer = await geminiImage(prompt);
        const attachment = new AttachmentBuilder(imageBuffer, { name: "image.png" });
        await waitmsg.edit({ content: `here you go ${message.author} 🎨`, files: [attachment] });
      } catch (err) {
        console.error(err);
        message.channel.send("soory we geting some error🥲").catch(() => {});
      }
    }
    return textToImg(imgMsg);
  }

  //end here msg create
});


client.login(token);
