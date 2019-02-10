/*
* Author: TiaTalks
* File: Gameplay.js
* Date: January 2019
* Gameplay functions for MothiaBot
*/

const setup = require("./GameSetup.js");
const config = require("./config.json");


var victimVotes;
var hasVotedArray; //Used for both Mothia and Village, reset in-between 
var hasChosenArray; //Seers and Angels
var victimID; 
var deadArray; 


var warningTimer;
var endTimer;

var protected;


/*
* Begins the game by sending a messaging mentioning all players to the village. 
* Specialized roles are granted their powers at this time.
* After a period of time, the game moves into the mothia phase.
* @param bot is the bot that is running the game
*/ 
var beginGame = function(bot){
	bot.gameMode = true;
	bot.village.overwritePermissions( config.villagersID, {'SEND_MESSAGES': true});
	bot.village.send("The village has just received word that the Mothia have invaded their community. "  +
		"Night will fall shortly, and everyone is uneasy and on edge. Everyone gathers together in the village square." + 
		"\n<@&" + config.villagersID + ">, assemble!");
	bot.mothiaArray.forEach(function(player){
		var mothia = bot.village.guild.members.get(player);
		mothia.addRole(config.mothiaID);
	});
	bot.angelsArray.forEach(function(player){
		var angel = bot.village.guild.members.get(player);
		angel.addRole(config.angelsID);
	}); 
	bot.seersArray.forEach(function(player){
		var seer = bot.village.guild.members.get(player);
		seer.addRole(config.seersID);
	});

	deadArray = [];
	//console.log("Finished giving out the roles to the chosen");

	setTimeout(runMothiaPhase, config.timeUntilMothia, bot); 
	//console.log("The Mothia phase will begin after the timer goes off!")
}

/*
* Ends the game upon one side's victory or ends it prematurely in response to the #endGame command
* The command must be issued by a Village Elder.
* @param bot is the bot that is running the game
*/
var endGame = function(bot){
	bot.signUpMode = false;
	bot.gameMode = false;
	bot.mothiaMode = false; 
	bot.angelSeerMode = false;
	bot.voteMode = false;

	clearTimeout(endTimer);

	bot.village.send("The game has ended! Thank you all for playing!");
	bot.village.guild.members.forEach(function(villager){
		villager.removeRole(config.villagersID);
		if(bot.players[villager.id] == "Mothia"){
			villager.removeRole(config.mothiaID);
			bot.village.send(villager.displayName + " was a Mothia!");
		}
		else if(bot.players[villager.id] == "Angel"){
			villager.removeRole(config.angelsID);
			bot.village.send(villager.displayName  + " was an Angel!");
		}
		else if(bot.players[villager.id] == "Seer"){
			villager.removeRole(config.angelsID);
			bot.village.send(villager.displayName + " was a Seer!");
		}
		
		console.log("Dead array " + deadArray + villager.id); 
		//This section is working inconsistently right now
		if(deadArray.includes(villager.id)){
			console.log("Resurrecting a villager");
			villager.removeRole(config.deadID);
		}	
	});

	bot.village.overwritePermissions( config.villagersID, {'SEND_MESSAGES': false} );

	bot.players = null;
	bot.playerNames = null;
	bot.mothiaArray = null;
	bot.angelsArray = null;
	bot.seersArray = null;
	deadArray = null;
	victimID = null;
}

/**
* Runs the Mothia game phase. After a set period of time or when all mothia have finished voting, 
* the phase ends and moves onto the angel/seer phase.
* @param bot is the bot that is running the game
*/
var runMothiaPhase = function(bot){
	console.log("Mothia phase, begin!");
	bot.village.send("Night has fallen, and the mothia are roaming. Be careful and stay safe");

	bot.nest.overwritePermissions( config.mothiaID, {'SEND_MESSAGES': true})

	victimVotes = [];
	hasVotedArray = [];

	bot.nest.send("Mothia, it is time to choose your victim. Who will it be? @me with #kill [username] to make your choice. " +
		"You have five minutes to decide."); 
	
	bot.mothiaMode = true;
	endTimer = setTimeout(endMothiaPhase, config.mothiaPhaseTime, bot);
}



