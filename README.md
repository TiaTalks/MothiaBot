This is a Discord Bot written using Discord.js (subset of Node.js). It runs a variant of the game known by names such as “Mafia” and “Werewolf.” When I was younger, I misheard it as “Mothia,” and frankly, I thought vaguely defined giant moth-related things sounded way scarier than the mafia, so that’s how this bot got its name. 

The bot is currently in the multiplayer testing phase! There may still be bugs in it, but all known bugs that interfere with gameplay have been solved. Additional/useful features are still being added, but all the basic features necessary to run a game are there.
Please feel free to tell me about any bugs or design flaws or just general ways to improve my code! I’m relatively new to Discord.js, and I’m still cleaning up and refactoring parts of it as well, so it’s kind of wonky. Feature suggestions and game improvements are also welcome! 

If you don’t want to deal with multiple files, the LongVersion folder in the repository is there for you. It contains all the code in a single file. While it’s functional, it’s very, very long, and it probably falls afoul of best practices in other ways as well. Keeping it up to date won’t be a priority for me, but it’s there if you want it.

I haven’t done a formal license yet, but if you want to use it for some reason, please feel free to use and excerpt the bot’s code so long as:
1. You are using it for non-commercial purposes
2. I am credited as the bot’s original author

I hope this is useful to someone! I’ll do my best to answer any questions.

# Rules

Mothia follows the same premise as most “root out the hidden evil person” games. With the bot, an admin has to initiate a game. At that point, players can sign up for the game until an admin closes the sign-up period. 

After the sign-up ends, the bot calculate how many mothia, how many angels, and how many seers there will be in the game and randomly chooses users for those roles. The bot will DM you your role once it’s finished. The bot will announce the number of each roles in the village, and shortly afterwards, it’ll open up the village chatroom. 
Once the chatroom is open, you’ll have some time to talk with the other players until nightfall. Nightfall begins with the Mothia choosing a target inside their channel. Each Mothia gets one vote, but there’s a time limit on the Mothia phase. The phase ends early if the Mothia finish voting early.

After their turn ends, there is a period where angels and seers can act. Angels may select a target to protect from the Mothia. They do not know other angels’ choices and they cannot protect themselves.   Any seers may choose a target to scry. Scrying reveals the role of the target, which is DMed to the seer. 

After all of them have gone (or the timer runs out on their phase), the bot will announce who has died and their role. At that point, you can vote for the villager who you think is a Mothia (or really, who you just want to kill). This round will last until all users have voted or an admin chooses to end the voting period (if it’s taking too long).
The bot will break any ties.

After voting, the bot will announce the results, and then the mothia rise again. The cycle will repeat until the mothia outnumber the villagers or all the mothia are dead.


# How to Set Up the Bot:
I’ve tried to write these instructions to make it easy for non-coders to install the bot as well. If it’s still too difficult or still has jargon, let me know.

To get this bot to work, you must have Node.js (6.0.0 or newer) and Discord.js. You can download Node.js [here](https://nodejs.org/en/). Once it’s installed, open up your command line (the Terminal on Mac and Command Prompt on Windows) and type the following: “npm install discord.js”. That should install Discord.js

Go to Discord and follow the instructions [here](https://github.com/Chikachi/DiscordIntegration/wiki/How-to-get-a-token-and-channel-ID-for-Discord) to make a bot on Discord. 

Download a version of my MothiaBot.js file(s). I’d recommend the multi-file version, but the single-file version is perfectly functional. I would recommend making a specific folder called something like MothiaBot for the file(s). 

Make a file called config.json. Make sure it’s saved in the same folder as MothiaBot files.
The basic skeleton for your config.json file should be like this:

{
  "token": "",
  "prefix": "#",
  "ownerID": "",
  "botID": "",
  "hangoutID": "",
  "villagersID": "",
  "villageElderID": "",
  "villageID": "",
  "nestID": "",
 "mothiaID": "",
  "angelsID": "",
  "seersID": "",
  "deadID": "",
  "initTime": [a time in milliseconds],  
  "timeUntilMothia": [a time in milliseconds],
  "mothiaPhaseTime": [a time in milliseconds],
  "angelSeerTime": [a time in milliseconds]

}

What goes next to “token” is your bot’s token, which can be found on the Bot page. Copy-paste it inside the empty quotes.

Leave the prefix alone. 

ownerID should be your Discord ID. Likewise, botID is the Discord ID for the bot. hangoutID should be the channel ID for the general channel in your server, wherever you want people to be able to sign up for Mothia. villagersID is the role ID for the players of the game. villageElderID is the role ID for the admin/mod role. villageID is the chatroom for players during the game. nestID is the channel ID for the channel where Mothia can talk to each other. mothiaID, angelsID, seersID, and deadID are the role ids for each of the special roles and the role for the dead players. 

initTime is the amount of time you have between getting DMed your role and the village chatroom opening up. timeUntilMothia is the amount of time you have to talk to each other in the village before the first Mothia phase begins. mothiaPhaseTime and angelSeerTime are how long the special roles have to vote before their phase ends. Do NOT enclose these times in quotes.
You can find the IDs for channels and people by enabling Developer Mode on Discord and then right clicking on the channel/person. To get a role ID, you can type \@Role, so long as the role settings say that anyone can mention it.    

With the config.json file done, you should have all the files you need. 

Finally, get the file path to the folder where you stored your bot and json files. On Windows, if you store the files in a MothiaBot folder inside the Documents folder, the filepath should look something like “C:\Users\[Name]\Documents\MothiaBot>” 
Type “cd [filepath]”. This will put your computer in the MothiaBot folder and make it easier for you to access files inside. 
Type “node MothiaBot.js”. This should get the bot online, which you can tell because the command line will display the message, “I am ready!” 

From here on out, the rest of the work is just in Discord, setting up the channels and roles. You can do it however you like, but keep in mind that the bot needs permission to change others’ roles and to speak in all the channels.

Also note that the bot will go offline if the computer which ran the “node MothiaBot.js” command goes offline. The computer is effectively hosting the bot so you don’t need a server, which makes it easier to run but does mean the bot doesn’t run all the time. However, you need an admin to initiate and supervise a game in the first place. 


# Note: 
A little while after I first started working on this bot, I googled and did notice there’s an existing bot out there (Wolfia) that performs a similar function, but I decided to keep working on mine for a few reasons. 
1: I thought it’d be fun 
2: Theirs is written in Java and mine’s is in JavaScript, so I thought mine might still be useful for anyone who wanted a JavaScript bot instead 
3: I thought it might be useful reference material for people learning Discord.js.
4: I tried to design mine to be usable by non-coders. I didn’t look at Wolfia’s code, but I looked at their about page, and for self-hosting, they require some knowledge of PostgreSQL and other technologies for self-hosting. I’ve done my best to make it easy for any Discord user to use my bot and host it.






