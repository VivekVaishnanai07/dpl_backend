const express = require('express');
const db = require('../config/db.config');

const router = express.Router();

// player leaderboard list get
router.get('/', (req, res) => {
  db.query(`SELECT u.id, u.email, CONCAT(u.first_name, ' ', u.last_name) AS userName, COUNT(DISTINCT m.id) AS total_predicted_matches, COUNT(CASE WHEN m.winner_team = p.team_id THEN 1 END) AS won_matches, COUNT(CASE WHEN m.winner_team IS NOT NULL AND m.winner_team != p.team_id AND p.team_id IS NOT NULL THEN 1 END) AS lost_matches, total_match_count.total_match_count AS total_matches, total_match_count.total_match_count - COUNT(DISTINCT m.id) AS not_predicted_matches, (COUNT(CASE WHEN m.winner_team IS NOT NULL AND m.winner_team != p.team_id AND p.team_id IS NOT NULL THEN 1 END) + (total_match_count.total_match_count - COUNT(DISTINCT m.id)))* 10 AS user_points FROM users u LEFT JOIN prediction p ON u.id = p.user_id LEFT JOIN matches m ON m.id = p.match_id CROSS JOIN (SELECT COUNT(*) AS total_match_count FROM matches) AS total_match_count GROUP BY u.id, u.email, userName, total_match_count.total_match_count;`, (err, result) => {
    if (err) {
      console.error(err);
    }
    res.send(result);
  });
});


module.exports = router;