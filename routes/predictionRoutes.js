const express = require('express');
const db = require('../config/db.config');

module.exports = (io) => {
  const router = express.Router();

  // get prediction
  router.post('/:userId/:matchId', (req, res) => {
    const userId = req.params.userId;
    const matchId = req.params.matchId;
    const updateData = req.body;
    db.query(`SELECT * FROM prediction WHERE user_id = ${userId} AND match_id = ${matchId} AND tournament_id = ${updateData.tournamentId} AND group_id = ${updateData.groupId};`, (err, result) => {
      if (err) {
        console.error(err)
      }
      res.send(result)
    }
    );
  })

  // edit prediction
  router.put('/:teamId/:predictionId/:matchId', (req, res) => {
    const teamId = req.params.teamId;
    const predictionId = req.params.predictionId;
    const matchId = req.params.matchId;
    const updateData = req.body;
    const { io } = req;
    db.query(`select CAST(date as DATETIME) > now() as canUpdate from matches where id=${matchId};`, (err, result) => {
      if (result[0].canUpdate === 1) {
        db.query(`UPDATE prediction SET team_id=${teamId} WHERE id=${predictionId} AND tournament_id = ${updateData.tournamentId} AND group_id = ${updateData.groupId};`, (err, result) => {
          if (err) {
            console.error(err)
          }
          io.emit("prediction_updated", { matchId, groupId: updateData.groupId, tournamentId: updateData.tournamentId });
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
    const { io } = req;
    db.query(`select CAST(date as DATETIME) > now() as canUpdate from matches where id=${updateData.matchId};`, (err, result) => {
      if (result[0].canUpdate === 1) {
        db.query(`INSERT INTO prediction(match_id, user_id, team_id, tournament_id, group_id) VALUES('${updateData.matchId}', '${updateData.userId}', '${updateData.teamId}', ${updateData.tournamentId}, ${updateData.groupId})`, (err, result) => {
          if (err) {
            console.error(err)
          }
          io.emit("prediction_added", { matchId: updateData.matchId, groupId: updateData.groupId, tournamentId: updateData.tournamentId });
          res.send(result)
        });
      } else {
        console.error(err);
        res.status(403).send('You are miss the Prediction match.');
      }
    });
  })

  // get match prediction user
  router.post('/:matchId', (req, res) => {
    const matchId = req.params.matchId;
    const updateData = req.body;
    db.query(`SELECT u.first_name, u.last_name, t.id AS predicted_team_id
    FROM prediction p
    JOIN users u ON p.user_id = u.id
    JOIN teams t ON p.team_id = t.id
    WHERE p.match_id = ${matchId} AND p.group_id = ${updateData.groupId} AND p.tournament_id = ${updateData.tournamentId};`, (err, result) => {
      if (err) {
        console.error(err)
      }
      res.send(result)
    });
  })

  return router;
};