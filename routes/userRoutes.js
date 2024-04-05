const express = require('express');
const db = require('../config/db.config');
const verifyRoleOrToken = require('../middlewares/verifyRoleOrToken');

const router = express.Router();

// Get all users
router.get("/", verifyRoleOrToken(['admin']), (req, res) => {
  db.query("SELECT id, email, first_name, last_name, role, userImg FROM users", (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
      return;
    }
    res.send(result);
  });
});

// Get one user by id
router.get("/:id", verifyRoleOrToken(['admin']), (req, res) => {
  const id = req.params.id;
  db.query("SELECT id, email, first_name, last_name, role, userImg FROM users WHERE id = ?", id, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
      return;
    }
    res.send(result[0]);
  });
});

// creating new user
router.post('/add-user', verifyRoleOrToken(['admin']), (req, res) => {
  const updateData = req.body;
  db.query(`INSERT INTO users (first_name,last_name,email,password,role) VALUES ('${updateData.first_name}','${updateData.last_name}','${updateData.email}','Test@123','${updateData.role}')`, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  }
  );
})

// edit user
router.put('/:id', verifyRoleOrToken(['admin']), (req, res) => {
  const id = req.params.id;
  const updateData = req.body;
  const sql = `UPDATE users SET first_name = '${updateData.first_name}',last_name = '${updateData.last_name}',email = '${updateData.email}',role = '${updateData.role}',userImg = '${updateData.userImg}' WHERE id = ${id}`;
  db.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json({ message: 'Match updated successfully' });
    }
  });
});

// edit user profile
router.put('/profile/:id', verifyRoleOrToken(['admin', 'user']), (req, res) => {
  const id = req.params.id;
  const updateData = req.body;
  const sql = `UPDATE users SET first_name = '${updateData.first_name}',last_name = '${updateData.last_name}',userImg = '${updateData.userImg}' WHERE id = ${id}`;
  db.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(200).json({ message: 'User profile updated successfully' });
    }
  });
});

// delete a user
router.delete('/:id', verifyRoleOrToken(['admin']), (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM users WHERE id= ?", id, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  })
})

module.exports = router;