const express = require('express');
const db = require('../config/db.config');

const router = express.Router();

// player leaderboard list get
router.get('/filter/:tournamentId/:groupId', (req, res) => {
    const tournament_id = req.params.tournamentId;
    const group_id = req.params.groupId;
    db.query(`SELECT
    u.id AS user_id, 
    CONCAT(u.first_name, ' ', u.last_name) AS full_name,
    u.userImg AS userImg,
    gt.tournament_id AS tournament_id,
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
                    JOIN
                        groups_tournaments gt1 ON m1.tournament_id = gt1.tournament_id
                    JOIN
                        groups_users gu1 ON u.id = gu1.user_id
                    WHERE 
                        p1.user_id = u.id AND gu1.group_id IN (${group_id}) AND gt1.tournament_id IN (${tournament_id})
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
    groups_users gu ON u.id = gu.user_id
  LEFT JOIN
    groups_tournaments gt ON gu.group_id = gt.group_id
  LEFT JOIN 
    matches m ON gt.tournament_id = m.tournament_id
  LEFT JOIN 
    prediction p ON u.id = p.user_id AND m.id = p.match_id and gt.tournament_id = p.tournament_id and gt.group_id = p.group_id
  WHERE
    gt.tournament_id IN (${tournament_id})
    AND gu.group_id IN (${group_id})
  GROUP BY
    u.id, u.first_name, u.last_name, gt.tournament_id
  ORDER BY 
     win_percentage DESC;`, (err, result) => {
        if (err) {
            console.error(err);
        }
        res.send(result);
    });
});


module.exports = router;