const express = require('express');
const db = require('../config/db.config');
const verifyRoleOrToken = require('../middlewares/verifyRoleOrToken');

const router = express.Router();

// get group_details list
router.get("/user-groups/:id", verifyRoleOrToken(['admin', 'user']), (req, res) => {
  const id = req.params.id;
  db.query(`SELECT DISTINCT gd.* 
     FROM group_details gd 
     INNER JOIN groups_tournaments gt ON gd.id = gt.group_id 
     LEFT JOIN groups_users gu ON gt.group_id = gu.group_id 
     WHERE gu.user_id = ${id} OR ${id} IS NULL;`, (err, result) => {
    if (err) {
      console.error(err)
    }
    res.send(result)
  }
  );
});

//  get one group
router.get('/:id', verifyRoleOrToken(['admin']), (req, res) => {
  const groupId = req.params.id;

  // Fetch group details
  db.query('SELECT * FROM group_details WHERE id = ?', [groupId], (err, groupResult) => {
    if (err) {
      console.error('Error fetching group details:', err);
      return res.status(500).send({ error: 'Failed to fetch group details' });
    }

    if (groupResult.length === 0) {
      return res.status(404).send({ error: 'Group not found' });
    }

    const group = groupResult[0];

    // Fetch associated tournaments
    db.query('SELECT * FROM tournaments WHERE id IN (SELECT tournament_id FROM groups_tournaments WHERE group_id = ?)', [groupId], (err, tournamentsResult) => {
      if (err) {
        console.error('Error fetching associated tournaments:', err);
        return res.status(500).send({ error: 'Failed to fetch associated tournaments' });
      }

      // Fetch associated users
      db.query('SELECT * FROM users WHERE id IN (SELECT user_id FROM groups_users WHERE group_id = ?)', [groupId], (err, usersResult) => {
        if (err) {
          console.error('Error fetching associated users:', err);
          return res.status(500).send({ error: 'Failed to fetch associated users' });
        }

        // Format the data
        const formattedData = {
          name: group.name,
          description: group.description,
          tournaments: tournamentsResult.map(tournament => ({
            id: tournament.id,
            name: tournament.name,
            year: tournament.year
          })),
          users: usersResult.map(user => ({
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role
          }))
        };
        res.status(200).send(formattedData);
      });
    });
  });
});


// creating new group
router.post('/add-group', verifyRoleOrToken(['admin']), (req, res) => {
  const { name, description, tournaments, users } = req.body;

  // Insert group details
  db.query('INSERT INTO group_details (name, description) VALUES (?, ?)', [name, description], (err, result) => {
    if (err) {
      console.error('Error inserting group details:', err);
      return res.status(500).send({ error: 'Failed to create group' });
    }

    const groupId = result.insertId;

    // Insert tournaments if provided
    if (tournaments && tournaments.length > 0) {
      const tournamentValues = tournaments.map(tournament => [tournament.id, groupId]);
      db.query('INSERT INTO groups_tournaments (tournament_id, group_id) VALUES ?', [tournamentValues], (err, result) => {
        if (err) {
          console.error('Error inserting tournaments:', err);
          return res.status(500).send({ error: 'Failed to associate tournaments with the group' });
        }
      });
    }

    // Insert users if provided
    if (users && users.length > 0) {
      const userValues = users.map(user => [user.id, groupId]);
      db.query('INSERT INTO groups_users (user_id, group_id) VALUES ?', [userValues], (err, result) => {
        if (err) {
          console.error('Error inserting users:', err);
          return res.status(500).send({ error: 'Failed to associate users with the group' });
        }
      });
    }

    res.status(200).send({ message: 'Group created successfully' });
  });
});


