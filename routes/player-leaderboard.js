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
  SUM(
      CASE 
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
      END
  ) AS pay_money,
  SUM(CASE WHEN p.user_id IS NULL THEN 1 ELSE 0 END) AS total_unpredicted_matches,
  (SUM(CASE WHEN p.team_id = m.winner_team THEN 1 ELSE 0 END) / (SUM(CASE WHEN p.team_id = m.winner_team THEN 1 ELSE 0 END) + SUM(CASE 
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
      END))) * 100 AS win_percentage,
  (CASE 
      WHEN (
          SELECT 
              COUNT(*) 
          FROM 
              (
                  SELECT 
                      CASE WHEN p1.team_id = m1.winner_team THEN 'W' ELSE 'L' END AS result
                  FROM 
                      prediction p1
                  INNER JOIN 
                      matches m1 ON p1.match_id = m1.id
                  WHERE 
                      p1.user_id = u.id
                  ORDER BY 
                      m1.date DESC
                  LIMIT 3
              ) AS recent_results
          WHERE 
              result = 'W'
      ) = 3 THEN 'true'
      ELSE 'false'
  END) AS streak
FROM
  users u
LEFT JOIN 
  matches m ON 1=1
LEFT JOIN 
  prediction p ON u.id = p.user_id AND m.id = p.match_id
GROUP BY
  u.id, u.first_name, u.last_name
ORDER BY 
  win_percentage DESC;`, (err, result) => {
        if (err) {
            console.error(err);
        }
        res.send(result);
    });
});


module.exports = router;