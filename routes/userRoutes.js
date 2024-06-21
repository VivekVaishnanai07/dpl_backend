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

// Get all users
router.get("/user-list", verifyRoleOrToken(['admin', 'user']), (req, res) => {
  db.query("SELECT id, email, first_name, last_name, role FROM users", (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
      return;
    }
    res.send(result);
  });
});

// Get one user by id
router.get('/:id', verifyRoleOrToken(['admin', 'user']), (req, res) => {
  const userId = req.params.id;

  // Fetch user details
  db.query('SELECT * FROM users WHERE id = ?', [userId], (err, userResult) => {
    if (err) {
      console.error('Error fetching user details:', err);
      return res.status(500).send({ error: 'Failed to fetch user details' });
    }

    if (userResult.length === 0) {
      return res.status(404).send({ error: 'User not found' });
    }

    const user = userResult[0];

    // Fetch associated groups
    db.query(`SELECT g.id, g.name, g.description FROM group_details g JOIN groups_users gu ON g.id = gu.group_id WHERE gu.user_id = ${userId}`, (err, groupsResult) => {
      if (err) {
        console.error('Error fetching associated groups:', err);
        return res.status(500).send({ error: 'Failed to fetch associated groups' });
      }

      const userData = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        userImg: user.userImg,
        groups: groupsResult
      };

      res.status(200).send(userData);
    });
  });
});


// creating new user
router.post('/add-user', verifyRoleOrToken(['admin']), (req, res) => {
  const userData = req.body;

  // Insert user
  db.query('INSERT INTO users (first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?)', [userData.first_name, userData.last_name, userData.email, 'Test@123', userData.role], (err, userResult) => {
    if (err) {
      console.error('Error creating user:', err);
      return res.status(500).send({ error: 'Failed to create user' });
    }

    // Check if groups_users data is provided
    if (userData.groups && userData.groups.length > 0) {
      const userId = userResult.insertId;
      const values = userData.groups.map((group) => [userId, group.id]);

      // Insert into groups_users table
      db.query('INSERT INTO groups_users (user_id, group_id) VALUES ?', [values], (err, groupsUsersResult) => {
        if (err) {
          console.error('Error inserting into groups_users:', err);
          return res.status(500).send({ error: 'Failed to associate user with groups' });
        }
        res.status(200).send({ message: 'User created and associated with groups successfully' });
      });
    } else {
      // If no groups provided, simply respond with success
      res.status(200).send({ message: 'User created successfully' });
    }
  });
});


// edit user
router.put('/:id', verifyRoleOrToken(['admin']), (req, res) => {
  const userId = req.params.id;
  const userData = req.body;

  // Update user details
  db.query('UPDATE users SET first_name = ?, last_name = ?, email = ?, role = ? WHERE id = ?',
    [userData.first_name, userData.last_name, userData.email, userData.role, userId],
    (err, userResult) => {
      if (err) {
        console.error('Error updating user details:', err);
        return res.status(500).send({ error: 'Failed to update user details' });
      }

      // Check if groups data is provided
      if (userData.groups && userData.groups.length > 0) {
        // Fetch existing groups associated with the user
        db.query('SELECT group_id FROM groups_users WHERE user_id = ?', [userId], (err, existingGroupsResult) => {
          if (err) {
            console.error('Error fetching existing groups:', err);
            return res.status(500).send({ error: 'Failed to fetch existing groups' });
          }

          const existingGroups = existingGroupsResult.map(row => row.group_id);
          const newGroups = userData.groups;

          // Find groups to be removed (present in existing but not in new)
          const groupsToRemove = existingGroups.filter(groupId => !newGroups.includes(groupId));

          // Find groups to be added (present in new but not in existing)
          const groupsToAdd = newGroups.filter(groupId => !existingGroups.includes(groupId));

          // Remove groups to be removed
          if (groupsToRemove.length > 0) {
            db.query('DELETE FROM groups_users WHERE user_id = ? AND group_id IN (?)', [userId, groupsToRemove], (err, removeResult) => {
              if (err) {
                console.error('Error removing groups:', err);
                return res.status(500).send({ error: 'Failed to remove groups' });
              }
            });
          }

          // Add groups to be added
          if (groupsToAdd.length > 0) {
            const values = groupsToAdd.map(group => [userId, group.id]);
            db.query('INSERT INTO groups_users (user_id, group_id) VALUES ?', [values], (err, addResult) => {
              if (err) {
                console.error('Error adding groups:', err);
                return res.status(500).send({ error: 'Failed to add groups' });
              }
            });
          }

          res.status(200).send({ message: 'User details and group associations updated successfully' });
        });
      } else {
        db.query('SELECT * FROM groups_users WHERE user_id = ?', [userId], (err, userGroups) => {
          if (err) {
            console.error('Error fetching user groups:', err);
            return res.status(500).send({ error: 'Failed to fetch user groups' });
          }

          // If user is associated with any groups, delete them
          if (userGroups.length > 0) {
            db.query('DELETE FROM groups_users WHERE user_id = ?', [userId], (deleteErr, deleteResult) => {
              if (deleteErr) {
                console.error('Error removing user groups:', deleteErr);
                return res.status(500).send({ error: 'Failed to remove user groups' });
              }
              res.status(200).send({ message: 'User groups removed successfully' });
            });
          } else {
            // If user is not associated with any groups, send success message
            res.status(200).send({ message: 'User details updated successfully' });
          }
        });
      }
    }
  );
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
  db.query(`DELETE FROM users WHERE id= ${id}`, (err, result) => {
    if (err) {
      return res.status(500).send({ error: 'Failed to delete associated groups users' });
    }
    // Delete associated groups tournaments
    db.query(`DELETE FROM groups_users WHERE user_id = ${id}`, (err, result) => {
      if (err) {
        console.error('Error deleting associated groups users:', err);
        return res.status(500).send({ error: 'Failed to delete associated groups users' });
      }
      res.status(200).send({ message: 'User and associated data deleted successfully' });
    });
  })
})

module.exports = router;