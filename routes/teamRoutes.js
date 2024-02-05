const express = require('express');
const db = require('../config/db.config');

const router = express.Router();

// get teams list
router.get("/", (req, res) => {
  db.query("SELECT * FROM teams", (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  }
  );
});

//  get one teams
router.get("/:id", (req, res) => {
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
router.post('/add-team', (req, res) => {
  const updateData = req.body;
  db.query(`INSERT INTO teams (full_name,short_name,icon) VALUES ('${updateData.full_name}','${updateData.short_name}','${updateData.icon}')`, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  }
  );
})

// edit teams
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const updateData = req.body;
  const sql = `UPDATE teams SET full_name = '${updateData.full_name}',short_name = '${updateData.short_name}',icon = '${updateData.icon}' WHERE id = ${id}`;
  db.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json({ message: 'Match updated successfully' });
    }
  });
});

// delete a team
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM teams WHERE id= ?", id, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  })
})

module.exports = router;