/**
* Ends the Mothia phase, finds the victim (if any), and then resets the voting counts. 
* Closes the nest channel and moves onto the angel-seer phase
* @param bot is the bot that is running the game
*/
var endMothiaPhase = function(bot){
	console.log("Ending Mothia phase");

	if(!bot.mothiaArray.length == hasVotedArray.length){
		bot.nest.send("Time is up! No further kill votes will be taken!"); 
	}
	bot.mothiaMode = false;
	if(hasVotedArray.length > 0){ 
		victimID = tally(); 
		
		//Reset the vote tracking variables
		victimVotes = []; 
		hasVotedArray = [];
	}
	/*else{
		//console.log("No one died");
		bot.village.send("By some miracle, there were no Mothia attacks tonight!"); //TODO move this message
	}*/

	bot.nest.overwritePermissions( config.mothiaID, {'SEND_MESSAGES': false});
	if( (bot.angelsArray.length == 0) && (bot.seersArray.length == 0)){
		runVotingPhase(bot);
	} 
	else{
		runAngelSeerPhase(bot);
	}
}




/**
* Runs the angel/seer game phase. After a period of time or when all angels and seers have finished voting, 
* the phase ends 
* @param bot is the bot that is running the game
*/ 
var runAngelSeerPhase = function(bot){
	//console.log("Angel Seer Phase, begin!");
	bot.village.send("Angels, awake! Each of you may now choose someone to protect. DM me your choice with #protect @[user]");
	bot.village.send("O mighty seers, your time has come. What do you wish to see with your crystal ball? " + 
		"DM me your choice with #scry @[user]");
	bot.angelSeerMode = true;
	hasChosenArray = [];
	protected = false;

	endTimer = setTimeout(endAngelSeerPhase, config.angelSeerTime, bot);
	//console.log("Set timeout for angel/seer phase");
}


/*
* Handles everything involved in ending the angel/seer phase and moves the game onto the voting phase
* @param bot is the bot that is running the game
*/
var endAngelSeerPhase = function(bot){
	if(!bot.angelsArray.length == hasChosenArray.length){
		//console.log("Angel/seer time is up");
		bot.village.send("Time is up! Angels, seers, go back into hiding.");
	}
	hasChosenArray = null;
	bot.angelSeerMode = false;
	runVotingPhase(bot);
}


/*
* Handles announcing the victim of the Mothia (if any) and beginning the voting phase
* @param bot is the bot that is running the game
*/
var runVotingPhase = function(bot){
	//console.log("Voting phase, begin!");
	var victimRole = bot.players[victimID];

	//For now, if someone's protected, I won't reveal who the victim was. I can change this if need be
	//But I think this will avoid process of elimination being overly helpful in figuring out who the Mothia 
	if( victimID == null ){ //TODO, figure out a clean way to change the statement in case no one voted
		
		if(protected){
			bot.village.send("The next day, you wake up to find that evidence of a Mothia attack. " +
				"Luckily, the intended victim was protected by an angel.");	
			protected = false;
		}
		else{
			bot.village.send("By some miracle, there were no Mothia attacks tonight!"); 
		}
	}
	else{
		bot.village.send("The next day, you wake up to find that the mothia successfully claimed a victim, <@" + victimID + ">");
		bot.village.send("An autopsy revealed that the victim was a " + victimRole);
		killPlayerOff(bot);
	}
	bot.village.send("Now it is time to vote, <@&" + config.villagersID + ">. "+
		"Who will you find responsible for the heinous crimes of the Mothia? Tell me with @me #vote [username]!");
	bot.voteMode = true;

}

/*
* Handles everything involved with ending the voting phase. Announces who the chosen target was and reveals their identity.
* Announces the number of remaining Mothia.
* If all the Mothia are dead or the Mothia outnumber the villagers at the time, ends the game.
* @param bot is the bot that is running the game
*/
var endVotingPhase = function(bot){
	//console.log("Voting phase, end");
	bot.voteMode = false;
	if(hasVotedArray.length > 0){ //This shouldn't happen, since an admin closes the voting period, but just in case
		victimID = tally();

		//Reset the vote tracking variables
		victimVotes = []; 
		hasVotedArray = [];

		var victimRole = bot.players[victimID];
		bot.village.send("You have chosen the guilty, and your choice was <@" + victimID + ">!");
		
		if(victimRole === "Mothia"){
			bot.village.send("Congratulations, you have chosen well. This villager was indeed one of the Mothia.");
		}
		else{
			bot.village.send("Unfortunately, you chose wrong. This innocent soul was actually a " + victimRole);
		}
		killPlayerOff(bot);
	}
	else{
		bot.village.send("You chose not to vote for a culprit. I hope you don't regret it.");
	}
	bot.village.send("Today, there are " + bot.mothiaArray.length + " Mothia remaining.");
	//console.log("Done!");
	checkWin(bot);
}


