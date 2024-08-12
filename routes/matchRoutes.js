const express = require('express');
const db = require('../config/db.config');
const verifyRoleOrToken = require('../middlewares/verifyRoleOrToken');

const router = express.Router();

// get matches list
router.get("/tournament/:tournament_id", verifyRoleOrToken(['admin', 'user']), (req, res) => {
  const id = req.params.tournament_id;
  const sqlQuery = `SELECT 
  m.id, 
  team_1.full_name AS team_1, 
  team_1.icon AS team_1_icon, 
  team_1.short_name AS team_1_short_name, 
  team_1.team_color AS team_1_color,
  team_2.full_name AS team_2, 
  team_2.icon AS team_2_icon, 
  team_2.short_name AS team_2_short_name, 
  team_2.team_color AS team_2_color,
  m.tournament_id,
  m.venue, 
  m.match_price,
  m.date, 
  m.match_no, 
  m.season_year, 
  team_3.full_name AS winner_team
  FROM 
    matches m 
  INNER JOIN 
    teams team_1 ON team_1.id = m.team_1 
  INNER JOIN 
    teams team_2 ON team_2.id = m.team_2 
  LEFT JOIN 
    teams team_3 ON team_3.id = m.winner_team
    WHERE 
  m.tournament_id = ${id};`;
  db.query(sqlQuery, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("An error occurred while fetching data from the database.");
      return;
    }

    // Format the result here before sending the response
    const formattedResult = result.map(item => ({
      id: item.id,
      team_1: item.team_1,
      team_1_icon: item.team_1_icon,
      team_1_short_name: item.team_1_short_name,
      team_1_color: item.team_1_color,
      team_2: item.team_2,
      team_2_icon: item.team_2_icon,
      team_2_short_name: item.team_2_short_name,
      team_2_color: item.team_2_color,
      tournament_id: item.tournament_id,
      venue: item.venue,
      match_price: item.match_price,
      date: item.date,
      match_no: item.match_no,
      season_year: item.season_year,
      winner_team: item.winner_team,
    }));

    res.send(formattedResult);
  });
});

// dashboard matches list
router.get("/dashboard/:userId", verifyRoleOrToken(['admin', 'user']), (req, res) => {
  const id = req.params.userId;
  // const tournament_id = req.params.tournamentId;
  db.query(`SELECT 
      m.id, 
      team_1.id AS team_1_id, 
      team_1.full_name AS team_1, 
      team_1.icon AS team_1_icon, 
      team_1.team_color AS team_1_color, 
      team_2.id AS team_2_id, 
      team_2.full_name AS team_2, 
      team_2.icon AS team_2_icon, 
      team_2.team_color AS team_2_color, 
      m.venue, 
      m.match_price, 
      m.date, 
      m.match_no, 
      m.season_year, 
      team_3.full_name AS winner_team, 
      CASE 
        WHEN m.date < CURRENT_TIMESTAMP THEN 'Match Over' 
        WHEN DATE(m.date) = CURRENT_DATE THEN 'Today Match' 
        ELSE 'Upcoming Match' 
      END AS match_status, 
      IF(DATEDIFF(m.date, CURRENT_DATE) = 0, 
        TIME_FORMAT(TIMEDIFF(m.date, CURRENT_TIMESTAMP), 
          '%H:%i'), 
        CONCAT(DATEDIFF(m.date, CURRENT_DATE))) AS countdownDateTime, 
      MAX(pt.short_name) AS predicted_team, 
      MAX(pt.team_color) AS predicted_team_color 
    FROM 
      matches m
        LEFT JOIN
    teams team_1 ON team_1.id = m.team_1
        LEFT JOIN
    teams team_2 ON team_2.id = m.team_2
        LEFT JOIN
    teams team_3 ON team_3.id = m.winner_team
        LEFT JOIN
    prediction p ON m.id = p.match_id AND p.user_id = ${id}
        LEFT JOIN
    teams pt ON p.team_id = pt.id
        INNER JOIN
    groups_tournaments gt ON m.tournament_id = gt.tournament_id
        INNER JOIN
    groups_users gu ON gt.group_id = gu.group_id
        AND gu.user_id = ${id} 
    WHERE
     m.date > NOW()
    GROUP BY m.id , team_1.id , team_2.id , m.venue , m.match_price , m.date , m.match_no , m.season_year , team_3.full_name
    ORDER BY ABS(TIMESTAMPDIFF(SECOND,m.date,CURRENT_TIMESTAMP)) ASC
    LIMIT 5;`, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("An error occurred while fetching data from the database.");
      return;
    }

    // Format the result here before sending the response
    const formattedResult = result.map(item => ({
      id: item.id,
      team_1_id: item.team_1_id,
      team_1: item.team_1,
      team_1_icon: item.team_1_icon,
      team_1_color: item.team_1_color,
      team_2_id: item.team_2_id,
      team_2: item.team_2,
      team_2_icon: item.team_2_icon,
      team_2_color: item.team_2_color,
      venue: item.venue,
      match_price: item.match_price,
      date: item.date,
      match_no: item.match_no,
      season_year: item.season_year,
      winner_team: item.winner_team,
      countdownTime: item.countdownDateTime,
      predicted_team: item.predicted_team,
      predicted_team_color: item.predicted_team_color,
      match_status: item.match_status
    }));

    res.send(formattedResult);
  });
});

