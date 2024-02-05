const express = require('express');
const db = require('../config/db.config');

const router = express.Router();

// get prediction
router.get('/:user_id/:match_id', (req, res) => {
  const user_id = req.params.user_id;
  const match_id = req.params.match_id;
  db.query(`SELECT * FROM prediction where user_id = ${user_id} and match_id = ${match_id}`, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  }
  );
})

// add prediction
router.put('/:team_id/:id', (req, res) => {
  const team_id = req.params.team_id;
  const id = req.params.id;
  db.query(`UPDATE prediction SET team_id=${team_id} WHERE id=${id}`, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  }
  );
})

// edit prediction
router.post('/add-prediction', (req, res) => {
  const updateData = req.body;
  db.query(`INSERT INTO prediction(match_id, user_id, team_id) VALUES('${updateData.match_id}', '${updateData.user_id}', '${updateData.team_id}')`, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  }
  );
})

module.exports = router;