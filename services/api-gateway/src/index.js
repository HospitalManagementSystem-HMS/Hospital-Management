const env = require("./config/env");
const { createApp } = require("./app");
const http = require("http");
const { Server } = require("socket.io");

async function main() {
  const app = createApp();
  const server = http.createServer(app);
  
  const io = new Server(server, {
    cors: { 
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    // eslint-disable-next-line no-console
    console.log(`Socket connected: ${socket.id}`);
    socket.on("disconnect", () => {
      // eslint-disable-next-line no-console
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  app.set("io", io);

  server.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`api-gateway listening on :${env.PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