/*
* Handles the response to the #vote command during the voting phase. If every villager has voted, ends phase.
* @param message is the message containing the #vote command
* @param bot is the bot that is running the game
*/
var vote = function(message, bot){
	//console.log("A villager has voted");
	var numPlayers = Object.keys(bot.players).length;
	countVote(message, bot);
	if(hasVotedArray.length == numPlayers){
		clearTimeout(endTimer);
		endTimer = null; //To make debugging easier
		bot.village.send("All villagers have voted! Their victim will soon face the villagers' brand of justice.");
		endVotingPhase(bot);
	}
}


/*
* Handles the response to the #kill command during the mothia phase. If every mothia has voted, ends phase.
* @param message is the message containing the #kill command
* @param bot is the bot that is running the game
*/
var kill = function(message, bot){
	console.log("A mothia has voted");
	//Since the message has to come from inside the nest, then I don't have to check that you're a mothia
	countVote(message, bot);
	//If all mothia have voted, then end phase
	if(hasVotedArray.length == bot.mothiaArray.length){
		clearTimeout(endTimer); 
		endTimer = null; //To make debugging easier
		
		bot.nest.send("All mothia have voted! Their job done, the mothia select an operative to carry out their dirty work " +
			" and slip back into the night."); 
		endMothiaPhase(bot);
	}
}


