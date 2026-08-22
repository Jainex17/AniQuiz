const express = require("express");
const app = express();
const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, GatewayIntentBits, AttachmentBuilder } = require("discord.js");
const quiz = require("./quiz.json");

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

// ---- gemini helpers (free tier, plain REST - no SDK needed) ----
async function geminiChat(prompt) {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "You are Aniquiz, a friendly anime-loving Discord bot. Keep answers short and fun (max ~100 words).",
            },
          ],
        },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    }
  );
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(JSON.stringify(data).slice(0, 300));
  return text;
}

async function geminiImage(prompt) {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    }
  );
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, "base64");
    }
  }
  throw new Error(JSON.stringify(data).slice(0, 300));
}

client.on("messageCreate", async (message) => {
  let msg = message.content;

  if (msg.startsWith(prefix)) {
    const command = msg.slice(prefix.length).split(" ")[0];

    if (command === "test") {
      message.reply("yea runing 😀");
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
              message.reply(`${collected.first().author} got the correct answer!`);
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


  if (msg.startsWith(chatPrefix)) {
    if (message.author.bot) return;
    const chatMsg = msg.replace(chatPrefix, "");
    if (!GEMINI_API_KEY) return message.reply("Gemini API key not set 🥲");

    async function chatbot(prompt) {
      try {
        const waitmsg = await message.reply("wait....");
        const reply = await geminiChat(`${message.author.username} says: ${prompt}`);
        await waitmsg.edit(reply.slice(0, 2000));
      } catch (err) {
        console.error(err);
        message.channel.send("soory we geting some error🥲").catch(() => {});
      }
    }
    return chatbot(chatMsg);
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
