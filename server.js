const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require('cors');


const httpServer = createServer();



const io = new Server(httpServer, {
  cors: "*",
  methods: ["GET", "POST"]
});

const allUsers = {};
const rooms = {};

io.on("connection", (socket) => {
  allUsers[socket.id] = {
    socket: socket,
    online: true,
  };

  socket.on("request_to_play", (data) => {
    const { playerName, roomId } = data;
    console.log(playerName,roomId);

    const player1 = allUsers[socket.id];
    player1.playerName = playerName;
    player1.roomId = roomId;

    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    rooms[roomId].push(player1);

    if(rooms[roomId].length===2){
      const [player1, player2] = rooms[roomId];
      console.log(player1.playerName,player2.playerName)
      player1.playing = true;
      player2.playing = true;
 
    

      player1.socket.emit("OpponentFound", {
        opponentName: player2.playerName,
        playingAs: "circle",
      });

      player2.socket.emit("OpponentFound", {
        opponentName: player1.playerName,
        playingAs: "cross",
      });

      player1.socket.on("playerMoveFromClient", (data) => {
        player2.socket.emit("playerMoveFromServer", {
          ...data,
        });
      });

      player2.socket.on("playerMoveFromClient", (data) => {
        player1.socket.emit("playerMoveFromServer", {
          ...data,
        });
      });
    } 
    else if (rooms[roomId].length > 2) {
      const extraPlayer = rooms[roomId].pop();
      extraPlayer.socket.emit("RoomFull");
    } else {
      player1.socket.emit("WaitingForOpponent");
    }
  });

  socket.on("disconnect", () => {
    const player1 = allUsers[socket.id];
    if (!player1) return;

    const { roomId } = player1;
    player1.online = false;
    player1.playing = false;

    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter(user => user.socket.id !== socket.id);

      if (rooms[roomId].length === 1) {
        const player2 = rooms[roomId][0];
        player2.socket.emit("opponentLeftMatch");
        player2.playing = false;
        rooms[roomId] = [];
      }

      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
      }
    }

    delete allUsers[socket.id];
  });
});

httpServer.listen(3000,()=>{
  console.log("chal raha hai mai");
});