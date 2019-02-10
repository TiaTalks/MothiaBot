/*
* Author: TiaTalks
* File: MothiaBot.js
* Date: January 2019
* A Discord Bot that runs games of a variant of Mafia/Werewolf/Whatever new names it has. 
* This is the really long version where everything is in a single file in case beginners/non-coders/anyone finds it easier this way
*/ 

"use strict";

const Discord = require('discord.js');
const client = new Discord.Client();
const config = require("./config.json");


//channels 
var hangout;
var village;
var sanctuary;
var nest;

//Arrays to store the various players
var players;  //player ids to roles
var playerNames; //player names to ids
var mothiaArray;  //Array to store which players are Mothia
var angelsArray;  //Array to store which players are Angels
var seersArray;   //Array to store which players are Seers

//Integers representing the proportion of each type of player in the game. 
var mothiaProp = 3; // This number is X in "1 out of X players will be Mothia"
var angelProp = 7; 
var seerProp = 7; 

//Booleans tracking whether there's a game going on and if so, what stage is it in.
var signUpMode = false;
var gameMode = false;
var mothiaMode = false; 
var angelSeerMode = false;
var voteMode = false;


var victimVotes;
var hasVotedArray; 
var hasChosenArray; //Seers and Angels
var victimID; 
var deadArray; 


var warningTimer;
var endTimer;


client.on("ready", () => {
  	console.log("I am ready!");
  	//Store the necessary channels
   	hangout = client.channels.get(config.hangoutID);
 	village = client.channels.get(config.villageID);
	sanctuary = client.channels.get(config.sanctuaryID);
	nest = client.channels.get(config.nestID);
});




//Send a welcome message to anyone who joins the server.
client.on("guildMemberAdd", member => {
  hangout.send("Welcome to the server, <@" + member.id + ">! I'm your friendly local bot! " + 
  	"Please @me or DM me the word #commands to find out what I can do for you!");
});



//Sets up the bot to respond to commands, both in the server and in DMs. 
//Commands in the server require the message to begin with @MothiaBot
client.on("message", message => {
	if( message.author.bot){
		return;
	}
	else{ //If it's @ed at the bot or DMed to the bot
		if(message.content.startsWith("<@" + config.botID +">") || message.channel.type == "dm") { 
			if(!gameMode){ //General commands
				generalCommands(message);
			}
			else{
				gameCommands(message);
			}
		}

	}
});


