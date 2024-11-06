import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

const COMBO_WINDOW = 5000; // 5 seconds

const messages = [
  "You're on fire! 🔥",
  "Crushing it! 💪",
  "Unstoppable! ⚡",
  "What a streak! 🌟",
  "You're amazing! 🎯",
  "Keep rolling! 🎲",
  "Fantastic work! 🌈",
  "You're crushing it! 💫",
  "Incredible focus! 🎯",
  "Productivity master! 👑"
];

const ComboEffect = ({ onComboEnd }) => {
  const [combo, setCombo] = useState(0);
  const [visible, setVisible] = useState(false);
  const [timer, setTimer] = useState(null);
  const [currentMessage, setCurrentMessage] = useState(messages[0]);

  useEffect(() => {
    const handleTaskCompleted = () => triggerCombo();
    window.addEventListener('taskCompletedCombo', handleTaskCompleted);
    
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('taskCompletedCombo', handleTaskCompleted);
    };
  }, [timer]);

  useEffect(() => {
    if (combo >= 2) {
      const messageIndex = (combo - 2) % messages.length;
      setCurrentMessage(messages[messageIndex]);
    }
  }, [combo]);

  const triggerCombo = () => {
    setCombo(prev => {
      const newCombo = prev + 1;
      
      // Clear existing timer
      if (timer) clearTimeout(timer);
      
      // Set new timer
      const newTimer = setTimeout(() => {
        if (onComboEnd) onComboEnd(newCombo);
        setCombo(0);
        setVisible(false);
      }, COMBO_WINDOW);
      
      setTimer(newTimer);
      setVisible(true);

      // Trigger effects based on combo level
      if (newCombo >= 2) {
        const intensity = Math.min(newCombo / 10, 1);
        confetti({
          particleCount: Math.floor(50 * intensity),
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#FFD700', '#FFA500', '#FF4500']
        });
      }

      return newCombo;
    });
  };

  if (!visible || combo < 2) return null;

  return (
    <div
      className="fixed bottom-8 left-8 z-50 animate-bounce"
      style={{
        animation: 'bounce 0.5s ease-in-out',
      }}
    >
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full shadow-lg">
        <div className="text-xl font-bold">
          {combo}x COMBO!
        </div>
        <div className="text-sm mt-1 text-center">
          {currentMessage}
        </div>
      </div>
    </div>
  );
};

export default ComboEffect;
