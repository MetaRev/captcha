import { useState } from "react";
import "./App.css";
import GeoCaptchaGame from "./GeoCaptchaGame";
import img from "./assets/file1.svg";;

function App() {
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [showWinConfetti, setShowWinConfetti] = useState(false);

  function handleClick() {
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setTick(true);

      setTimeout(() => {
        setShowPopup(true);
      }, 600);

    }, 2000);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-200 relative">

      <div className="bg-white w-72 h-20 shadow-xl flex items-center px-5 border border-gray-300 z-0">

        {/* Checkbox */}
        <div
          id="captchaBox"
          onClick={!tick ? handleClick : undefined}
          className={`w-8 h-8 rounded-sm cursor-pointer flex items-center justify-center transition
            ${loading || tick ? "" : "border-2 border-gray-400 hover:border-gray-600"}`}
        >

          {/* Spinner */}
          {loading && (
            <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          )}

          {/* Animated Tick */}
          {tick && !loading && (
            <svg
              viewBox="0 0 24 24"
              className="w-7 h-7 text-green-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path
                className="checkmark"
                d="M5 13l4 4L19 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}

        </div>

        {/* Text */}
        <p className="ml-3 text-base">I'm not a robot</p>

        {/* Logo */}
        <div className="ml-auto flex flex-col items-center text-[9px] opacity-70 leading-tight">

          <img
            src={logo}
            className="w-10 h-10"
          />

          <p className="font-semibold">reCAPTCHA</p>

          <p>
            <span className="hover:underline cursor-pointer">Privacy</span> 
            <span className="hover:underline cursor-pointer"> Terms</span>
          </p>

        </div>

      </div>

      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-10">
          <div className="bg-white w-[520px] h-[670px] shadow-md border border-[#D3D3D3] flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="bg-blue-500 text-white p-4 border-b border-gray-300">
              <p className="text-sm">Guess where this place is</p>
              <p className="text-2xl font-semibold">GeoGuessr CAPTCHA</p>
            </div>

            {/* Game */}
            <div className="flex-1">
              <GeoCaptchaGame
                onVerify={() => {
                  setShowPopup(false);
                  setTick(true);
                  setShowWinConfetti(true);
                  setTimeout(() => setShowWinConfetti(false), 2500);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Simple confetti overlay when user wins all rounds */}
      {showWinConfetti && (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center z-20">
          <div className="confetti-container">
            {Array.from({ length: 80 }).map((_, i) => (
              <div
                key={i}
                className="confetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 1.5}s`,
                  backgroundColor:
                    ["#22c55e", "#3b82f6", "#f97316", "#e11d48", "#a855f7"][
                    i % 5
                    ],
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