// edit group
router.put('/:id', verifyRoleOrToken(['admin']), (req, res) => {
  const groupId = req.params.id;
  const { name, description, tournaments, users } = req.body;

  // Update group details
  db.query('UPDATE group_details SET name = ?, description = ? WHERE id = ?', [name, description, groupId], (err, result) => {
    if (err) {
      console.error('Error updating group details:', err);
      return res.status(500).send({ error: 'Failed to update group details' });
    }

    // Update associated tournaments
    if (tournaments) {
      // Fetch existing tournament associations
      db.query('SELECT tournament_id FROM groups_tournaments WHERE group_id = ?', [groupId], (err, existingTournaments) => {
        if (err) {
          console.error('Error fetching existing tournament associations:', err);
          return res.status(500).send({ error: 'Failed to update tournaments' });
        }

        const existingTournamentIds = existingTournaments.map(tournament => tournament.tournament_id);
        const newTournamentIds = tournaments.map(tournament => tournament.id);

        // Find tournaments to add (new - existing)
        const tournamentsToAdd = newTournamentIds.filter(id => !existingTournamentIds.includes(id));
        // Find tournaments to remove (existing - new)
        const tournamentsToRemove = existingTournamentIds.filter(id => !newTournamentIds.includes(id));

        // Add new associations
        if (tournamentsToAdd.length > 0) {
          const tournamentValues = tournamentsToAdd.map(id => [id, groupId]);
          db.query('INSERT INTO groups_tournaments (tournament_id, group_id) VALUES ?', [tournamentValues], (err, insertResult) => {
            if (err) {
              console.error('Error adding new tournament associations:', err);
              return res.status(500).send({ error: 'Failed to update tournaments' });
            }
          });
        }

        // Remove old associations
        if (tournamentsToRemove.length > 0) {
          const removeQuery = 'DELETE FROM groups_tournaments WHERE group_id = ? AND tournament_id IN (?)';
          db.query(removeQuery, [groupId, tournamentsToRemove], (err, deleteResult) => {
            if (err) {
              console.error('Error removing old tournament associations:', err);
              return res.status(500).send({ error: 'Failed to update tournaments' });
            }
          });
        }
      });
    }

    // Update associated users
    if (users) {
      // Fetch existing user associations
      db.query('SELECT user_id FROM groups_users WHERE group_id = ?', [groupId], (err, existingUsers) => {
        if (err) {
          console.error('Error fetching existing user associations:', err);
          return res.status(500).send({ error: 'Failed to update users' });
        }

        const existingUserIds = existingUsers.map(user => user.user_id);
        const newUserIds = users.map(user => user.id);

        // Find users to add (new - existing)
        const usersToAdd = newUserIds.filter(id => !existingUserIds.includes(id));
        // Find users to remove (existing - new)
        const usersToRemove = existingUserIds.filter(id => !newUserIds.includes(id));

        // Add new associations
        if (usersToAdd.length > 0) {
          const userValues = usersToAdd.map(id => [id, groupId]);
          db.query('INSERT INTO groups_users (user_id, group_id) VALUES ?', [userValues], (err, insertResult) => {
            if (err) {
              console.error('Error adding new user associations:', err);
              return res.status(500).send({ error: 'Failed to update users' });
            }
          });
        }

        // Remove old associations
        if (usersToRemove.length > 0) {
          const removeQuery = 'DELETE FROM groups_users WHERE group_id = ? AND user_id IN (?)';
          db.query(removeQuery, [groupId, usersToRemove], (err, deleteResult) => {
            if (err) {
              console.error('Error removing old user associations:', err);
              return res.status(500).send({ error: 'Failed to update users' });
            }
          });
        }
      });
    }

    res.status(200).send({ message: 'Group updated successfully' });
  });
});


// delete a group
router.delete('/:id', verifyRoleOrToken(['admin']), (req, res) => {
  const groupId = req.params.id;

  // Delete associated tournaments
  db.query('DELETE FROM groups_tournaments WHERE group_id = ?', [groupId], (err, tournamentResult) => {
    if (err) {
      console.error('Error deleting associated tournaments:', err);
      return res.status(500).send({ error: 'Failed to delete associated tournaments' });
    }

    // Delete associated users
    db.query('DELETE FROM groups_users WHERE group_id = ?', [groupId], (err, userResult) => {
      if (err) {
        console.error('Error deleting associated users:', err);
        return res.status(500).send({ error: 'Failed to delete associated users' });
      }

      // Delete group details
      db.query('DELETE FROM group_details WHERE id = ?', [groupId], (err, groupResult) => {
        if (err) {
          console.error('Error deleting group details:', err);
          return res.status(500).send({ error: 'Failed to delete group details' });
        }

        res.status(200).send({ message: 'Group and associated data deleted successfully' });
      });
    });
  });
});



module.exports = router;