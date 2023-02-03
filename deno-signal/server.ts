import { Application, Router, send } from "https://deno.land/x/oak/mod.ts";
import { crypto } from "https://deno.land/std@0.176.0/crypto/mod.ts";

const connectedClients: Record<string, WebSocket> = {};
const connectedWorkers: Record<string, WebSocket> = {};

const clientToWorker = new Map<WebSocket, WebSocket>();
const gameRooms: Record<string, string> = {}; // workerId: game name

const app = new Application();
const port = 8000;
const router = new Router();
type Message = {
  id: string;
  sessionID: string;
  data: string;
};
router.get("/ws", async (ctx) => {
  const socket = await ctx.upgrade();

  const userId = crypto.randomUUID();

  socket.onopen = () => {
    connectedClients[userId] = socket;
    // send the game room list
    socket.send(
      JSON.stringify({
        id: "games",
        data: JSON.stringify(gameRooms),
      })
    );
  };

  socket.onclose = () => {
    // terminateSession from worker if worker is alive
    delete connectedClients[userId];
    clientToWorker.get(socket)?.send(
      JSON.stringify({
        id: "terminateSession",
        sessionID: userId,
      })
    );
    clientToWorker.delete(socket);
  };

  socket.onmessage = (m: MessageEvent<string>) => {
    // handle client event
    // init webrtc -> forward init webrtc request to worker
    // answer webrtc -> forward answer webrtc request to worker
    // candidate webrtc -> forward candidate response to worker
    // client join the game room update clientToWorker map -> forward join room to update session on worker
    const payload: Message = JSON.parse(m.data);
    switch (payload.id) {
      case "initwebrtc": {
        const workerConn = connectedWorkers[payload.sessionID];
        if (workerConn) {
          payload.sessionID = userId;
          workerConn.send(JSON.stringify(payload));
        }
        break;
      }
      case "answer": {
        const workerConn = connectedWorkers[payload.sessionID];
        if (workerConn) {
          payload.sessionID = userId;
          workerConn.send(JSON.stringify(payload));
        }
        break;
      }
      case "candidate": {
        const workerConn = connectedWorkers[payload.sessionID];
        if (workerConn) {
          payload.sessionID = userId;
          workerConn.send(JSON.stringify(payload));
        }
        break;
      }
      case "joinRoom": {
        const workerConn = connectedWorkers[payload.sessionID];
        if (workerConn) {
          payload.sessionID = userId;
          workerConn.send(JSON.stringify(payload));
          clientToWorker.set(socket, workerConn);
        }
        break;
      }
      default:
        console.log("shouldn't happen for client message");
        break;
    }
  };
});

router.get("/wws", async (ctx) => {
  const socket = await ctx.upgrade();
  const workerId = crypto.randomUUID();

  socket.onopen = () => {
    connectedWorkers[workerId] = socket;
  };

  socket.onclose = () => {
    // clean up connectedWorkers, gameRooms, clientToWorker
    delete connectedWorkers[workerId];
    delete gameRooms[workerId];
    const clients:WebSocket[] = [];
    clientToWorker.forEach((c, w) => {
      if (w === socket) {
        clients.push(c);
      }
    });

    for(const c of clients){
      c.close();
    }
  };

  socket.onmessage = (m: MessageEvent<string>) => {
    // handle worker event
    // receive game info
    // offer -> forward offer to client
    // candidate -> forward candidate to client
    // acknowledge client joined the game room
    const payload: Message = JSON.parse(m.data);

    switch (payload.id) {
      case "gameInfo":
        gameRooms[workerId] = payload.data;
        // broadcast game room update
        for (const [_, conn] of Object.entries(connectedClients)) {
          conn.send(
            JSON.stringify({
              id: "games",
              data: JSON.stringify(gameRooms),
            })
          );
        }
        break;
      case "offer": {
        const clientConn = connectedClients[payload.sessionID];
        if (clientConn) {
          clientConn.send(m.data);
        }
        break;
      }
      case "candidate": {
        const clientConn = connectedClients[payload.sessionID];
        if (clientConn) {
          clientConn.send(m.data);
        }
        break;
      }
      case "updatePlayerCount": {
        payload.sessionID = workerId
        clientToWorker.forEach((workerConn, ClientConn) => {
          if (workerConn === socket) {
            ClientConn.send(JSON.stringify(payload));
          }
        });
        break;
      }
      default:
        console.log("shouldn't happen in worker message");
        break;
    }
  };
});

app.use(router.routes());
app.use(router.allowedMethods());
app.use(async (context) => {
  const path = context.request.url.pathname === "/" ? "/index.html" : context.request.url.pathname;

  await send(context, path, {
    root: `${Deno.cwd()}/public`,
  });
});

console.log("Listening at http://localhost:" + port);
await app.listen({ port });
