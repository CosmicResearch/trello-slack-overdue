const https = require('https');
var timeago = require("timeago.js");
const trello = require('./trello.json');
const slack = require('./slack.json');

var members = [];

function slack_send_overdue(user, task) {
    var msg = user.fullName + " has not completed the task <" + task.url + "|" + task.name + "> (due " + timeago().format(task.due) + "). SHAME ON YOU.";

    var payload = {
        channel: slack.channel,
        username: "Trello Overdue",
        text: msg,
        icon_emoji: ":angry:"
    };

    console.log(payload);

    const options = {
        hostname: 'hooks.slack.com',
        port: 443,
        path: slack.hook,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
    };

    var post_req = https.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('Response: ' + chunk);
        });
    }).on("error", (err) => {
        console.log("Error: " + err.message);
    });
  
    post_req.write(JSON.stringify(payload));
    post_req.end();
}

function send_overdue(card) {

    card.idMembers.forEach(element => {

        if (members[element]) {
            slack_send_overdue(members[element], card);
        }
        else {
            var member;
            let members_url = "https://api.trello.com/1/members/" + element + "?key=" + trello.key + "&token=" + trello.token;
            https.get(members_url, (resp) => {

                if (resp.statusCode != 200) {
                    console.log(resp.statusCode)
                    return;
                }

                let data = '';
            
                resp.on('data', (chunk) => {
                    data += chunk;
                });
            
                resp.on('end', () => {
                    member = JSON.parse(data);
                    members[element] = member;
                    //console.log(member);
                    slack_send_overdue(member, card);
                });
            
            }).on("error", (err) => {
                console.log("Error: " + err.message);
            });
        }
    });
}

function check_overdue(board) {

    let cards_url = "https://api.trello.com/1/boards/" + board.id + "/cards?key=" + trello.key + "&token=" + trello.token;
    var cards;

    https.get(cards_url, (resp) => {

        if (resp.statusCode != 200) {
            console.log(resp.statusCode)
            return;
        }

        let data = '';
    
        resp.on('data', (chunk) => {
            data += chunk;
        });
    
        resp.on('end', () => {
            cards = JSON.parse(data);
            cards.forEach(element => {
                if (element.due != null && !element.dueComplete && Date.parse(element.due) < Date.now()) {
                    send_overdue(element);
                }
            });
        });
    
    }).on("error", (err) => {
        console.log("Error: " + err.message);
    });
}

let boards_url = "https://api.trello.com/1/organizations/" + trello.org + "/boards?key=" + trello.key + "&token=" + trello.token;
var trello_boards;

https.get(boards_url, (resp) => {

    if (resp.statusCode != 200) {
        console.log(resp.statusCode)
        return;
    }

    let data = '';

    resp.on('data', (chunk) => {
        data += chunk;
    });

    resp.on('end', () => {
        trello_boards = JSON.parse(data);
        trello_boards.forEach(element => {
            if (!element.closed)
                check_overdue(element);
        });
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
