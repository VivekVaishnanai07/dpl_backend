const express = require('express');
const db = require('../config/db.config');

const router = express.Router();

// player leaderboard list get
router.get('/', (req, res) => {
  db.query(`
  SELECT 
      u.id AS user_id,
      u.email,
      CONCAT(u.first_name, ' ', u.last_name) AS userName,
      COUNT(DISTINCT p.match_id) AS total_predicted_matches,
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
      total_match_count.total_match_count AS total_matches,
      total_match_count.total_match_count - COUNT(DISTINCT p.match_id) AS not_predicted_matches,
      (COUNT(CASE
          WHEN
              m.winner_team IS NOT NULL
                  AND m.winner_team != p.team_id
                  AND p.team_id IS NOT NULL
          THEN
              1
      END) + (total_match_count.total_match_count - COUNT(DISTINCT p.match_id))) * 10 AS user_points,
      CASE
          WHEN streak >= 3 THEN 'Up'
          WHEN streak <= -3 THEN 'Down'
          ELSE ''
      END AS streak
  FROM
      users u
  LEFT JOIN
      prediction p ON u.id = p.user_id
  LEFT JOIN
      matches m ON m.id = p.match_id
  CROSS JOIN
      (SELECT COUNT(*) AS total_match_count FROM matches) AS total_match_count
  LEFT JOIN
      (
          SELECT
              p.user_id,
              SUM(CASE WHEN p.team_id = m.winner_team THEN 1 ELSE -1 END) AS streak
          FROM
              prediction p
          JOIN
              matches m ON p.match_id = m.id
          GROUP BY
              p.user_id
      ) AS s ON u.id = s.user_id
  GROUP BY
      u.id, u.email, userName, total_match_count.total_match_count, streak
      ORDER BY won_matches DESC;`, (err, result) => {
    if (err) {
      console.error(err);
    }
    res.send(result);
  });
});


module.exports = router;