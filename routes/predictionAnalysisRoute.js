const express = require('express');
const db = require('../config/db.config');

const router = express.Router();

router.get('/filter/:tournamentId/:groupId', (req, res) => {
  const tournament_id = req.params.tournamentId;
  const group_id = req.params.groupId;
  db.query(`SELECT 
      u.id AS user_id,
      CONCAT(u.first_name, ' ', u.last_name) AS full_name,
      gt.group_id AS group_id,
      gt.tournament_id AS tournament_id,
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
          m.winner_team,
          gt.group_id,
          gt.tournament_id
      FROM
          matches m
      JOIN groups_tournaments gt ON m.tournament_id = gt.tournament_id
      WHERE
          gt.tournament_id IN (${tournament_id}) AND gt.group_id IN (${group_id}) AND
          m.winner_team IS NOT NULL
      ORDER BY
          m.date DESC
      LIMIT 5
    ) AS recent_matches ON 1=1
    LEFT JOIN
    matches m ON recent_matches.match_id = m.id
    LEFT JOIN
        teams t1 ON t1.id = m.team_1
    LEFT JOIN
        teams t2 ON t2.id = m.team_2
    LEFT JOIN
        teams t3 ON t3.id = m.winner_team
    LEFT JOIN
        groups_users gu ON u.id = gu.user_id
    LEFT JOIN
        groups_tournaments gt ON gu.group_id = gt.group_id
    LEFT JOIN
        prediction p ON recent_matches.match_id = p.match_id
        AND u.id = p.user_id and gt.tournament_id = p.tournament_id and gt.group_id = p.group_id
    LEFT JOIN
        teams t ON t.id = p.team_id
    WHERE
      gt.tournament_id IN (${tournament_id}) AND gt.group_id IN (${group_id})
    GROUP BY
      u.id, u.first_name, u.last_name, gt.group_id, gt.tournament_id
    ORDER BY
      u.id;`, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  });
})

// particular user prediction team list get
router.get('/:userId/:groupId/:tournamentId', (req, res) => {
  const userId = req.params.userId;
  const groupId = req.params.groupId;
  const tournamentId = req.params.tournamentId;
  db.query(`SELECT 
     p.id,
     m.match_no,
     t1.short_name AS team_1,
     t2.short_name AS team_2,
     m.venue,
     m.date,
     t_pred.short_name AS predict_team,
     t3.short_name AS winner_team,
     CASE
         WHEN t3.id = p.team_id AND p.team_id IS NOT NULL THEN 'true'
         ELSE 'false'
     END AS status
       FROM
      groups_users gu
     INNER JOIN
       groups_tournaments gt ON gu.group_id = gt.group_id
     INNER JOIN
       tournaments tournament ON gt.tournament_id = tournament.id
     INNER JOIN
       matches m ON tournament.id = m.tournament_id
     LEFT JOIN
       prediction p ON m.id = p.match_id AND gu.user_id = p.user_id AND gu.group_id = p.group_id
     LEFT JOIN
       group_details g ON gu.group_id = g.id
     LEFT JOIN
       teams t1 ON t1.id = m.team_1
     LEFT JOIN
       teams t2 ON t2.id = m.team_2
     LEFT JOIN
       teams t_pred ON t_pred.id = p.team_id
     LEFT JOIN
       teams t3 ON t3.id = m.winner_team
     WHERE
       p.group_id = ${groupId} AND p.user_id = ${userId} AND p.tournament_id = ${tournamentId}
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