/**
* Helper function. Handles the bot responses to commands outside of games (including the sign-up period before games).
* @param message is the command it's responding to.
*/
function generalCommands(message){
	if (message.content.includes(config.prefix + "rules")){
		giveRules(message.author);
	}
	else if(message.content.includes(config.prefix + "commands")){
		giveCommands(message);
	}
	else if(message.content.includes(config.prefix + "signup")){
		if((signUpMode) && (message.channel.id == config.hangoutID)){
			signUpUser(message);
		}
		else{
			message.channel.send("Sorry, <@" + message.author.id + ">! You can't sign up for a game right now.")
		}
	}

	else if( message.content.includes(config.prefix + "startGame") ){
		if(message.member.roles.has(config.villageElderID)){
			if(!signUpMode && !gameMode){
				beginSignUp(message);
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
			if(signUpMode){
				endSignUp();
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
			exile(message);
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

function gameCommands(message){
	if( ( message.content.includes(config.prefix + "vote") ) && (message.channel.id == config.villageID) ){
		vote(message);
	}
	else if( ( message.content.includes(config.prefix + "kill") ) && (message.channel.id == config.nestID) && (mothiaMode)){
		kill(message);
	}
	else if( (message.content.includes(config.prefix + "protect")) && (message.channel.type == "dm") && (angelSeerMode) ){
		protect(message);
	}

	else if(message.content.includes(config.prefix + "scry") && (message.channel.type == "dm") && (angelSeerMode) ){
		scry(message);	
	}
	/*else if(message.content.includes(config.prefix + "quit")){
		message.channel.send("Sorry to see you go! I hope you had fun!"); 
	}*/
	/*else if(message.content.includes(config.prefix + "remove")){ //Add in this admin level command
	}*/

	else if( (message.content.includes(config.prefix + "endGame")) ){
		if(message.member.roles.has(config.villageElderID)){
			endGame(); 
		}	
	}
	else if( (message.content.includes(config.prefix + "closeVoting")) ){
		if(message.member.roles.has(config.villageElderID)){
			endVotingPhase(message); 
		}	
	}


}


/**
* Helper function. Handles the bot response to the #rules command by DMing the questioner the game rules.
* @param questioner is the person who sent the #rules command to it.
*/
function giveRules(requester){
	requester.send(
		"Here are the rules to Mothia! It follows the same premise as most 'root out the hidden evil person' games." + 
		"\nFor this specific variant:" +
		"\nWhen I announce a game, sign-up for it using the command #signup. " + 
		"I'll announce the close of the sign-up period too, so watch out for that."); 
	requester.send("After the sign-up ends, I'll calculate how many mothia, how many angels, and how many seers we'll have " +
		"and randomly choose users for those roles. I'll DM you your role once I'm finished." + 
		"\nI'll begin the game by announcing the number of each roles in the village. You'll have five minutes to talk until nightfall." +
		"\nMothia, Angels, and Seers get their own special channels, but they can only message inside them at certain times.");
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
function giveCommands(request){
	console.log(request.author.id);
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

/**
* Helper function. Handles the bot response to the #startGame command by announcing the game
* The requester must be a Village Elder (admin), 
*/
function beginSignUp(){
	hangout.send("Everyone, a new game of Mothia is beginning! If you'd like to sign up, @me with the command #signup!");
	signUpMode = true;
	players = [];
	playerNames = [];
}	

/**
* Helper function. Handles the bot response to the #sign-up command by signing them up, granting them the Villager role
* This only happens if a Village Elder previously opened up the sign-up period. 
*/
function signUpUser(message){
	message.channel.send("Roger that! <@" + message.author.id + "> has been signed up for the Mothia game!");
	players[message.author.id] = "Villager"; 
	playerNames[message.author.username] = message.author.id;
	message.member.addRole(config.villagersID);
}


/**
* Helper function. Handles the bot response to the #closeGame command by closing the sign up period. 
* It then calculates the number of Mothia, Angels, and Seers and assigns those roles to players
* Every player is DMed their role and a message is sent out announcing how many of special role there are.
* The requester must be a Village Elder.
* This only happens if a Village Elder previously opened up the sign-up period. 
*/
function endSignUp(){
	signUpMode = false;
	console.log(typeof(players));
	var playerIDArray = Object.keys(players);
	var numPlayers = playerIDArray.length;
	var numMothia = Math.floor(numPlayers/mothiaProp);
	var numAngels = Math.floor(numPlayers/angelProp);
	var numSeers = Math.floor(numPlayers/seerProp); 
	
	mothiaArray = [];
	angelsArray = [];
	seersArray = [];
	deadArray = [];

	chooseRandomPlayers("Mothia", numMothia, playerIDArray, mothiaArray);
	chooseRandomPlayers("Angel", numAngels, playerIDArray, angelsArray);
	chooseRandomPlayers("Seer", numSeers, playerIDArray, seersArray);
	
	console.log(playerIDArray);

	playerIDArray.forEach( function(playerID){
		client.users.get(playerID).send("You have been chosen as a " + players[playerID]);
	});

	hangout.send("The sign-up period has ended! " + numPlayers + " people have signed up for Mothia!" +
		" We'll have " + numMothia + " Mothia, " + 
		numAngels + " Angels, and " + numSeers + " Seers! #the-village will open up shortly."
	);
	//There's no real reason for the pause, I just thought it'd feel abrupt without one. Gives people time to read the role DM, too
	setTimeout(beginGame, config.initTime); 
}


/**
* Helper function that selects random players to become a certain specialized role. 
* If the player has previously been chosen as a specialized role, they retain their role and a new person is picked in their place. 
* @oaram role is the specialized role. It should be a string, either "Mothia", "Angel", or "Seer".
* @param numRoles is how many of that specialized roles the function should pick
* @param playerIDArray is an array containing the Discord IDs of all the users who've signed up to play
* @param roleArray is the array containing all current members of the specialized role. 
*/
function chooseRandomPlayers(role, numRoles, playerIDArray, roleArray){
	var chosenNum = 0;
	while(chosenNum < numRoles){
		var IDindex = Math.floor(Math.random() * playerIDArray.length); 
		var randomPlayer = playerIDArray[IDindex];
		if(players[randomPlayer] === "Villager"){ 
			players[randomPlayer] = role;
			roleArray.push(randomPlayer);
			chosenNum++;
		}
	}
}


/*
* Begins the game by sending a messaging mentioning all players to the village. 
* Specialized roles are granted their powers at this time.
* After a period of time, the game moves into the mothia phase.
*/
function beginGame(){
	gameMode = true;
	village.overwritePermissions( config.villagersID, {'SEND_MESSAGES': true});
	village.send("The village has just received word that the Mothia have invaded their community. "  +
		"Night will fall shortly, and everyone is uneasy and on edge. Everyone gathers together in the village square." + 
		"\n<@&" + config.villagersID + ">, assemble!");
	mothiaArray.forEach(function(player){
		var mothia = village.guild.members.get(player);
		mothia.addRole(config.mothiaID);
	});
	angelsArray.forEach(function(player){
		var angel = village.guild.members.get(player);
		angel.addRole(config.angelsID);
	}); 
	seersArray.forEach(function(player){
		var seer = village.guild.members.get(player);
		seer.addRole(config.seersID);
	});
	//console.log("Finished role assignments");

	setTimeout(runMothiaPhase, config.timeUntilMothia); 
	//console.log("The Mothia phase will begin after the timer goes off!")
}

/*
* Ends the game upon one side's victory or ends it prematurely in response to the #endGame command
* The command must be issued by a Village Elder.
*/
function endGame(){
	signUpMode = false;
	gameMode = false;
	mothiaMode = false; 
	angelSeerMode = false;
	voteMode = false;

	village.send("The game has ended! Thank you all for playing!");
	village.guild.members.forEach( function(villager) {
		villager.removeRole(config.villagersID);
		if(players[villager.id] == "Mothia"){
			villager.removeRole(config.mothiaID);
			village.send("<@" + villager.id + "> was a Mothia!");
		}
		else if(players[villager.id] == "Angel"){
			villager.removeRole(config.angelsID);
			village.send("<@" + villager.id + "> was an Angel!");
		}
		else if(players[villager.id] == "Seer"){
			villager.removeRole(config.angelsID);
			village.send("<@" + villager.id + "> was a Seer!");
		}
		
		console.log("Dead array " + deadArray + villager.id); 
		//This section is working inconsistently right now
		if( deadArray.includes(villager.id) ){
			console.log("Resurrecting a villager");
			villager.removeRole(config.deadID);
		}
	});

	village.overwritePermissions( config.villagersID, {'SEND_MESSAGES': false} );

	players = null;
	playerNames = null;
	mothiaArray = null;
	angelsArray = null;
	seersArray = null;
	deadArray = null;
	victimID = null;
}

/**
* Runs the Mothia game phase. After a set period of time or when all mothia have finished voting, 
* the phase ends and moves onto the angel/seer phase.
*/
function runMothiaPhase(){
	console.log("Mothia phase, begin!");
	village.send("Night has fallen, and the mothia are roaming. Be careful and stay safe");

	nest.overwritePermissions( config.mothiaID, {'SEND_MESSAGES': true})

	victimVotes = [];
	hasVotedArray = [];
	nest.send("Mothia, it is time to choose your victim. Who will it be? @me with #kill [username] to make your choice. " +
		"You have five minutes to decide."); 
	
	mothiaMode = true;
	endTimer = setTimeout(endMothiaPhase, config.mothiaPhaseTime);
}


function endMothiaPhase(){
	console.log("Ending Mothia phase");

	if(!mothiaArray.length == hasVotedArray.length){
		nest.send("Time is up! No further kill votes will be taken!"); 
	}
	mothiaMode = false;
	if(hasVotedArray.length > 0){ 
		victimID = tally(); //The victim will go here
		
		//Reset the vote tracking variables
		victimVotes = []; 
		hasVotedArray = [];
	}
	else{
		//console.log("No one died");
		village.send("By some miracle, there were no Mothia attacks tonight!"); //TODO move this message
	}

	nest.overwritePermissions( config.mothiaID, {'SEND_MESSAGES': false})
	runAngelSeerPhase();
}




/**
* Runs the angel/seer game phase. After a period of time or when all angels and seers have finished voting, 
* the phase ends 
*/ 
function runAngelSeerPhase(){
	//console.log("Angel Seer Phase, begin!");
	village.send("Angels, awake! Each of you may now choose someone to protect. DM me your choice with #protect @[user]");
	village.send("O mighty seers, your time has come. What do you wish to see with your crystal ball? " + 
		"DM me your choice with #scry @[user]");
	angelSeerMode = true;
	hasChosenArray = [];

	endTimer = setTimeout(endAngelSeerPhase, config.angelSeerTime);
	//console.log("Set timeout for angel/seer phase");
}


/*
* Handles everything involved in ending the angel/seer phase and moves the game onto the voting phase
*/
function endAngelSeerPhase(){
	if(!angelsArray.length == hasChosenArray.length){
		//console.log("Angel/seer time is up");
		village.send("Time is up! Angels, seers, go back into hiding.");
	}
	hasChosenArray = null;
	angelSeerMode = false;
	runVotingPhase();
}


/*
* Handles announcing the victim of the Mothia (if any) and beginning the voting phase
*
*/
function runVotingPhase(){
	//console.log("Voting phase, begin!");
	var victimRole = players[victimID];

	//For now, if someone's protected, I won't reveal who the victim was. I can change this if need be
	//But I think this will avoid process of elimination being overly helpful in figuring out who the Mothia 
	if(victimID == null){ //TODO, figure out how to change the statement in case no one voted
		village.send("The next day, you wake up to find that evidence of a Mothia attack. " +
			"Luckily, the intended victim was protected by an angel.");	
	}
	else{
		village.send("The next day, you wake up to find that the mothia successfully claimed a victim, <@" + victimID + ">");
		village.send("An autopsy revealed that the victim was a " + victimRole);
		killPlayerOff();
	}
	village.send("Now it is time to vote, <@&" + config.villagersID + ">. "+
		"Who will you find responsible for the heinous crimes of the Mothia?");
	voteMode = true;

}

/*
* Handles everything involved with ending the voting phase. Announces who the chosen target was and reveals their identity.
* Announces the number of remaining Mothia.
* If all the Mothia are dead or the Mothia outnumber the villagers at the time, ends the game.
*/
function endVotingPhase(){
	//console.log("Voting phase, end");
	voteMode = false;
	if(hasVotedArray.length > 0){ //This shouldn't happen, since an admin closes the voting period, but just in case
		victimID = tally();

		//Reset the vote tracking variables
		victimVotes = []; 
		hasVotedArray = [];

		var victimRole = players[victimID];
		village.send("You have chosen the guilty, and your choice was <@" + victimID + ">!");
		
		if(victimRole === "Mothia"){
			village.send("Congratulations, you have chosen well. This villager was indeed one of the Mothia.");
		}
		else{
			village.send("Unfortunately, you chose wrong. This innocent soul was actually a " + victimRole);
		}
		killPlayerOff();
	}
	else{
		village.send("You chose not to vote for a culprit. I hope you don't regret it.");
	}
	village.send("Today, there are " + mothiaArray.length + " Mothia remaining.");
	//console.log("Done!");
	checkWin();
}


/*
* Handles the response to the #vote command during the voting phase. If every villager has voted, ends phase.
* @param message is the message containing the #vote command
*/
function vote(message){
	//console.log("A villager has voted");
	var numPlayers = Object.keys(players).length;
	countVote(message);
	if(hasVotedArray.length == numPlayers){
		clearTimeout(endTimer);
		endTimer = null; //To make debugging easier
		village.send("All villagers have voted! Their victim will soon face the villagers' brand of justice.");
		endVotingPhase();
	}
}


/*
* Handles the response to the #kill command during the mothia phase. If every mothia has voted, ends phase.
* @param message is the message containing the #kill command
*/
function kill(message){
	console.log("A mothia has voted");
	//Since the message has to come from inside the nest, then I don't have to check that you're a mothia
	countVote(message);
	//If all mothia have voted, then end phase
	if(hasVotedArray.length == mothiaArray.length){
		clearTimeout(endTimer); 
		endTimer = null; //To make debugging easier
		nest.send("All mothia have voted! Their job done, the mothia select an operative to carry out their dirty work " +
			" and slip back into the night."); 
		endMothiaPhase();
	}
}


/*
* Does all the logistics involved in counting a vote for a victim, be it Mothia victim or village victim. 
* Responsible for the actual logging of the vote
* Sends the player a confirmation message (using @, not DM) if their vote is successful
* If a non-player is voted for, sends a message saying that the target is not a player
* If you've already voted, sends a message saying that you've already voted
* @param message is the message containing the #vote/#kill command
*/
function countVote(message){
	console.log("A vote is being counted.");
	var victimName;
	if(mothiaMode){
		victimName = message.content.split("#kill ")[1];
	}
	else if (voteMode){
		victimName = message.content.split("#vote ")[1];
	}
	
	//console.log("The victim's name is " + victimName);
	
	if(playerNames.hasOwnProperty(victimName)){
		var vicID = playerNames[victimName];
		if( !hasVotedArray.includes(message.author.id) ){
			console.log("It cleared the previously voted check!");
			if( victimVotes.hasOwnProperty(vicID) ){
				//console.log("I'm incrementing a vote count!");
				var prevNumVotes = victimVotes[vicID];
				victimVotes[vicID] = prevNumVotes ++;
			}
			else{
				//console.log("I'm creating a new vote count!");
				victimVotes[vicID] = 1;
			}
			hasVotedArray.push(message.author.id);
			message.channel.send("Okay, <@" + message.author.id + ">! I've logged your vote"); 
		}
		else{
			message.channel.send("Sorry, <@" + message.author.id + ">! You've already voted");
		}

	}
	else{
		message.channel.send("Sorry, " + victimName + " is not a player in this game!");
	}
}

/*
* Tallies up the votes at the end of the phase and figures out who has the most votes
* @return the ID of the person with 
*/
function tally(){
	//console.log("Votes are being tallied");
	var highestVoteNum = Math.max(Object.values(victimVotes));
	//console.log("Highest amounts of votes are " + highestVoteNum);
	var victimID = getKeyByValue(victimVotes, highestVoteNum);
	//console.log("The victim id is " + victimID);
	return victimID;
}

/*
* Finds key in object based on value
* From https://stackoverflow.com/questions/9907419/how-to-get-a-key-in-a-javascript-object-by-its-value
* @param object is the object whose keys are to be searched
* @param value is the value to look for
* @return the first key corresponding to value you're looking for
*/
function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}


/*
* Checks if the user is an angel. If so, handles the response to the #protect command, 
* cancelling out the kill if their protectee is the Mothia target. 
* If not, tells the person that it can't fulfill the request
* The format for the command is #protect [username]. Do not use the @ symbol or their Discord tag.
* If the username is not recognized or if they have already used #protect, a message is sent to the player. 
* @param message is the message containing the #protect command
*/
function protect(message){
	//console.log("An angel has made their choice");
	if(angelsArray.includes(message.author.id)){
		if(!hasChosenArray.includes(message.author.id)){  //If the angel hasn't yet chosen
			var protecteeName = message.content.split("#protect ")[1];
			if(playerNames.hasOwnProperty(protecteeName)){
				var protectee = playerNames[protecteeName];
				message.author.send("You have chosen to protect " + protecteeName + "!");
				if(victimID == protectee){
					victimID = null;
				}
				hasChosenArray.push(message.author.id);

				if(hasChosenArray.length == (angelsArray.length + seersArray.length)){
					clearTimeout(endTimer);
					endTimer = null; //To make debugging easier
					village.send("All angels and seers have made their choices. For your sake, let's hope they have chosen wisely.");
					endAngelSeerPhase();
				}
			}
			else{
				message.author.send("Sorry, it looks like " + protecteeName + " isn't a player");
			}
		}
		else{
			message.author.send("Sorry, you've already made your choice.");
		}
	}
	else{
		message.author.send("Sorry, you're a lovely person, but I can't fulfill that request! You're no angel.");
	}
}



/*
* Checks if the user is a seer. If so, handles the response to the #scry command, sending a DM containing the player's role. 
* If not a seer, tells the person that it can't fulfill the request
* The format for the command is #scry [username]. Do not use the @ symbol or their Discord tag.
* If the username is not recognized or if they have already used #scry, a message is sent to the player. 
* @param message is the message containing the #seer command
*/
function scry(message){
	console.log("A seer has made their choice");
	if(seersArray.includes(message.author.id)){ //If they're a seer
		if(!hasChosenArray.includes(message.author.id)){  //If the seer hasn't yet chosen
			var subjectName = message.content.split("#scry ")[1];
			if(playerNames.hasOwnProperty(subjectName)){
				var subject = playerNames[subjectName];
				message.author.send(subjectName + " is a " + players[subject] + "!");
				hasChosenArray.push(message.author.id);
				if(hasChosenArray.length == (angelsArray.length + seersArray.length)){
					clearTimeout(endTimer);
					endTimer = null; //To make debugging easier
					village.send("All angels and seers have made their choices. For your sake, let's hope they have chosen wisely.");
					endAngelSeerPhase();
				}
			}
			else{
				message.author.send("Sorry, " + subjectName + " doesn't appear to be a player in this game!");
			}
		}
		else{
			message.author.send("Sorry, you've already made your choice.");
		}
	}
	else{
		message.author.send("Unfortunately, you lack the power to see the true selves of others.");
	}
}



/*
* Handles all the logistics of killing a victim off, adding them to the dead role and removing any special roles.
*/
function killPlayerOff(){
	deadArray.push(victimID);
	//console.log("The victim is " + victimID + ". About to kill them off");
	var victimRole = players[victimID];
	delete players.victimID; 
	var victim = village.guild.members.get(victimID);
	if(victimRole === "Mothia"){
		mothiaArray.splice(mothiaArray.indexOf(victimID), 1);; 
		victim.removeRole(config.mothiaID);

	}
	else if(victimRole === "Angel"){
		angelsArray.splice(angelsArray.indexOf(victimID), 1); 
		victim.removeRole(config.angelsID);
	}
	else if(victimRole === "Seer"){
		seersArray.splice(seersArray.indexOf(victimID), 1); 
		victim.removeRole(config.seersID);
	}

	victim.addRole(config.deadID);
	victimID = null;

}


/*
* Checks to see if either of the win conditions have been met (Mothia outnumber villagers or all Mothia dead)
* If so, ends the game and sends the appropriate game message
* Otherwise, continue to Mothia phase again.
*/
function checkWin(){
	var numPlayers = Object.keys(players).length;
	if(mothiaArray.length > (numPlayers - mothiaArray.length)){
		village.send("The mothia have won!");
		endGame();
	}
	else if (mothiaArray.length == 0){
		village.send("Congratulations! You've killed all the Mothia!");
		endGame();
	}
	else{
		runMothiaPhase();
	}
}







/*
* Sends a message that the bot take itself offline and sets the timer for the bot to go offline in ten seconds
* in response to the #exile command
* @message is the message containing the exile command
*/
function exile(message){
	message.channel.send("Okay! Bye-bye! I hope you had fun!");
	setTimeout(turnBotOff, 1000); //Cause the message sends asynchronously
}

/*
* Takes the bot offline
*/
function turnBotOff(){
	console.log("MothiaBot is now offline");
	process.exit(0);
}





client.on('disconnect', () => console.error('Connection lost...'));
client.on('reconnecting', () => console.log('Attempting to reconnect...'));
client.on('error', error => console.error(error));
client.on('warn', info => console.error(info));
//client.on('debug', info => console.log(info));

client.login(config.token);
