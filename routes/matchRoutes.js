const express = require('express');
const db = require('../config/db.config');

const router = express.Router();

// get matches list
router.get("/", (req, res) => {
  db.query("SELECT \
        m.id, \
        team_1.full_name AS team_1, \
        team_1.icon AS team_1_icon, \
        team_2.full_name AS team_2, \
        team_2.icon AS team_2_icon, \
        m.venue, \
        DATE_FORMAT(m.date, '%e %b, %Y %l:%i %p') AS formatted_date, \
        m.match_no, \
        m.season_year, \
        team_3.full_name AS winner_team, \
        IF(DATEDIFF(m.date, CURRENT_DATE) = 0, \
            TIME_FORMAT(TIMEDIFF(m.date, CURRENT_TIMESTAMP), '%H:%i'), \
            CONCAT(DATEDIFF(m.date, CURRENT_DATE))) AS countdownTime \
        FROM \
        matches m \
        INNER JOIN \
        teams team_1 ON team_1.id = m.team_1 \
        INNER JOIN \
        teams team_2 ON team_2.id = m.team_2 \
        LEFT JOIN \
        teams team_3 ON team_3.id = m.winner_team;", (err, result) => {
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
      team_2: item.team_2,
      team_2_icon: item.team_2_icon,
      venue: item.venue,
      date: item.formatted_date, // Use formatted date
      match_no: item.match_no,
      season_year: item.season_year,
      winner_team: item.winner_team,
      countdownTime: item.countdownTime // This field is already formatted
    }));

    res.send(formattedResult);
  });
});

// dashboard matches list
router.get("/dashboard/:id", (req, res) => {
  const id = req.params.id;
  db.query(`SELECT \
              m.id AS match_id, \
              m.team_1, \
              team_1.full_name AS team_1_name, \
              t1.icon AS team_1_icon, \
              m.team_2, \
              team_2.full_name AS team_2_name, \
              t2.icon AS team_2_icon, \
              m.venue, \
              m.date, \
              m.match_no, \
              m.season_year, \
              team_3.full_name AS winner_team, \
              IF(DATEDIFF(m.date, CURRENT_DATE) = 0, \
                  TIME_FORMAT(TIMEDIFF(m.date, CURRENT_TIMESTAMP), '%H:%i'), \
                  CONCAT(DATEDIFF(m.date, CURRENT_DATE))) AS countdownTime, \
              pt.full_name AS predicted_team_name \
            FROM \
              matches m \
            LEFT JOIN  \
              prediction p ON m.id = p.match_id AND p.user_id = ${id} \
            LEFT JOIN  \
              teams team_1 ON m.team_1 = team_1.id \
            LEFT JOIN  \
              teams team_2 ON m.team_2 = team_2.id \
            LEFT JOIN  \
              teams team_3 ON team_3.id = m.winner_team \
            LEFT JOIN \
              teams pt ON p.team_id = pt.id;`, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("An error occurred while fetching data from the database.");
      return;
    }

    // Format the result here before sending the response
    const formattedResult = result.map(item => ({
      match_id: item.match_id,
      team_1: {
        name: item.team_1_name,
        icon: item.team_1_icon
      },
      team_2: {
        name: item.team_2_name,
        icon: item.team_2_icon
      },
      venue: item.venue,
      date: item.date,
      match_no: item.match_no,
      season_year: item.season_year,
      winner_team: item.winner_team,
      countdownTime: item.countdownTime,
      predicted_team_name: item.predicted_team_name
    }));

    res.send(formattedResult);
  });
});


//  get one matches
router.get("/prediction/:id", (req, res) => {
  const id = req.params.id;
  db.query(`SELECT m.id,team_1.full_name as team_1,team_1.id as team_1_id,team_1.icon as team_1_icon,team_2.full_name as team_2,team_2.id as team_2_id,team_2.icon as team_2_icon,m.venue,m.date,m.match_no,m.season_year,m.winner_team FROM matches m left join teams team_1 on team_1.id = m.team_1 left join teams team_2 on team_2.id = m.team_2 WHERE m.id =${id};`, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  }
  );
});

//  get one matches
router.get("/:id", (req, res) => {
  const id = req.params.id;
  db.query("SELECT * FROM matches WHERE id = ?", id, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  }
  );
});

// filter match season year
router.get("/filter/:year", (req, res) => {
  const season_year = req.params.year;
  db.query(`SELECT * FROM matches WHERE season_year = ${season_year}`, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  })
})

// creating new matches
router.post('/add-match', (req, res) => {
  const updateData = req.body;
  db.query(`INSERT INTO matches (date,team_1,team_2,venue,match_no,season_year) VALUES ('${updateData.date}','${updateData.team_1}','${updateData.team_2}','${updateData.venue}','${updateData.match_no}','${updateData.season_year}')`, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  }
  );
})

// edit matches
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const updateData = req.body;
  const sql = `UPDATE matches SET date = '${updateData.date}',team_1 = '${updateData.team_1}',team_2 = '${updateData.team_2}' ,venue = '${updateData.venue}' ,match_no = '${updateData.match_no}',season_year = '${updateData.season_year}' WHERE id = ${id}`;
  db.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json({ message: 'Match updated successfully' });
    }
  });
});

// add winner team
router.put('/winner-team/:id/:teamId', (req, res) => {
  const id = req.params.id;
  const teamId = req.params.teamId;
  const sql = `UPDATE matches SET winner_team = '${teamId}' WHERE id = ${id}`;
  db.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json({ message: 'Match updated successfully' });
    }
  });
});

// delete a match
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM matches WHERE id= ?", id, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  })
})

module.exports = router;
