import React from "react";

const Message = ({ text, sender }) => {
  return (
    <div
      className={`flex ${sender === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`p-3 rounded-lg max-w-[80%] transition-opacity duration-300 opacity-0 ${
          sender === "user"
            ? "bg-blue-500 text-white"
            : "bg-gray-100 text-gray-800"
        }`}
        style={{ animation: "fadeIn 0.5s forwards" }}
      >
        {text}
      </div>
    </div>
  );
};

export default Message;
