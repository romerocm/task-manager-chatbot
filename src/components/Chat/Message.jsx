import React from "react";

const Message = ({ text, sender, imageUrl }) => {
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
        style={{ animation: "fadeIn 0.5s forwards, slideIn 0.5s ease-out" }}
      >
        {imageUrl && (
          <div className="max-w-full overflow-hidden">
            <img 
              src={imageUrl} 
              alt="Pasted content"
              className="w-full max-h-48 rounded-lg mb-2 object-contain"
            />
          </div>
        )}
        {text}
      </div>
    </div>
  );
};

export default Message;

<style>
  {`
    @keyframes slideIn {
      from {
        transform: translateX(20px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `}
</style>
