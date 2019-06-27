var app = require('express')();
var expressWs = require('express-ws')(app);

var teams = {};
var scores = {};
var viewers = new Set([]);

function view() {
    viewers.forEach((ws) => {
        ws.send(JSON.stringify(scores));
    });
}

function broadcast(team) {
    var total = 0;
    for (var user in scores[team]) {
        total += scores[team][user];
    }
    teams[team].forEach((ws) => {
        ws.send(total);
    });
    view();
}

app.ws('/:team/:user', (ws, req) => {
    var team = req.params.team;
    var user = req.params.user;
    if (team in teams) {
        teams[team].add(ws);
    } else {
        console.log('team ' + team + ' joined');
        teams[team] = new Set([ws]);
        scores[team] = {};
    }
    console.log('user ' + user + ' joined team ' + team);
    scores[team][user] = 0;
    broadcast(team);
    ws.on('message', (msg) => {
        if (msg === 'ping') return;
        scores[team][user] = Number(msg);
        broadcast(team);
    });
    ws.on('close', () => {
        console.log('user ' + user + ' from team ' + team + ' left');
        teams[team].delete(ws);
        delete scores[team][user];
        if (teams[team].size === 0) {
            console.log('team ' + team + ' left');
            delete teams[team];
            delete scores[team];
            view();
        } else {
            broadcast(team);
        }
    });
});

app.ws('/', (ws, req) => {
    console.log('viewer joined');
    viewers.add(ws);
    ws.on('close', () => {
        console.log('viewer left');
        viewers.delete(ws);
    });
    view();
});

app.listen(process.env.PORT || 6558);
