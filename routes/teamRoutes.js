const express = require('express');
const db = require('../config/db.config');
const verifyRoleOrToken = require('../middlewares/verifyRoleOrToken');

const router = express.Router();

// get teams list
router.get("/", verifyRoleOrToken(['admin', 'user']), (req, res) => {
  db.query(`SELECT t.*, 
    GROUP_CONCAT(tw.winner_year) AS winner_years
    FROM teams t
    LEFT JOIN team_winner_year tw ON t.id = tw.team_id
    GROUP BY t.id;`, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  }
  );
});

//  get one teams
router.get("/:id", verifyRoleOrToken(['admin', 'user']), (req, res) => {
  const id = req.params.id;
  db.query("SELECT * FROM teams WHERE id = ?", id, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  }
  );
});

// creating new teams
router.post('/add-team', verifyRoleOrToken(['admin']), (req, res) => {
  const updateData = req.body;
  db.query(`INSERT INTO teams (full_name,short_name,icon,team_color) VALUES ('${updateData.full_name}','${updateData.short_name}','${updateData.icon}', '${updateData.team_color}')`, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  }
  );
})

// edit teams
router.put('/:id', verifyRoleOrToken(['admin']), (req, res) => {
  const id = req.params.id;
  const updateData = req.body;

  // Check if the team is associated with any match
  const matchCheckQuery = `SELECT COUNT(*) AS matchCount FROM matches WHERE team_1 = ${id} OR team_2 = ${id}`;

  db.query(matchCheckQuery, (matchErr, matchResult) => {
    if (matchErr) {
      console.error(matchErr);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const matchCount = matchResult[0].matchCount;

    // If the team is associated with any match
    if (matchCount > 0) {
      // Update team color only
      const sql = `UPDATE teams SET team_color = '${updateData.team_color}' WHERE id = ${id}`;

      db.query(sql, (err, result) => {
        if (err) {
          console.error(err);
          res.status(500).json({ error: 'Internal Server Error' });
        } else {
          res.status(200).json({ message: 'Only the team color has been updated. But the team cannot be edited because it is associated with matches' });
        }
      });
    } else {
      // If the team is not associated with any match, execute the full update query
      const sql = `UPDATE teams SET full_name = '${updateData.full_name}', short_name = '${updateData.short_name}', icon = '${updateData.icon}', team_color = '${updateData.team_color}' WHERE id = ${id}`;

      db.query(sql, (err, result) => {
        if (err) {
          console.error(err);
          res.status(500).json({ error: 'Internal Server Error' });
        } else {
          res.status(200).json({ message: 'Team updated successfully' });
        }
      });
    }
  });
});



// delete a team
router.delete('/:id', verifyRoleOrToken(['admin']), (req, res) => {
  const id = req.params.id;

  // Check if the team is associated with any match
  const matchCheckQuery = `SELECT COUNT(*) AS matchCount FROM matches WHERE team_1 = ${id} OR team_2 = ${id}`;

  db.query(matchCheckQuery, (matchErr, matchResult) => {
    if (matchErr) {
      console.error(matchErr);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const matchCount = matchResult[0].matchCount;

    // If the team is associated with any match, do not execute the delete operation
    if (matchCount > 0) {
      return res.status(400).json({ error: 'Team cannot be deleted as it is associated with matches' });
    }

    // If the team is not associated with any match, execute the delete operation
    db.query(`DELETE FROM teams WHERE id = ${id}`, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      res.send(result);
    });
  });
});


module.exports = router;