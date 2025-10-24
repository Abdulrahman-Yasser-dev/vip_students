import React, { useEffect, useState } from "react";

const Timer = () => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1); // تصاعدي
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // نحسب الساعات والدقايق والثواني
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours > 0 ? String(hours).padStart(2, "0") + ":" : ""}${String(
      minutes
    ).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div
      style={{
        background: "#ffc107", // 🟡 خلفية صفراء
        color: "#fff", // ⬜ النص أبيض
        padding: "8px 16px",
        borderRadius: "8px",
        fontSize: "1.2rem",
        fontWeight: "bold",
        display: "inline-block",
        minWidth: "80px",
        textAlign: "center",
        border: "2px solid #ffc107", // 🟡 نفس لون الخلفية
      }}
    >
     {formatTime(seconds)}
    </div>
  );
};

export default Timer;
