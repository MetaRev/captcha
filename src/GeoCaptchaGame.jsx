import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { useState } from "react";
import successSound from "./assets/correct.wav";
import wrongSound from "./assets/wrong.wav";
import winSound from "./assets/Win.mp3";

// Base locations go from easy (very famous) to harder ones
const baseLocations = [
  {
    name: "Eiffel Tower",
    country: "France",
    lat: 48.8584,
    lng: 2.2945,
    difficulty: 1,
  },
  {
    name: "Statue of Liberty",
    country: "United States",
    lat: 40.6892,
    lng: -74.0445,
    difficulty: 1,
  },
  {
    name: "Sydney Opera House",
    country: "Australia",
    lat: -33.8568,
    lng: 151.2153,
    difficulty: 2,
  },
  {
    name: "Tokyo Tower",
    country: "Japan",
    lat: 35.6586,
    lng: 139.7454,
    difficulty: 2,
  },
  {
    name: "Reykjavík Street",
    country: "Iceland",
    lat: 64.1466,
    lng: -21.9426,
    difficulty: 3,
  },
];

// Pool of candidate cities for the *final* round – one of these
// will be chosen at random each time the game is played.
const lastRoundCandidates = [
  { name: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278, difficulty: 3 },
  { name: "New York City", country: "United States", lat: 40.7128, lng: -74.006, difficulty: 3 },
  { name: "Rio de Janeiro", country: "Brazil", lat: -22.9068, lng: -43.1729, difficulty: 3 },
  { name: "Cape Town", country: "South Africa", lat: -33.9249, lng: 18.4241, difficulty: 3 },
  { name: "Moscow", country: "Russia", lat: 55.7558, lng: 37.6173, difficulty: 3 },
  { name: "Rome", country: "Italy", lat: 41.9028, lng: 12.4964, difficulty: 3 },
  { name: "Madrid", country: "Spain", lat: 40.4168, lng: -3.7038, difficulty: 3 },
  { name: "Berlin", country: "Germany", lat: 52.52, lng: 13.405, difficulty: 3 },
  { name: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832, difficulty: 3 },
  { name: "Dubai", country: "United Arab Emirates", lat: 25.2048, lng: 55.2708, difficulty: 3 },
  { name: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198, difficulty: 3 },
  { name: "Hong Kong", country: "China", lat: 22.3193, lng: 114.1694, difficulty: 3 },
  { name: "Bangkok", country: "Thailand", lat: 13.7563, lng: 100.5018, difficulty: 3 },
  { name: "Seoul", country: "South Korea", lat: 37.5665, lng: 126.978, difficulty: 3 },
  { name: "Los Angeles", country: "United States", lat: 34.0522, lng: -118.2437, difficulty: 3 },
  { name: "San Francisco", country: "United States", lat: 37.7749, lng: -122.4194, difficulty: 3 },
  { name: "Mexico City", country: "Mexico", lat: 19.4326, lng: -99.1332, difficulty: 3 },
  { name: "Buenos Aires", country: "Argentina", lat: -34.6037, lng: -58.3816, difficulty: 3 },
  { name: "Cairo", country: "Egypt", lat: 30.0444, lng: 31.2357, difficulty: 3 },
  { name: "Athens", country: "Greece", lat: 37.9838, lng: 23.7275, difficulty: 3 },
];

const MAX_TRIES_PER_ROUND = 3;

function difficultyLabel(difficulty) {
  if (difficulty === 1) return "Easy";
  if (difficulty === 2) return "Medium";
  return "Hard";
}

// Rough Earth distance (in km) using haversine formula
function distanceKm(a, b) {
  const R = 6371; // km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function thresholdKmForDifficulty(difficulty) {
  // Easier rounds allow a bigger error
  if (difficulty === 1) return 700; // km
  if (difficulty === 2) return 400;
  return 200;
}

