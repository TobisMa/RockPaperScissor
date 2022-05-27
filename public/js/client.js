const sock = io();

let selected = undefined;

function appendMesssage(msg, color) {
    const msgList = document.querySelector("#message-list");

    const msgElement = document.createElement("li");
    msgElement.innerText = msg;
    if (color != null) {
        msgElement.classList.add(color);
    }

    msgList.appendChild(msgElement, null);
}

sock.on('connect', () => {
    deactivateButtons();
})
sock.on('message', appendMesssage);
sock.on('opponentFound', () => {
    appendMesssage("Gegner gefunden. Wähle Schere, Stein oder Papier", "blue");
    activateButtons();
});

sock.on('gameOptionSelect', (state) => {
    if (state === "ACCEPTED") {
        appendMesssage("You selected " + selected);
        deactivateButtons();
        appendMesssage("Warten auf Wählen des Gegners...", "orange");
    }
    else if (state === "DENIED") {
        activateButtons();  // make sure you can select again
        appendMesssage("Etwas lief schief", "red");
    }
});

optionButtons = document.querySelectorAll(".game-option-button");
optionButtons.forEach((button) => button.addEventListener(
    "click", 
    e => {
        id = e?.target?.id;
        if (id !== undefined) {
            selected = id;
            sock.emit("gameOptionSelect", e.target.id, sock.id);
        }
    }
));

function activateButtons() {
    optionButtons.forEach(btn => btn.disabled = false)
}

function deactivateButtons() {
    optionButtons.forEach(btn => {
        console.log("disabled " + btn);
        btn.disabled = true
    });
}