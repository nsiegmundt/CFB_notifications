const fetch = require('node-fetch');
const config = require('./config.json');

const accountSid = '';
const authToken = '';
const client = require('twilio')(accountSid, authToken);
const notifiedGames = [];
const notifiedGamesTrippleOT = [];
const phoneNumbers = ["+15137022441", "+15133003349"];

fetch(config.cfb_endpoint)
.then(data => data.json())
.then(response => {
    let gameList = response.events;
    let gamesMessage = `!!!OVERTIME ALERT!!!`;
    let gamesFound = false;

    gameList.forEach(game => {
        if(game.status.period > 4 && game.status.type.description != "Final") {
            let team1 = game.competitions[0].competitors[0];
            let team2 = game.competitions[0].competitors[1];
            let matchup = constructOTGameInfo(game, team1, team2);

            gamesMessage += `\n\nWho: ${matchup.matchup}\nScore: ${matchup.score}\nTime: ${matchup.timeLeft}\nWatch: ${matchup.channel}`;

            if(!notifiedGames.includes(matchup.matchup)){
                notifiedGames.push(matchup.matchup);
                gamesFound = true;
            }
            // If the game was already notified, but the game is in the 3rd overtime or more and hasn't been notified a second time
            else if (notifiedGames.includes(matchup.matchup) && game.status.period > 6 && !notifiedGamesTrippleOT.includes(matchup.matchup)){
                notifiedGamesTrippleOT.push(matchup.matchup);
                gamesFound = true;
            }
        }
    });

    if(gamesFound){
        Promise.all(
            phoneNumbers.map(number => {
                client.messages.create({
                    body: gamesMessage,
                    from: '+12242191128',
                    to: number
                })
            })
        )
        .then(messages => {
            console.log('Messages sent!');
        })
        .catch(err => console.error(err));
    }
});

function constructOTGameInfo(game, team1, team2){
    let team1Rank = team1.curatedRank.current == 99 ? "" : team1.curatedRank.current + " ";
    let team2Rank = team2.curatedRank.current == 99 ? "" : team2.curatedRank.current + " ";

    let team1Title = `${team1Rank}${team1.team.abbreviation}`;
    let team2Title = `${team2Rank}${team2.team.abbreviation}`;
    
    let gameTitle = `${team1Title} - ${team2Title}`;

    let score = `${team1.team.abbreviation} ${team1.score} - ${team2.team.abbreviation} ${team2.score}`;

    let timeLeft = `${game.status.type.shortDetail}`;

    let gameObject = {
        matchup: gameTitle,
        score: score,
        timeLeft: timeLeft,
        channel: game.competitions[0].broadcasts[0].names[0]
    };

    return gameObject;
}