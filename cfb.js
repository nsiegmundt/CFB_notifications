const fetch = require('node-fetch');
const config = require('./config.json');
const http = require('http');
const express = require('express');
const moment = require('moment');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
var bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({extended: false}));

app.post('/', (req, res) => {
    fetch(config.cfb_endpoint)
    .then(data => data.json())
    .then(response => {
        let textMessage = req.body.Body;
        let messageText = "";

        if(textMessage.charAt(0) == "#"){
            let teamName = textMessage.split("#")[1];
            messageText = getTeamGameInfo(response.events, teamName);
        }
        else{
            messageText = getRankedMatchups(response.events);
        }

        let rankedMessage = "";

        if (messageText){
            messageText.forEach(matchup => {
                rankedMessage += `${matchup.matchup}\n\nWhere: ${matchup.location}\nWhen: ${matchup.time}\nWatch: ${matchup.channel}\nOdds: ${matchup.spread}\n\n`;
            });
        }
        else {
            rankedMessage = "The team you specified does not exist or is not playing this week."
        }

        const twiml = new MessagingResponse();

        twiml.message(rankedMessage);
      
        res.writeHead(200, {'Content-Type': 'text/xml'});
        res.end(twiml.toString());
    });
});

http.createServer(app).listen(1337, () => {
  console.log('Express server listening on port 1337');
});

/*
fetch(config.cfb_endpoint)
.then(data => data.json())
.then(response => {
    //let rankedMatchups = getRankedMatchups(response.events);
    let teamGameInfo = getTeamGameInfo(response.events, "ohio State");

    console.log(teamGameInfo)
});
*/
function getRankedMatchups(events){
    let rankedMatchups = [];

    events.forEach(game => {
        let team1 = game.competitions[0].competitors[0];
        let team2 = game.competitions[0].competitors[1];

        if(team1.curatedRank.current != 99 && team2.curatedRank.current != 99){
            rankedMatchups.push(constructGameInfo(game, team1, team2));
        }
    });

    return rankedMatchups;
}

function getTeamGameInfo(events, teamName){
    let gameFound;
    let currentShortestLength = 1000;

    for(var i=0; i < events.length; i++){
        let game = events[i];
        let team1 = game.competitions[0].competitors[0];
        let team2 = game.competitions[0].competitors[1];

        if(team1.team.displayName.toLowerCase().includes(teamName.toLowerCase()) && team1.team.displayName.length < currentShortestLength){
            gameFound = [constructGameInfo(game, team1, team2)];
            currentShortestLength = team1.team.displayName.length;
        }
        else if(team2.team.displayName.toLowerCase().includes(teamName.toLowerCase()) && team2.team.displayName.length < currentShortestLength){
            gameFound = [constructGameInfo(game, team1, team2)];
            currentShortestLength = team2.team.displayName.length; 
        }
    }

    return gameFound;
}

function constructGameInfo(game, team1, team2){
    let team1Rank = team1.curatedRank.current == 99 ? "" : team1.curatedRank.current + " ";
    let team2Rank = team2.curatedRank.current == 99 ? "" : team2.curatedRank.current + " ";

    let team1Title = `${team1Rank}${team1.team.abbreviation}`;
    let team2Title = `${team2Rank}${team2.team.abbreviation}`;
    
    let gameTitle = `${team1Title} - ${team2Title}`;
    let gameTime = (new Date(game.competitions[0].date)).toLocaleString().replace(/(.*)\D\d+/, '$1');

    let gameObject = {
        matchup: gameTitle,
        time: gameTime,
        location: game.competitions[0].venue.fullName,
        channel: game.competitions[0].broadcasts[0].names[0],
        spread: game.competitions[0].odds[0].details
    };

    return gameObject;
}