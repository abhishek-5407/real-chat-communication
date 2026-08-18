import { saveMessage } from "./messageController.js";

const onlineUsers = new Map();

const handleConnection = (ws) => {
  let currentUser = null;

  ws.on("message", async (rawData) => {
    const data = JSON.parse(rawData);

    if (data.type === "addUser") {
      currentUser = data.username;
      onlineUsers.set(currentUser, ws);
      return;
    }

    if (data.type === "sendMessage") {
      const savedMessage = await saveMessage(
        data.sender,
        data.receiver,
        data.text,
      );

      const receiverSocket = onlineUsers.get(data.receiver);

      if (receiverSocket && receiverSocket.readyState === receiverSocket.OPEN) {
        receiverSocket.send(
          JSON.stringify({ type: "receiveMessage", payload: savedMessage }),
        );
      }

      ws.send(JSON.stringify({ type: "messageSent", payload: savedMessage }));
    }
  });

  ws.on("close", () => {
    if (currentUser) {
      onlineUsers.delete(currentUser);
    }
  });
};

export { handleConnection };
