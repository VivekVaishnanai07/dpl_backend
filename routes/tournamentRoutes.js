const express = require('express');
const db = require('../config/db.config');
const verifyRoleOrToken = require('../middlewares/verifyRoleOrToken');

const router = express.Router();

// get tournaments list
router.get("/get-tournaments/:id", verifyRoleOrToken(['admin', 'user']), (req, res) => {
  const id = req.params.id;
  db.query(`SELECT 
    t.id,
    t.name,
    t.year,
    t.start_date,
    t.end_date,
    t.status,
    t.tournamentIcon
  FROM
      tournaments t
      INNER JOIN groups_tournaments gt ON t.id = gt.tournament_id
      LEFT JOIN groups_users gu ON gt.group_id = gu.group_id
      LEFT JOIN group_details gd ON gt.group_id = gd.id
  WHERE
      gu.user_id = ${id} OR ${id} IS NULL
  GROUP BY
      t.id, t.name, t.year, t.start_date, t.end_date, t.status;`, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
      return;
    }

    if (result.length === 0) {
      // If the result array is empty, user doesn't have any tournaments
      res.status(404).send("User has no tournaments.");
    } else {
      // User has tournaments, send the result
      res.send(result);
    }
  });
});

// get tournaments list
router.get("/user-tournaments/:id", verifyRoleOrToken(['admin', 'user']), (req, res) => {
  const id = req.params.id;
  db.query(`SELECT 
       t.id,
       t.name,
       t.year,
       t.start_date,
       t.end_date,
       t.status,
       JSON_ARRAYAGG(JSON_OBJECT(
           'id', gd.id, 
           'name', gd.name,
           'description', gd.description
       )) AS group_details
   FROM
       tournaments t
           INNER JOIN
       groups_tournaments gt ON t.id = gt.tournament_id
           LEFT JOIN
       groups_users gu ON gt.group_id = gu.group_id
           LEFT JOIN
       group_details gd ON gt.group_id = gd.id
   WHERE
       gu.user_id = ${id} OR ${id} IS NULL
   GROUP BY
       t.id, t.name, t.year, t.start_date, t.end_date, t.status;
  `, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
      return;
    }

    if (result.length === 0) {
      // If the result array is empty, user doesn't have any tournaments
      res.status(404).send("User has no tournaments.");
    } else {
      // User has tournaments, send the result
      res.send(result);
    }
  });
});

//  get one tournament
router.get("/:id", verifyRoleOrToken(['admin']), (req, res) => {
  const id = req.params.id;
  db.query("SELECT * FROM tournaments WHERE id = ?", id, (err, result) => {
    if (err) {
      console.error('Error fetching tournaments:', err);
      return res.status(500).send({ error: 'Failed to fetch tournaments' });
    }

    if (result.length === 0) {
      return res.status(404).send({ error: 'User not found' });
    }

    const tournament = result[0];
    // Fetch associated groups
    db.query(`SELECT g.id, g.name, g.description FROM group_details g JOIN groups_tournaments gu ON g.id = gu.group_id WHERE gu.tournament_id = ${id}`, (err, groupsResult) => {
      if (err) {
        console.error('Error fetching associated groups:', err);
        return res.status(500).send({ error: 'Failed to fetch associated groups' });
      }

      const tournamentData = {
        id: tournament.id,
        name: tournament.name,
        year: tournament.year,
        start_date: tournament.start_date,
        end_date: tournament.end_date,
        status: tournament.status,
        groups: groupsResult
      };

      res.status(200).send(tournamentData);
    });
  }
  );
});

// creating new tournament
router.post('/add-tournament', verifyRoleOrToken(['admin']), (req, res) => {
  const { name, year, start_date, end_date, status, groups } = req.body;

  // Insert tournament details
  db.query('INSERT INTO tournaments (name, year, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)', [name, year, start_date, end_date, status], (err, result) => {
    if (err) {
      console.error('Error inserting tournament details:', err);
      return res.status(500).send({ error: 'Failed to create tournament' });
    }

    const tournamentId = result.insertId;

    // If groups are provided, associate them with the tournament
    if (groups && groups.length > 0) {
      const groupValues = groups.map(group => [tournamentId, group.id]);
      db.query('INSERT INTO groups_tournaments (tournament_id, group_id) VALUES ?', [groupValues], (err, result) => {
        if (err) {
          console.error('Error associating groups with tournament:', err);
          return res.status(500).send({ error: 'Failed to associate groups with tournament' });
        }
      });
    }

    res.status(200).send({ message: 'Tournament created successfully' });
  });
});

// edit tournament
router.put('/:id', verifyRoleOrToken(['admin']), (req, res) => {
  const id = req.params.id;
  const updateData = req.body;
  db.query(`UPDATE tournaments SET name = '${updateData.name}', year = ${updateData.year}, start_date = "${updateData.start_date}", end_date = "${updateData.end_date}", status = "${updateData.status}"  WHERE id = ${id}`, (err, result) => {
    if (err) {
      console.error('Error updating tournaments:', err);
      return res.status(500).send({ error: 'Failed to update tournaments' });
    }

    if (updateData.groups && updateData.groups.length > 0) {
      // Fetch existing groups associated with the user
      db.query('SELECT group_id FROM groups_tournaments WHERE tournament_id = ?', [id], (err, existingGroupsResult) => {
        if (err) {
          console.error('Error fetching existing groups:', err);
          return res.status(500).send({ error: 'Failed to fetch existing groups' });
        }

        const existingGroups = existingGroupsResult.map(row => row.group_id);
        const newGroups = updateData.groups;

        // Find groups to be removed (present in existing but not in new)
        const groupsToRemove = existingGroups.filter(groupId => !newGroups.includes(groupId));

        // Find groups to be added (present in new but not in existing)
        const groupsToAdd = newGroups.filter(groupId => !existingGroups.includes(groupId));

        // Remove groups to be removed
        if (groupsToRemove.length > 0) {
          db.query('DELETE FROM groups_tournaments WHERE tournament_id = ? AND group_id IN (?)', [id, groupsToRemove], (err, removeResult) => {
            if (err) {
              console.error('Error removing groups:', err);
              return res.status(500).send({ error: 'Failed to remove groups' });
            }
          });
        }

        // Add groups to be added
        if (groupsToAdd.length > 0) {
          const values = groupsToAdd.map(group => [id, group.id]);
          db.query('INSERT INTO groups_tournaments (tournament_id, group_id) VALUES ?', [values], (err, addResult) => {
            if (err) {
              console.error('Error adding groups:', err);
              return res.status(500).send({ error: 'Failed to add groups' });
            }
          });
        }

        res.status(200).send({ message: 'User details and group associations updated successfully' });
      });
    } else {
      // If no groups provided, simply respond with success
      res.status(200).send({ message: 'User details updated successfully' });
    }
  });
});

// delete a tournament
router.delete('/:id', verifyRoleOrToken(['admin']), (req, res) => {
  const id = req.params.id;
  db.query(`DELETE FROM tournaments WHERE id = ${id};`, (err, result) => {
    if (err) {
      return res.status(500).send({ error: 'Failed to delete associated tournaments' });
    }
    // Delete associated groups tournaments
    db.query(`DELETE FROM groups_tournaments WHERE tournament_id = ${id}`, (err, result) => {
      if (err) {
        console.error('Error deleting associated tournaments:', err);
        return res.status(500).send({ error: 'Failed to delete associated tournaments' });
      }
      res.status(200).send({ message: 'Tournaments and associated data deleted successfully' });
    });
  });
});


module.exports = router;