/*
* Author: TiaTalks
* File: MothiaBot.js
* Date: January 2019
* A Discord Bot that runs games of a variant of Mafia/Werewolf/Whatever new names it has. 
*/


//TODO
//Allow you to end game in sign-up mode
//Add #remove and #quit
//Add warning timers
//Add dead people channel and figure out why the array is working so inconsistently
//Stop angels from protecting themselves
//Fix the order of messages if there are no mothia votes
//Rank Dead above Villager and take away village talking permissions so they can't talk in the-village
//Remove angel-seer phase if there are no people with that role
//Fancy up voice-of-god 
//Add a pause between voting and next Mothia stage?
//Have the bot reveal angels and seers' scrying and protecting in the dead channel?
//Add better error messages


"use strict";

const Discord = require('discord.js');
//const client = new Discord.Client();
const config = require("./config.json");

const setup = require("./GameSetup.js");
const gameplay = require("./Gameplay.js");



var mothiaBot = function(){
	this.client = new Discord.Client();
	this.bot = this;

	this.hangout;
	this.village;
	this.nest;


	//Booleans tracking whether there's a game going on and if so, what stage is it in.
	this.signUpMode = false;
	this.gameMode = false;
	this.mothiaMode = false; 
	this.angelSeerMode = false;
	this.voteMode = false;

	this.players; //player ids to roles
	this.playerNames; //player names to ids
	this.mothiaArray;  //Array to store which players are Mothia
	this.angelsArray;  //Array to store which players are Angels
	this.seersArray;   //Array to store which players are Seers*/
	//this.deadArray;

	

	this.run = function(){
		this.client.login(config.token);

		this.client.on("ready", () => {
		  	//Store the necessary channels
		   	this.hangout = this.client.channels.get(config.hangoutID);
		 	this.village = this.client.channels.get(config.villageID);
			this.nest = this.client.channels.get(config.nestID);
			console.log("I am ready!");
		});




		//Send a welcome message to anyone who joins the server.
		this.client.on("guildMemberAdd", member => {
		  this.hangout.send("Welcome to the server, <@" + member.id + ">! I'm your friendly local bot! " + 
		  	"Please @me or DM me the word #commands to find out what I can do for you!");
		});



		//Sets up the bot to respond to commands, both in the server and in DMs. 
		//Commands in the server require the message to begin with @MothiaBot
		this.client.on("message", message => {
			if( message.author.bot){
				return;
			}
			else{ //If it's @ed at the bot or DMed to the bot
				if(message.content.startsWith("<@" + config.botID +">") || message.channel.type == "dm") { 
					if(!this.gameMode){ //General commands
						this.generalCommands(message);
					}
					else{
						this.gameCommands(message);
					}
				}

			}
		});


		/**
		* Helper function. Handles the bot responses to commands outside of games (including the sign-up period before games).
		* @param message is the command it's responding to.
		*/
		this.generalCommands = function(message){
			if (message.content.includes(config.prefix + "rules")){
				this.giveRules(message.author);
			}
			else if(message.content.includes(config.prefix + "commands")){
				this.giveCommands(message);
			}
			else if(message.content.includes(config.prefix + "signup")){
				if((this.signUpMode) && (message.channel.id == config.hangoutID)){
					setup.signUpUser(message, bot);
				}
				else{
					message.channel.send("Sorry, <@" + message.author.id + ">! You can't sign up for a game right now.")
				}
			}

			else if( message.content.includes(config.prefix + "startGame") ){
				if(message.member.roles.has(config.villageElderID)){
					if(!this.signUpMode && !this.gameMode){
						setup.beginSignUp(bot);
					}
					else{
						message.channel.send("Sorry, a game is already in progress!");
					}
				}
				else{
					message.channel.send("You don't have permission to begin a game, sorry!" +
						"Please ask an elder if you want to begin a new game");
				}
			}

			else if( message.content.includes(config.prefix + "closeGame") ){
				if(message.member.roles.has(config.villageElderID)){
					if(this.signUpMode){
						setup.endSignUp(bot);
					}
					else{
						message.channel.send("The sign-up period isn't open right now.");
					}
				}
				else{
					message.channel.send("You don't have permission to close a game, sorry! " + 
						"Please ask an elder to end the sign-up period");
				}
			} 
			else if(  message.content.includes(config.prefix + "exile")  ){
				if(message.member.roles.has(config.villageElderID)){
					this.exile(message);
				}
				else{
					message.channel.send("You can't exile me, silly!");
				}
			}


			else if ( message.content.includes(config.prefix + "voice-of-god")  ){
				if( (message.author.id == config.ownerID) ){
					message.channel.send(message.content.split("voice-of-god")[1]);
				}
			}
		}




		/**
		* Helper function. Handles the bot responses to game commands and makes sure they come from the right roles/channels.
		* @param message is the command it's responding to.
		*/

		this.gameCommands = function(message){
			if( ( message.content.includes(config.prefix + "vote") ) && (message.channel.id == config.villageID) ){
				gameplay.vote(message, bot); 
			}
			else if( ( message.content.includes(config.prefix + "kill") ) && (message.channel.id == config.nestID) && (this.mothiaMode)){
				gameplay.kill(message, bot);
			}
			else if( (message.content.includes(config.prefix + "protect")) && (message.channel.type == "dm") && (this.angelSeerMode) ){
				gameplay.protect(message, bot);
			}

			else if(message.content.includes(config.prefix + "scry") && (message.channel.type == "dm") && (this.angelSeerMode) ){
				gameplay.scry(message, bot);	
			}
			/*else if(message.content.includes(config.prefix + "quit")){
				message.channel.send("Sorry to see you go! I hope you had fun!"); 
			}*/
			/*else if(message.content.includes(config.prefix + "remove")){ //Add in this admin level command
			}*/

			else if( (message.content.includes(config.prefix + "endGame")) ){
				if(message.member.roles.has(config.villageElderID)){
					gameplay.endGame(bot); 
				}	
			}
			else if( (message.content.includes(config.prefix + "closeVoting")) ){
				if(message.member.roles.has(config.villageElderID)){
					gameplay.endVotingPhase(bot); 
				}	
			}


		}


		/**
		* Helper function. Handles the bot response to the #rules command by DMing the questioner the game rules.
		* @param questioner is the person who sent the #rules command to it.
		*/
		this.giveRules = function(requester){
			requester.send(
				"Here are the rules to Mothia! It follows the same premise as most 'root out the hidden evil person' games." + 
				"\nFor this specific variant:" +
				"\nWhen I announce a game, sign-up for it using the command #signup. " + 
				"I'll announce the close of the sign-up period too, so watch out for that."); 
			requester.send("After the sign-up ends, I'll calculate how many mothia, how many angels, and how many seers we'll have " +
				"and randomly choose users for those roles. I'll DM you your role once I'm finished." + 
				"\nI'll begin the game by announcing the number of each roles in the village. You'll have five minutes to talk until nightfall." +
				"\nMothia get their own special channel, but they can only message inside it at certain times.");
			requester.send("Nightfall begins with the mothia choosing a target inside their channel. " + 
				"They can discuss and vote for their target for up to five minutes" +
				"\nThey select a target using #kill" + 
				"\nAfter their turn ends, there is a three minute period where angels and seers can act." + 
				"Angels may select a target to #protect. They do not know other angels' choices. They cannot protect themselves" + 
				"\nAny seers may choose a target to #scry. Scrying reveals the role of the target, which is DMed to the seer" +
				"\nEach seer or angel has up to three minutes to choose. For courtesy's sake, please keep it shorter than that if you can!" +
				"\nAfter all of them have gone, I will announce who has died, their role, and how many mothia remain in the village." +
				"\nNow it's time for you to vote. #vote for the villager you want to die. This round will last until all users have voted or " +
				"a village elder chooses to end the voting period (if it's taking too long).");
			requester.send("\nTo keep the game shorter, if there are any ties in voting, be it for mothia or villagers, " + 
				"I will break the tie by randomly choosing one of the top contenders." +
				"\nAfter voting, I will announce the results, and then the mothia rise again. " + 
				"The cycle will repeat until the mothia outnumber the villagers or all the mothia are dead. ");
			requester.send("If you die, you will be granted access to a special channel, where you can talk to your fellow dead. " + 
				"However, any other channels you had access to become read-only." + 
				"\nIf you need to quit the game for any reason, you can use #quit to have yourself declared dead. " +
				"\nFor more information on the commands, please use #commands. For any further game questions, ask a Village Elder!" 
				);
		}

		/**
		* Helper function. Handles the bot response to the #commands command by DMing the requester the list of commands.
		* If the requester is a Village Elder (admin), the bot will add the list of admin commands. 
		* However, the request must be made in the server for the DM to contain the admin commands. 
		* The bot will inform you of that.
		* @param request is the message requesting the commands list.
		*/
		this.giveCommands = function(request){
			//console.log(request.author.id);
			request.author.send("Here are the commands available at this time: " + 
			"\n#rules is for when you need to know how Mothia works" + 
			"\n#commands is for when you want to know what commands you can give me." +
			"\n#signup when I announce a game if you want to participate in it." + 
			"\nDuring games, you also have these commands available:" + 
			"\n#vote [username] for the villager you think should die during voting periods." +  
			"\n#kill [username] is a mothia-exclusive command, used to vote for your victim. It can only be used inside the mothia channel" +
			"\n#protect [username] is the angel-exclusive command, used to select a person to protect. " + 
			"Because of your protection, if this person is chosen by the mothia, they will survive. But you cannot protect yourself." + 
			"\n#scry [username] is the seer-exclusive command, used to select a person whose role you want to know. The result is DMed to you. " +
			"\n#protect and #scry can only be used by DMing your choice to me." + 
			"\n#quit the game if you can't or don't want to finish the game. If you do so, you'll be declared dead of natural causes. " + 
			"Your role will be announced after your autopsy.");
			if(!(request.channel.type == "dm")){
				if(request.member.roles.has(config.villageElderID)){ 
					request.author.send("As a village elder, you also have additional commands." + 
					"\nYou can use #startGame to begin the sign ups for a game" + 
					"\n#closeGame ends the sign-up period for the game, closing it to further sign-ups" +
					"\n#closeVoting ends a voting period early, if it's taking too long." +  
					"\n#remove [username] removes them from the game. Please only use this for inactive or rule-breaking players." + 
					"\n#endGame lets you terminate a game immediately, just in case. Don't use it lightly!");
				}
			}
			else{
				request.author.send("If you are an elder and need to know about elder-specific commands, please message me inside the server! " +
					"Otherwise, I can't tell that you're an elder.");
			}

		}



		/*
		* Sends a message that the bot take itself offline and sets the timer for the bot to go offline in ten seconds
		* in response to the #exile command
		* @message is the message containing the exile command
		*/
		this.exile = function(message){
			message.channel.send("Okay! Bye-bye! I hope you had fun!");
			setTimeout(turnBotOff, 1000); //Time delay cause the message sends asynchronously and I need the message to send first
		}

		/*
		* Takes the bot offline
		*/
		this.turnBotOff = function(){
			console.log("MothiaBot is now offline");
			process.exit(0);
		}




		this.client.on('disconnect', () => console.error('Connection lost...'));
		this.client.on('reconnecting', () => console.log('Attempting to reconnect...'));
		this.client.on('error', error => console.error(error));
		this.client.on('warn', info => console.error(info));
		//client.on('debug', info => console.log(info));


		
	};

};

var bot = new mothiaBot();
bot.run();