const MessageList = ({ messages, currentUser }) => {
  return (
    <div className="message-list">
      {messages.map((msg) => (
        <div
          key={msg._id || Math.random()}
          className={msg.sender === currentUser ? "sent" : "received"}
        >
          <p>{msg.text}</p>
        </div>
      ))}
    </div>
  );
};

export default MessageList;