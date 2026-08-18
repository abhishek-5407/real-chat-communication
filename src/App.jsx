import { useState } from "react";
import UserLogin from "./components/UserLogin";
import ChatWindow from "./components/ChatWindow";
import useWebSocket from "./hooks/useWebSocket";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const { messages, sendMessage, setMessages } = useWebSocket(currentUser);

  if (!currentUser) {
    return <UserLogin onLogin={setCurrentUser} />;
  }

  return (
    <div className="app">
      <h3>Logged in as: {currentUser}</h3>
      <ChatWindow
        currentUser={currentUser}
        messages={messages}
        sendMessage={sendMessage}
        setMessages={setMessages}
      />
    </div>
  );
}

export default App;