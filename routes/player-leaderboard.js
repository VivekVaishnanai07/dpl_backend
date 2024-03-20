const express = require('express');
const db = require('../config/db.config');

const router = express.Router();

// player leaderboard list get
router.get('/', (req, res) => {
  db.query(`SELECT 
  u.id AS user_id,
  CONCAT(u.first_name, ' ', u.last_name) AS userName,
  COUNT(CASE
      WHEN m.winner_team = p.team_id THEN 1
  END) AS won_matches,
  COUNT(CASE
      WHEN
          m.winner_team IS NOT NULL
              AND m.winner_team != p.team_id
              AND p.team_id IS NOT NULL
      THEN
          1
  END) AS lost_matches,
  COUNT(DISTINCT p.match_id) AS total_matches,
  IFNULL(SUM(CASE
      WHEN
          m.winner_team IS NOT NULL
              AND m.winner_team != p.team_id
              AND p.team_id IS NOT NULL
      THEN
          m.match_price
  END), 0) AS pay_money
FROM
  users u
LEFT JOIN
  prediction p ON u.id = p.user_id
LEFT JOIN
  matches m ON m.id = p.match_id
GROUP BY
  u.id, userName
ORDER BY
  won_matches DESC;
`, (err, result) => {
    if (err) {
      console.error(err);
    }
    res.send(result);
  });
});


module.exports = router;