function streetViewImageUrl({ lat, lng }, heading, pitch) {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const size = "600x260";
  const fov = 90;

  return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${lat},${lng}&fov=${fov}&heading=${heading}&pitch=${pitch}&key=${key}`;
}

export default function GeoCaptchaGame({ onVerify }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const [roundIndex, setRoundIndex] = useState(0);
  const [guess, setGuess] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [wasCorrect, setWasCorrect] = useState(false);
  const [heading, setHeading] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [triesLeft, setTriesLeft] = useState(MAX_TRIES_PER_ROUND);
  const [gameOver, setGameOver] = useState(false);

  // Choose a random city from the pool for the last round
  const [lastRoundIndex] = useState(
    () => Math.floor(Math.random() * lastRoundCandidates.length),
  );

  const totalRounds = baseLocations.length + 1; // base rounds + one random city

  function getLocationForRound(index) {
    if (index < baseLocations.length) return baseLocations[index];
    return lastRoundCandidates[lastRoundIndex];
  }

  const current = getLocationForRound(roundIndex);

  function advanceToNextRound() {
    const next = Math.min(roundIndex + 1, totalRounds - 1);
    setRoundIndex(next);
    setGuess(null);
    setFeedback("");
    setWasCorrect(false);
    setHeading(0);
    setPitch(0);
    setTriesLeft(MAX_TRIES_PER_ROUND);
    setGameOver(false);
  }

  function playSuccessSoundThenAdvance() {
    try {
      const audio = new Audio(successSound);
      audio.addEventListener("ended", () => {
        advanceToNextRound();
      });
      audio.play().catch(() => {
        // If autoplay is blocked, just advance after a small delay
        setTimeout(advanceToNextRound, 200);
      });
    } catch {
      setTimeout(advanceToNextRound, 200);
    }
  }

  function handleMapClick(e) {
    setGuess({
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    });
    setFeedback("");
    setWasCorrect(false);
  }

  function verifyGuess() {
    if (triesLeft <= 0) {
      setFeedback("No tries left for this round. Game over. Reload the CAPTCHA to try again.");
      setWasCorrect(false);
      setGameOver(true);
      return;
    }
    if (!guess) {
      setFeedback("Click on the map to drop a pin first.");
      setWasCorrect(false);
      return;
    }

    const dist = distanceKm(
      { lat: current.lat, lng: current.lng },
      guess,
    );

    const threshold = thresholdKmForDifficulty(current.difficulty);
    const rounded = Math.round(dist);

    if (dist <= threshold) {
      const isLastRound = roundIndex === totalRounds - 1;
      setWasCorrect(true);

      if (isLastRound) {
        setFeedback(
          `Nice! You were about ${rounded} km away from ${current.name}, ${current.country}. All rounds complete!`,
        );

        // Play final win sound immediately on last-round success
        try {
          const audio = new Audio(winSound);
          audio.play().catch(() => {});
        } catch {
          // ignore audio errors
        }

        if (onVerify) onVerify(true);
      } else {
        setFeedback(
          `Nice! You were about ${rounded} km away from ${current.name}, ${current.country}.`,
        );

        // Play a short success sound, then automatically advance
        playSuccessSoundThenAdvance();
      }
    } else {
      setWasCorrect(false);
      const remaining = triesLeft - 1;
      setTriesLeft(remaining);

      // Play wrong-answer sound (no need to block UI on it)
      try {
        const audio = new Audio(wrongSound);
        audio.play().catch(() => {});
      } catch {
        // ignore audio errors
      }

      if (remaining <= 0) {
        setFeedback(
          `Too far! You were about ${rounded} km away (needed to be within ${threshold} km). You have no tries left for this round. Game over.`,
        );
        setGameOver(true);
      } else {
        setFeedback(
          `Too far! You were about ${rounded} km away (needed to be within ${threshold} km). You have ${remaining} ${remaining === 1 ? "try" : "tries"} left.`,
        );
      }
    }
  }

  function resetRound() {
    // Full game reset: send the user back to round 1
    setRoundIndex(0);
    setGuess(null);
    setFeedback("");
    setWasCorrect(false);
    setHeading(0);
    setPitch(0);
    setTriesLeft(MAX_TRIES_PER_ROUND);
    setGameOver(false);
  }

  function rotateLeft() {
    setHeading((prev) => (prev - 45 + 360) % 360);
  }

  function rotateRight() {
    setHeading((prev) => (prev + 45) % 360);
  }

  function lookUp() {
    setPitch((prev) => Math.min(prev + 15, 60));
  }

  function lookDown() {
    setPitch((prev) => Math.max(prev - 15, -60));
  }

  // If the Maps script failed to load (CORS, network, bad key, etc.),
  // avoid rendering the game so the whole app does not crash.
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-4 text-center text-sm text-red-600">
        <p>Google Maps failed to load.</p>
        <p className="mt-1 text-xs text-gray-700">
          Check your internet connection, API key, or browser extensions blocking Google Maps.
        </p>
      </div>
    );
  }

  if (!isLoaded) return <div>Loading map...</div>;

  if (gameOver) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-white">
        <h2 className="text-2xl font-semibold mb-2 text-red-600">Game over</h2>
        <p className="text-sm text-gray-700 mb-4">
          You&apos;ve used all your tries. Click the button below to start over.
        </p>
        <button
          onClick={resetRound}
          className="bg-blue-500 text-white px-6 py-2 text-sm rounded hover:bg-blue-600"
        >
          Play again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      {/* Street View-like image of the hidden location with simple rotation controls */}
      <div className="h-[55%] border-b border-gray-300 flex flex-col">
        <div className="flex-1 bg-black/5 flex items-center justify-center">
          <img
            src={streetViewImageUrl(current, heading, pitch)}
            alt="Street view of hidden location"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex justify-center gap-3 py-1 text-xs text-gray-700 flex-wrap">
          <div className="flex gap-2">
            <button
              onClick={rotateLeft}
              className="px-2 py-1 border rounded hover:bg-gray-100"
            >
              ⟲ Look left
            </button>
            <button
              onClick={rotateRight}
              className="px-2 py-1 border rounded hover:bg-gray-100"
            >
              Look right ⟳
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={lookUp}
              className="px-2 py-1 border rounded hover:bg-gray-100"
            >
              ↑ Look up
            </button>
            <button
              onClick={lookDown}
              className="px-2 py-1 border rounded hover:bg-gray-100"
            >
              ↓ Look down
            </button>
          </div>
        </div>
      </div>

      {/* Guess Map where the user drops a pin */}
      <div className="flex-1 relative flex flex-col">
        <div className="px-3 py-1 text-xs text-gray-700 bg-white/80 border-b border-gray-200 z-10">
          Click on the map to drop your red guess pin. You have {triesLeft}{" "}
          {triesLeft === 1 ? "try" : "tries"} this round.
        </div>
        <div className="flex-1">
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={{ lat: 20, lng: 0 }}
            zoom={2}
            onClick={handleMapClick}
          >
            {guess && <Marker position={guess} />}
          </GoogleMap>
        </div>
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-300 text-sm flex flex-col gap-2">
        <div className="flex flex-wrap gap-x-6 gap-y-1 items-baseline text-xs text-gray-700">
          <span>
            <strong>Round:</strong> {roundIndex + 1} of {totalRounds}
          </span>
          <span>
            <strong>Difficulty:</strong> {difficultyLabel(current.difficulty)}
          </span>
          <span>
            <strong>Tries left:</strong> {triesLeft}
          </span>

        </div>

        {feedback && (
          <p
            className={`text-xs ${
              wasCorrect ? "text-green-600" : "text-red-600"
            }`}
          >
            {feedback}
          </p>
        )}

        <div className="flex justify-between items-center mt-1 gap-2">
          <button
            onClick={resetRound}
            className="text-gray-600 hover:text-black text-sm"
          >
            ↻ Reset
          </button>

          <div className="flex gap-2">
            <button
              onClick={verifyGuess}
              className="bg-blue-500 text-white px-6 py-2 text-sm hover:bg-blue-600"
            >
              Verify
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}