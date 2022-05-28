const http = require('http');
const express = require('express');
const socketio = require('socket.io');

app = express();
app.use(express.static("public"));

server = http.createServer(app);
server.listen(8080, "0.0.0.0", (err) => {
    if (err !== undefined) {
        console.error(err);
    }
    address = server.address();
    if (address === null || address == undefined) {
        console.error("Server address unknown");
    }
    else {
        const host = address?.address === '0.0.0.0' ? require('os')?.hostname()?.toLowerCase() : address.address;
        const port = address?.port;
        const protocol = address?.family;
        console.log(`Server running on http://${host}:${port}/ using ${protocol}`);
    }
});

io = socketio(server);
const clients = {};
const waitingForMatch = [];
const matchUps = {};
const gameCases = {
    paper: "rock",
    rock: "scissor",
    scissor: "paper"
};

io.on('connect', (socket) => {
    // general things   
    clients[socket.id] = socket;
    waitingForMatch.push(socket.id);
    socket.emit('message', "Waiting for opponent...", "blue");
    
    socket.on("disconnect", () => {
        console.log(socket.id + " disconnected");
    })

    socket.on('gameOptionSelect', (selection) => {
        if (matchUps[socket.id] !== undefined) {
            matchUps[socket.id][1] = selection;
            socket.emit('gameOptionSelect', "ACCEPTED");
            playGame(socket.id);
        }
        else {
            socket.emit('gameOptionSelect', "DENIED");
        }
    })

    // clear clients
    const toRemove = [];
    for (const [k, v] of Object.entries(clients)) {
        if (!v.connected) {
            let i = waitingForMatch.indexOf(k);
            if (i !== -1) {
                waitingForMatch.splice(i, 1);
            }
            if (matchUps[k] !== undefined) {
                delete matchUps[matchUps[k]];
                delete matchUps[k];
            }
        }
    }
    toRemove.forEach(k => delete clients[k]);

    // matches
    if (waitingForMatch.length >= 2) {
        const id1 = waitingForMatch[0];
        const id2 = waitingForMatch[1];

        matchUps[id1] = [id2, undefined];
        matchUps[id2] = [id1, undefined];

        clients[id1].emit('opponentFound', `${id2}`);
        clients[id2].emit('opponentFound', `${id1}`);

        console.log(id1 + " x " + id2);

        waitingForMatch.splice(0, 2);
    }
})


function playGame(socketId) {
    if (matchUps[socketId] === undefined) {
        return;
    }
    oppId = matchUps[socketId][0];
    if (matchUps[oppId] === undefined) {
        return;
    }
    const client1 = clients[socketId];
    const client2 = clients[oppId];

    if (client1 === undefined && client2 === undefined) {
        return;
    }
    else if (client1 === undefined && client2 !== undefined) {
        client2.emit("message", "Opponent lost. Please reload page", "red");
    }
    else if (client2 === undefined && client1 !== undefined) {
        client1.emit("message", "Opponent lost. Please reload page", "red");
    }

    res = getWinner(socketId, oppId);
    if (res === undefined) {
        return;
    }
    if (res === "draw") {
        clients[socketId]?.emit('message', "Draw", "green");
        return;
    }
    winner = res[0];
    loser = res[1];
    clients[winner]?.emit("message", "You won", "green");
    clients[loser]?.emit("message", "You lose", "green");

    resetGame(socketId, oppId);
}

function getWinner(socketId, oppId) {
    const selected1 = matchUps[socketId][1];
    const selected2 = matchUps[oppId][1];
    if (selected1 !== undefined && selected2 !== undefined) {
        clients[socketId]?.emit("message", `${selected1} against ${selected2}`);
        clients[oppId]?.emit("message", `${selected2} against ${selected1}`);
        if (selected1 == selected2) {
            return "draw";
        }
        else if (gameCases[selected1] == selected2) {
            return [socketId, oppId];
        }
        else if (gameCases[selected2] == selected1) {
            return [oppId, socketId];
        }
    }
    return undefined; // smth went wrong
}


function resetGame(id1, id2) {
    clients[id1]?.emit("resetGame");
    clients[id1]?.emit("opponentFound");
    clients[id2]?.emit("resetGame");
    clients[id2]?.emit("opponentFound");
}