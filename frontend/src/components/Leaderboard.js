import React, { useState, useEffect } from 'react';
import axios from 'axios';

// 1. Use the Environment Variable for the deployed URL
const API_URL = "https://four-in-a-row-game-1-e34s.onrender.com/api/leaderboard";

function Leaderboard({ gameResult }) {
  const [leaders, setLeaders] = useState([]);
  const [error, setError] = useState('');

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(API_URL);

      // 2. THIS IS THE CRITICAL FIX:
      // Check if the response data is actually an array before setting it.
      if (Array.isArray(response.data)) {
        setLeaders(response.data);
        setError('');
      } else {
        // If the API failed, it might send an object or string.
        // Set an empty array to prevent the .map() crash.
        console.error('API did not return an array:', response.data);
        setLeaders([]);
        setError('Could not load leaderboard.');
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setLeaders([]); // Set to empty array on catch as well
      setError('Could not load leaderboard.');
    }
  };

  useEffect(() => {
    // Fetch on initial load
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    // Fetch again whenever a game ends to update scores
    if (gameResult) {
      fetchLeaderboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameResult]); // Dependency on gameResult

  return (
    <div className="leaderboard-container">
      <h2>
        Leaderboard
      </h2>
      
      <>
        {error && <p className="status-message error">{error}</p>}
        <ol className="leaderboard-list">
          {leaders.length > 0 ? (
            leaders.map((player, index) => (
              <li key={player._id || index}>
                <span>{index + 1}. {player.username}</span>
                <span>{player.wins} wins</span>
              </li>
            ))
          ) : (
            // This will now show if the API fails or if there are 0 leaders
            <p>{error ? error : 'No winners yet!'}</p>
          )}
        </ol>
      </>
    </div>
  );
}
export default Leaderboard;
