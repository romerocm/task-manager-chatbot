// src/components/ui/Avatar.jsx
import React from "react";

function getInitials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 85%)`;
}

const Avatar = ({ name, size = 32, className = "" }) => {
  const initials = getInitials(name);
  const backgroundColor = stringToColor(name);

  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold text-gray-700 ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor,
        fontSize: `${size * 0.4}px`,
      }}
    >
      {initials}
    </div>
  );
};

export default Avatar;