//  get one matches
router.get("/prediction/:id", verifyRoleOrToken(['admin', 'user']), (req, res) => {
  const id = req.params.id;
  db.query(`SELECT m.id, team_1.full_name as team_1, team_1.id as team_1_id, team_1.icon as team_1_icon, team_2.full_name as team_2, team_2.id as team_2_id, team_2.icon as team_2_icon,  m.tournament_id, m.venue, m.date, m.match_no, m.season_year, m.winner_team FROM matches m left join teams team_1 on team_1.id = m.team_1 left join teams team_2 on team_2.id = m.team_2 WHERE m.id = ${id};`, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  }
  );
});

//  get one matches
router.get("/:id", verifyRoleOrToken(['admin', 'user']), (req, res) => {
  const id = req.params.id;
  db.query(`SELECT * FROM matches WHERE id = ${id}`, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  }
  );
});

// creating new matches
router.post('/add-match', verifyRoleOrToken(['admin']), (req, res) => {
  const updateData = req.body;
  db.query(`INSERT INTO matches(date, team_1, team_2, tournament_id, venue, match_price, match_no, season_year) VALUES('${updateData.date}', '${updateData.team_1}', '${updateData.team_2}', ${updateData.tournament_id}, '${updateData.venue}', ${updateData.match_price}, '${updateData.match_no}', '${updateData.season_year}')`, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  }
  );
})

// edit matches
router.put('/:id', verifyRoleOrToken(['admin']), (req, res) => {
  const id = req.params.id;
  const updateData = req.body;

  // Check if any user has predicted the match
  const predictionCheckQuery = `SELECT COUNT(*) AS predictionCount FROM prediction WHERE match_id = ${id}`;

  db.query(predictionCheckQuery, (predictionErr, predictionResult) => {
    if (predictionErr) {
      console.error(predictionErr);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const predictionCount = predictionResult[0].predictionCount;

    // If any user has predicted the match, do not execute the update query
    if (predictionCount > 0) {
      return res.status(400).json({ error: 'Match cannot be updated as it has predictions' });
    }

    // If no user has predicted the match, execute the update query
    const sql = `UPDATE matches SET team_1 = '${updateData.team_1}', team_2 = '${updateData.team_2}', tournament_id = ${updateData.tournament_id}, venue = '${updateData.venue}', match_price = ${updateData.match_price}, match_no = '${updateData.match_no}', season_year = '${updateData.season_year}' WHERE id = ${id}`;

    db.query(sql, (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        res.status(200).json({ message: 'Match updated successfully' });
      }
    });
  });
});

// Add winner team
router.put('/winner-team/:id/:teamId', verifyRoleOrToken(['admin']), (req, res) => {
  const id = req.params.id;
  const teamId = req.params.teamId;

  // Check if the match date is in the past
  const checkDateSql = `SELECT date FROM matches WHERE id = ${id}`;
  db.query(checkDateSql, (dateErr, dateResult) => {
    if (dateErr) {
      console.error(dateErr);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const matchDate = dateResult[0].date;
    const currentDate = new Date();
    if (new Date(matchDate) < currentDate) {
      // Proceed with updating the winner team
      const updateSql = `UPDATE matches SET winner_team = '${teamId}' WHERE id = ${id}`;
      db.query(updateSql, (updateErr, updateResult) => {
        if (updateErr) {
          console.error(updateErr);
          return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.status(200).json({ message: 'Added winning team successfully' });
      });
    } else {
      res.status(400).json({ error: "After finish the match then you can add winner team." });
    }
  });
});

// delete a match
router.delete('/:id', verifyRoleOrToken(['admin']), (req, res) => {
  const id = req.params.id;

  // Check if any user has predicted the match
  const predictionCheckQuery = `SELECT COUNT(*) AS predictionCount FROM prediction WHERE match_id = ${id}`;

  db.query(predictionCheckQuery, (predictionErr, predictionResult) => {
    if (predictionErr) {
      console.error(predictionErr);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const predictionCount = predictionResult[0].predictionCount;

    // If any user has predicted the match, do not execute the delete operation
    if (predictionCount > 0) {
      return res.status(400).json({ error: 'Match cannot be deleted as it has predictions' });
    }

    // If no user has predicted the match, execute the delete operation
    db.query(`DELETE FROM matches WHERE id = ${id}`, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      res.send(result);
    });
  });
});


module.exports = router;
