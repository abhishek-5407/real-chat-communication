import Message from "../models/Message.js";

export const saveMessage = async (sender, receiver, text) => {
  const newMessage = new Message({ sender, receiver, text });
  const saved = await newMessage.save();
  return saved;
};

export const getMessages = async (req, res) => {
  try {
    const { user1, user2 } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch {
    res.status(500).json({ message: "Something went wrong" });
  }
};
