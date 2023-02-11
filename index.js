const express = require("express");
const app = express();
const fetch = require("node-fetch");
// put online
app.listen(3000, () => {
  console.log("Project is running!");
});
app.get("/", (req, res) => {
  res.send("bot runing!");
});

const fs = require("node:fs");
const path = require("node:path");
const { token, OPENAI_API_KEY } = require("./config.json");
const { Client, Collection, GatewayIntentBits, Events } = require("discord.js");
const quiz = require("./quiz.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// // chat bot
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

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
        max: 1
      });
      const uans = waitans.first();
      if (uans.content === "True" || uans.content === "False") {
        if (uans.content === ans) {
          uans.reply("correct 😒");
        }
        else {
          uans.reply("wrong 🤣");
        }
      }
    }
  }


  if (msg.startsWith(chatPrefix)) {
    async function chatbot(prompt) {
      try {
        // console.log("start search");
        const waitmsg = await message.reply("wait....");
        const getresponse = await openai.createCompletion({
          model: "text-davinci-003",
          prompt: `${message.author.username}: ${prompt} \n\ ChatGPT:`,
          temperature: 0.5,
          max_tokens: 100,
          top_p: 1,
          stop: ["GPT3:", `${message.author.username}`],
        });

        if (getresponse) {
          waitmsg.edit(`${getresponse.data.choices[0].text}`);
        } else {
          console.log("error in getresponce");
          waitmsg.edit("soory we geting some error🥲");
        }

        return;
      } catch (err) {
        console.log(err);
      }
    }
    const chatMsg = msg.replace("chat ", '')
    if (message.author.bot) {
      return;
    }
    return chatbot(chatMsg);
  }

  // text to img img
  if (msg.startsWith(imgPrefix)) {

    async function textToImg(prompt) {
      try {
        // console.log("start search");
        const waitmsg = await message.reply("wait....");

        const getresponse = await openai.createImage({
          prompt: `${prompt}`,
          n: 1,
          size: "1024x1024",
        });
        let image_url = getresponse.data.data[0].url;

        if (image_url) {
          waitmsg.edit(`${image_url}`);
        } else {
          console.log("error in getresponce");
          waitmsg.edit("soory we geting some error🥲");
        }

        return;
      } catch (err) {
        console.log(err);
      }
    }
    const imgMsg = msg.replace("giveimg ", '')
    if (message.author.bot) {
      return;
    }
    return textToImg(imgMsg);
  }




  //end here msg create
});


client.login(token);
