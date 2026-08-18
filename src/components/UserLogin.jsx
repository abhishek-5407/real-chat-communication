import { useState } from "react";

const UserLogin = ({ onLogin }) => {
  const [name, setName] = useState("");

  const handleSubmit = () => {
    if (name.trim() === "") return;
    onLogin(name);
  };

  return (
    <div className="login-box">
      <h2>Enter your username</h2>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. rahul"
      />
      <button onClick={handleSubmit}>Enter Chat</button>
    </div>
  );
};

export default UserLogin;