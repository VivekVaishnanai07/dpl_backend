const express = require('express');
const socketIo = require('socket.io');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/db.config');
const jwt = require('jsonwebtoken');
const verifyRoleOrToken = require('./middlewares/verifyRoleOrToken');
const bodyParser = require('body-parser');

const tournamentRoutes = require('./routes/tournamentRoutes');
const groupRoutes = require('./routes/groupRoutes');
const userRoutes = require('./routes/userRoutes');
const teamRoutes = require('./routes/teamRoutes');
const matchRoutes = require('./routes/matchRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const predictionAnalysisRoute = require('./routes/predictionAnalysisRoute');
const playerLeaderboardRoute = require('./routes/playerLeaderboardRoutes');

const app = express();
const server = http.createServer(app);
dotenv.config();

const PORT = process.env.PORT || 3300;
app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));

const io = socketIo(server, {
  cors: {
    origin: 'https://dpl11.vercel.app'
  }
})

// Pass the io instance to the routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Apply token verification middleware to protected routes
app.use("/api/tournament", tournamentRoutes);
app.use("/api/group", groupRoutes);
app.use("/api/user", userRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/prediction", verifyRoleOrToken(['admin', 'user']), predictionRoutes);
app.use("/api/prediction-analysis", verifyRoleOrToken(['admin', 'user']), predictionAnalysisRoute);
app.use("/api/player-leaderboard", verifyRoleOrToken(['admin', 'user']), playerLeaderboardRoute);

// Generating JWT
app.post("/api/login", (req, res) => {
  const loginData = req.body;
  db.query(`SELECT id, first_name as firstName, last_name as lastName, role FROM users WHERE email = '${loginData.email}' AND password = '${loginData.password}';`, (err, result) => {
    const userData = result[0];
    console.log(userData);
    if (userData) {
      if (userData.role === 'admin') {
        // Admin can login regardless of tournaments
        let data = {
          "id": userData.id,
          "firstName": userData.firstName,
          "lastName": userData.lastName,
          "role": userData.role,
        }
        const token = jwt.sign(data, process.env.JWT_SECRET_KEY, { expiresIn: 1800 });
        res.json({ token });
      } else {
        // Check if user has any tournaments
        db.query(`SELECT COUNT(*) AS tournamentCount FROM groups_users WHERE user_id = ${userData.id};`, (tournamentErr, tournamentResult) => {
          if (tournamentErr) {
            console.error(tournamentErr);
            res.status(500).send("Internal Server Error");
            return;
          }

          const tournamentCount = tournamentResult[0].tournamentCount;
          if (tournamentCount > 0) {
            // User has tournaments, generate JWT
            let data = {
              "id": userData.id,
              "firstName": userData.firstName,
              "lastName": userData.lastName,
              "role": userData.role,
            }
            const token = jwt.sign(data, process.env.JWT_SECRET_KEY, { expiresIn: 1800 });
            res.json({ token });
          } else {
            // User doesn't have tournaments, show message
            res.status(403).send("Sorry, you don't have any tournaments assigned.Please contact an admin to assign you a tournament");
          }
        });
      }
    } else {
      res.send('Your Email and Password is incorrect')
    }

    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
      return;
    }
  });
});

// Registration
app.post('/api/register', (req, res) => {
  const {
    firstName, lastName, email, password,
    groupName, groupDescription,
    tournamentName, year, startDate, endDate, tournamentStatus
  } = req.body;

  try {
    // Check if user already exists
    db.query(`SELECT id FROM users WHERE email = '${email}';`, (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
        return;
      }

      if (result.length > 0) {
        // User already exists
        res.status(400).send("User already exists with this email");
        return;
      }

      // Insert new user
      db.query(
        `INSERT INTO users (first_name, last_name, email, password, role) VALUES ('${firstName}', '${lastName}', '${email}', '${password}', 'admin');`,
        (userErr, userResult) => {
          if (userErr) {
            console.error('Error creating user:', userErr);
            return res.status(500).send({ error: 'Failed to create user' });
          }

          const userId = userResult.insertId;

          // Insert new group
          db.query(
            `INSERT INTO group_details (name, description) VALUES ('${groupName}', '${groupDescription}');`,
            (groupErr, groupResult) => {
              if (groupErr) {
                console.error('Error inserting group details:', groupErr);
                return res.status(500).send({ error: 'Failed to create group' });
              }

              const groupId = groupResult.insertId;

              // Link user to group
              db.query(
                `INSERT INTO groups_users (user_id, group_id) VALUES (${userId}, ${groupId});`,
                (groupUserErr) => {
                  if (groupUserErr) {
                    console.error('Error inserting users:', groupUserErr);
                    return res.status(500).send({ error: 'Failed to associate users with the group' });
                  }

                  // Insert new tournament
                  db.query(
                    `INSERT INTO tournaments (name, year, start_date, end_date, status) VALUES ('${tournamentName}', ${year}, '${startDate}', '${endDate}', '${tournamentStatus}');`,
                    (tournamentErr, tournamentResult) => {
                      if (tournamentErr) {
                        console.error('Error inserting tournament details:', tournamentErr);
                        return res.status(500).send({ error: 'Failed to create tournament' });
                      }

                      const tournamentId = tournamentResult.insertId;

                      // Link group to tournament
                      db.query(
                        `INSERT INTO groups_tournaments (tournament_id, group_id) VALUES (${tournamentId}, ${groupId});`,
                        (groupTournamentErr) => {
                          if (groupTournamentErr) {
                            console.error('Error associating groups with tournament:', groupTournamentErr);
                            return res.status(500).send({ error: 'Failed to associate groups with tournament' });
                          }

                          // If everything is successful, send a success message to the admin
                          res.status(200).send("Registration successful. User, group, and tournament created.");
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});


// Change password
app.post("/api/change-password", verifyRoleOrToken(['admin', 'user']), (req, res) => {
  const { userId, oldPassword, newPassword, confirmPassword } = req.body;

  // Check if old password matches
  db.query(`SELECT * FROM users WHERE id = ${userId} AND password = '${oldPassword}';`, (err, result) => {
    if (err) {
      console.error(err);
      return err.status(500).json({ message: 'Internal Server Error' });
    }

    const user = result[0];
    if (!user) {
      return err.status(401).json({ message: 'Invalid old password' });
    }

    // Check if new password and confirm password match
    if (newPassword !== confirmPassword) {
      return err.status(400).json({ message: 'New password and confirm password do not match' });
    }

    // Update password
    db.query(`UPDATE users SET password = '${newPassword}' WHERE id = ${userId};`, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal Server Error' });
      }
      res.json({ message: 'Password updated successfully' });
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});