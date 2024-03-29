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

// edit prediction
router.put('/:team_id/:predictionId/:matchId', (req, res) => {
  const team_id = req.params.team_id;
  const predictionId = req.params.predictionId;
  const matchId = req.params.matchId;

  db.query(`select CAST(date as DATETIME) > now() as canUpdate from matches where id=${matchId};`, (err, result) => {
    if (result[0].canUpdate === 1) {
      db.query(`UPDATE prediction SET team_id=${team_id} WHERE id=${predictionId}`, (err, result) => {
        if (err) {
          console.error(err)
        }
        res.send(result)
      });
    } else {
      console.error(err);
      res.status(403).send('Prediction time is over');
    }
  });
})

// add prediction
router.post('/add-prediction', (req, res) => {
  const updateData = req.body;
  db.query(`select CAST(date as DATETIME) > now() as canUpdate from matches where id=${updateData.match_id};`, (err, result) => {
    if (result[0].canUpdate === 1) {
      db.query(`INSERT INTO prediction(match_id, user_id, team_id) VALUES('${updateData.match_id}', '${updateData.user_id}', '${updateData.team_id}')`, (err, result) => {
        if (err) {
          console.error(err)
        }
        res.send(result)
      });
    } else {
      console.error(err);
      res.status(403).send('You are miss the Prediction match.');
    }
  });
})

module.exports = router;