import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Get API URL from backend (3001)
const API_URL = https://four-in-a-row-game-1-e34s.onrender.com;

// 1. Remove 'show' and 'toggleShow' from props
function Leaderboard({ gameResult }) {
  const [leaders, setLeaders] = useState([]);
  const [error, setError] = useState('');

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(API_URL);
      setLeaders(response.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
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
      // 2. Remove the toggleShow(true) line
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameResult]); // Dependency on gameResult

  return (
    <div className="leaderboard-container">
      {/* 3. Remove onClick and hover styles from h2 */}
      <h2>
        Leaderboard
      </h2>
      
      {/* 4. Remove the conditional {show && ...} wrapper */}
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
            <p>No winners yet!</p>
          )}
        </ol>
      </>
    </div>
  );
}
export default Leaderboard;
