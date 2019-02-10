/*
* Author: TiaTalks
* File: GameSetup.js
* Date: January 2019
* Game setup functions for MothiaBot
*/


const gameplay = require("./Gameplay.js");
const config = require("./config.json");

//Integers representing the proportion of each type of player in the game. 
var mothiaProp = 3; // This number is X in "1 out of X players will be Mothia"
var angelProp = 1; 
var seerProp = 7; 



/**
* Helper function. Handles the bot response to the #startGame command by announcing the game
* The requester must be a Village Elder (admin), 
* @param bot is the bot that should be responding
*/
var beginSignUp = function(bot){
	bot.hangout.send("Everyone, a new game of Mothia is beginning! If you'd like to sign up, @me with the command #signup!");
	bot.signUpMode = true;
	bot.players = [];
	bot.playerNames = [];
};	


/**
* Helper function. Handles the bot response to the #signup command by signing them up, granting them the Villager role
* This only happens if a Village Elder previously opened up the sign-up period. 
* @param message is the message containing the #signup command
* @param bot is the bot that should be responding
*/
var signUpUser = function(message, bot){
	message.channel.send("Roger that! <@" + message.author.id + "> has been signed up for the Mothia game!");
	bot.players[message.author.id] = "Villager"; 
	bot.playerNames[message.member.displayName] = message.author.id;
	message.member.addRole(config.villagersID);
}


/**
* Helper function. Handles the bot response to the #closeGame command by closing the sign up period. 
* It then calculates the number of Mothia, Angels, and Seers and assigns those roles to players
* Every player is DMed their role and a message is sent out announcing how many of special role there are.
* The requester must be a Village Elder.
* This only happens if a Village Elder previously opened up the sign-up period. 
* @param bot is the bot that should be responding
*/
var endSignUp = function(bot){
	bot.signUpMode = false;

	var playerIDArray = Object.keys(bot.players);
	var numPlayers = playerIDArray.length;
	var numMothia = Math.floor(numPlayers/mothiaProp);
	var numAngels = Math.floor(numPlayers/angelProp);
	var numSeers = Math.floor(numPlayers/seerProp); 
	
	bot.mothiaArray = [];
	bot.angelsArray = [];
	bot.seersArray = [];

	chooseRandomPlayers("Mothia", numMothia, playerIDArray, bot.mothiaArray, bot);
	chooseRandomPlayers("Angel", numAngels, playerIDArray, bot.angelsArray, bot);
	chooseRandomPlayers("Seer", numSeers, playerIDArray, bot.seersArray, bot);
	

	playerIDArray.forEach( function(playerID){
		bot.client.users.get(playerID).send("You have been chosen as a " + bot.players[playerID]);
	});

	bot.hangout.send("The sign-up period has ended! " + numPlayers + " people have signed up for Mothia!" +
		" We'll have " + numMothia + " Mothia, " + 
		numAngels + " Angels, and " + numSeers + " Seers! #the-village will open up shortly."
	);
	//There's no real reason for the pause, I just thought it'd feel abrupt without one. Gives people time to read the role DM, too
	setTimeout(gameplay.beginGame, config.initTime, bot); 
}


/**
* Helper function that selects random players to become a certain specialized role for the Mothia game. 
* If the player has previously been chosen as a specialized role, they retain their role and a new person is picked in their place. 
* @oaram role is the specialized role. It should be a string, either "Mothia", "Angel", or "Seer".
* @param numRoles is how many of that specialized roles the function should pick
* @param playerIDArray is an array containing the Discord IDs of all the users who've signed up to play
* @param roleArray is the array containing all current members of the specialized role. 
* @param bot is the bot which is running the game 
*/
var chooseRandomPlayers = function(role, numRoles, playerIDArray, roleArray, bot){
	var chosenNum = 0;
	while  (chosenNum < numRoles){
		var IDindex = Math.floor(Math.random() * playerIDArray.length); 
		var randomPlayer = playerIDArray[IDindex];
		if(bot.players[randomPlayer] === "Villager"){ 
			bot.players[randomPlayer] = role;
			roleArray.push(randomPlayer);
			chosenNum++;
		}
	}
}


module.exports = {
	beginSignUp: beginSignUp,
	signUpUser: signUpUser,
	endSignUp: endSignUp,
	chooseRandomPlayers: chooseRandomPlayers
}