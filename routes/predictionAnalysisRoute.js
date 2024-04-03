const express = require('express');
const db = require('../config/db.config');

const router = express.Router();

router.get('/', (req, res) => {
  db.query(`SELECT 
  u.id AS user_id,
  CONCAT(u.first_name, ' ', u.last_name) AS full_name,
  JSON_ARRAYAGG(
      JSON_OBJECT(
          'date', m.date,
          'venue', m.venue,
          'status', 
              CASE
                  WHEN t.id = m.winner_team AND p.team_id IS NOT NULL THEN 'true'
                  ELSE 'false'
              END,
          'team_1', t1.short_name,
          'team_2', t2.short_name,
          'match_id', m.id,
          'match_no', m.match_no,
          'winner_team', COALESCE(t3.short_name, 'null'),
          'predict_team', COALESCE(t.short_name, 'null')
      )
  ) AS match_details
FROM
  users u
LEFT JOIN (
  SELECT 
      m.id AS match_id,
      m.match_no,
      m.venue,
      m.date,
      m.winner_team
  FROM
      matches m
  WHERE
      m.winner_team IS NOT NULL
  ORDER BY
      m.date DESC
  LIMIT 5
) AS recent_matches ON 1=1
LEFT JOIN
  prediction p ON recent_matches.match_id = p.match_id AND u.id = p.user_id
LEFT JOIN
  matches m ON recent_matches.match_id = m.id
LEFT JOIN
  teams t1 ON t1.id = m.team_1
LEFT JOIN
  teams t2 ON t2.id = m.team_2
LEFT JOIN
  teams t ON t.id = p.team_id
LEFT JOIN
  teams t3 ON t3.id = m.winner_team
GROUP BY
  u.id, u.first_name, u.last_name
ORDER BY
  u.id;`, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  });
})

// particular user prediction team list get
router.get('/:id', (req, res) => {
  const id = req.params.id;
  db.query(`SELECT 
  p.id,
  p.user_id,
  m.match_no,
  t1.short_name AS team_1,
  t2.short_name AS team_2,
  m.venue,
  m.date,
  t.short_name AS predict_team,
  t3.short_name AS winner_team,
  CASE
      WHEN t.id = m.winner_team AND p.team_id IS NOT NULL THEN 'true'
      ELSE 'false'
  END AS status
FROM
  matches m
      LEFT JOIN
  prediction p ON m.id = p.match_id AND p.user_id = ${id}
      LEFT JOIN
  teams t1 ON t1.id = m.team_1
      LEFT JOIN
  teams t2 ON t2.id = m.team_2
      LEFT JOIN
  teams t ON t.id = p.team_id
      LEFT JOIN
  teams t3 ON t3.id = m.winner_team
ORDER BY
  m.match_no ASC;`, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  }
  );
})


module.exports = router;