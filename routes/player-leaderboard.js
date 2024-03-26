const express = require('express');
const db = require('../config/db.config');

const router = express.Router();

// player leaderboard list get
router.get('/', (req, res) => {
  db.query(`SELECT
  u.id AS user_id, 
  CONCAT(u.first_name, ' ', u.last_name) AS full_name,
  COUNT(DISTINCT m.id) AS total_matches,
  COUNT(DISTINCT p.match_id) AS predicted_matches,
  SUM(CASE WHEN p.team_id = m.winner_team THEN 1 ELSE 0 END) AS win_matches,
  SUM(
      CASE 
          WHEN p.team_id IS NOT NULL THEN
              CASE 
                  WHEN p.team_id != m.winner_team THEN 1 
                  ELSE 0 
              END
          ELSE 
              CASE 
                  WHEN m.winner_team IS NOT NULL THEN 1 
                  ELSE 0 
              END 
      END
  ) AS lose_matches,
  SUM(CASE WHEN p.user_id IS NULL AND m.date < CURDATE() THEN 1 ELSE 0 END) AS unpredicted_past_matches,
  SUM(CASE WHEN p.user_id IS NULL AND m.date > CURDATE() THEN 1 ELSE 0 END) AS unpredicted_future_matches,
  SUM(CASE WHEN m.date > CURDATE() THEN 1 ELSE 0 END) AS upcoming_matches,
  SUM(CASE 
          WHEN p.team_id IS NOT NULL THEN
              CASE 
                  WHEN p.team_id != m.winner_team THEN m.match_price
                  ELSE 0 
              END
          ELSE 
              CASE 
                  WHEN m.winner_team IS NOT NULL THEN m.match_price
                  ELSE 0 
              END 
      END) AS pay_money,
  SUM(CASE WHEN p.user_id IS NULL THEN 1 ELSE 0 END) AS total_unpredicted_matches
FROM
  users u
LEFT JOIN matches m ON 1=1
LEFT JOIN prediction p ON u.id = p.user_id AND m.id = p.match_id
GROUP BY
  u.id, u.first_name, u.last_name
ORDER BY 
  win_matches DESC;`, (err, result) => {
    if (err) {
      console.error(err);
    }
    res.send(result);
  });
});


module.exports = router;