/*
* Does all the logistics involved in counting a vote for a victim, be it Mothia victim or village victim. 
* Responsible for the actual logging of the vote
* Sends the player a confirmation message (using @, not DM) if their vote is successful
* If a non-player is voted for, sends a message saying that the target is not a player
* If you've already voted, sends a message saying that you've already voted
* @param message is the message containing the #vote/#kill command
* @param bot is the bot that is running the game
*/
var countVote = function(message, bot){
	console.log("A vote is being counted.");
	var victimName;
	if(bot.mothiaMode){
		victimName = message.content.split("#kill ")[1];
	}
	else if (bot.voteMode){
		victimName = message.content.split("#vote ")[1];
	}
	
	
	if(bot.playerNames.hasOwnProperty(victimName)){
		var vicID = bot.playerNames[victimName];
		if( !hasVotedArray.includes(message.author.id) ){
			//console.log("It cleared the previously voted check!");
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
* @return the ID of the person with the most votes
*/
var tally = function(){
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
var getKeyByValue = function(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}


/*
* Checks if the user is an angel. If so, handles the response to the #protect command, 
* cancelling out the kill if their protectee is the Mothia target. 
* If not, tells the person that it can't fulfill the request
* The format for the command is #protect [username]. Do not use the @ symbol or their Discord tag.
* If the username is not recognized or if they have already used #protect, a message is sent to the player. 
* @param message is the message containing the #protect command
* @param bot is the bot that is running the game
*/
var protect = function(message, bot){
	//console.log("An angel has made their choice");
	if(bot.angelsArray.includes(message.author.id)){
		if(!hasChosenArray.includes(message.author.id)){  //If the angel hasn't yet chosen
			var protecteeName = message.content.split("#protect ")[1];
			if(bot.playerNames.hasOwnProperty(protecteeName)){
				var protectee = bot.playerNames[protecteeName];
				if(protectee == message.author.id){
					message.author.send("You can't protect yourself!");
					return;
				}
				message.author.send("You have chosen to protect " + protecteeName + "!");
				if(victimID == protectee){
					victimID = null;
					protected = true;
				} 
				checkAngelSeerPhaseEnd(message, bot);
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
* @param bot is the bot that is running the game
*/
var scry = function(message, bot){
	console.log("A seer has made their choice");
	if(bot.seersArray.includes(message.author.id)){ //If they're a seer
		if(!hasChosenArray.includes(message.author.id)){  //If the seer hasn't yet chosen
			var subjectName = message.content.split("#scry ")[1];
			if(bot.playerNames.hasOwnProperty(subjectName)){
				var subject = bot.playerNames[subjectName];
				message.author.send(subjectName + " is a " + bot.players[subject] + "!");
				checkAngelSeerPhaseEnd(message, bot);
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

/**
*Wraps up #protect and #scry and checks to see if the phase is over. If it is, ends phase.
*@param message is the message containing the command it's finishing
*@param bot is the bot that's running the game
*/
var checkAngelSeerPhaseEnd = function(message, bot){
	hasChosenArray.push(message.author.id);
	if(hasChosenArray.length == (bot.angelsArray.length + bot.seersArray.length)){
		clearTimeout(endTimer);
		endTimer = null; //To make debugging easier
		bot.village.send("All angels and seers have made their choices. For your sake, let's hope they have chosen wisely.");
		endAngelSeerPhase(bot);
	}
}



/*
* Handles all the logistics of killing a victim off, adding them to the dead role and removing any special roles.
* @param bot is the bot that is running the game
*/
var killPlayerOff = function(bot){
	deadArray.push(victimID);
	removePlayer(victimID, bot);
	var victim = bot.village.guild.members.get(victimID);
	victim.addRole(config.deadID);
	victimID = null;

}

/*
* Helper function that removes a player from the game, including them from the active player list and special roles
* Can be used when player dies or when player is removed by a mod/village elder
* @param playerID is the Discord ID of the player to be removed
* @param bot is the bot running the game
* @return the display name of the player removed
*/
var removePlayer = function(playerID, bot){
	var removedName = bot.playerNames[playerID];
	//bot.playerNames.forEach(function(player){console.log(player);});
	console.log("Removing " + playerID + " " + removedName);
	delete bot.players.playerID; 
	var playerRole = bot.players[playerID];
	var player = bot.village.guild.members.get(playerID);

	player.removeRole(config.villagersID);
	if(playerRole === "Mothia"){
		bot.mothiaArray.splice(bot.mothiaArray.indexOf(playerID), 1);; 
		player.removeRole(config.mothiaID);
		console.log("Removing a mothia!");
	}
	else if(playerRole === "Angel"){
		bot.angelsArray.splice(bot.angelsArray.indexOf(playerID), 1); 
		player.removeRole(config.angelsID);
		console.log("Removing an Angel!");
	}
	else if(playerRole === "Seer"){
		bot.seersArray.splice(bot.seersArray.indexOf(playerID), 1); 
		player.removeRole(config.seersID);
		console.log("Removing a Seer!");
	}
	
	console.log("Finished removing someone!");
	return player.displayName;
}

/*
* Responds to the #quit command by removing the author of the message from an active game.
* Nothing happens if no game is active
* @param message is the message containing the #quit command 
* @param bot is the bot running the game
*/
var quit = function(message, bot){
	var quitterRole = bot.players[message.author.id];
	bot.village.send("Oh, no! While taking a walk, an unfortunate villager stumbles upon quite a scene! A body collapsed on the path!");
	bot.village.send("The unfortunate soul is declared dead of natural causes. " +
		"After the autopsy, it turns out that " + message.member.displayName + " was a " + quitterRole);
	removePlayer(message.author.id, bot);
}


/*
* Checks to see if either of the win conditions have been met (Mothia outnumber villagers or all Mothia dead)
* If so, ends the game and sends the appropriate game message
* Otherwise, continue to Mothia phase again.
* @param bot is the bot that is running the game
*/
var checkWin = function(bot){
	var numPlayers = Object.keys(bot.players).length;
	if(bot.mothiaArray.length > (numPlayers - bot.mothiaArray.length) ){
		bot.village.send("The mothia have won!");
		endGame(bot);
	}
	else if (bot.mothiaArray.length == 0){
		bot.village.send("Congratulations! You've killed all the Mothia!");
		endGame(bot);
	}
	else{
		runMothiaPhase(bot);
	}
}






module.exports = {
	beginGame: beginGame,
	endGame: endGame,
	kill: kill,
	protect: protect,
	scry: scry,
	vote: vote,
	removePlayer: removePlayer,
	quit: quit,
	endVotingPhase: endVotingPhase
}
