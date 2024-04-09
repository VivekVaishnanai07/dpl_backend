const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/db.config');
const jwt = require('jsonwebtoken');
const verifyRoleOrToken = require('./middlewares/verifyRoleOrToken');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

const userRoutes = require('./routes/userRoutes');
const teamRoutes = require('./routes/teamRoutes');
const matchRoutes = require('./routes/matchRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const predictionAnalysisRoute = require('./routes/predictionAnalysisRoute');
const playerLeaderboardRoute = require('./routes/player-leaderboard');

const app = express();
dotenv.config();

const PORT = process.env.PORT || 3300;
app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));
app.use(cookieParser());

const activeSessions = {};

// Apply token verification middleware to protected routes
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
    if (activeSessions[userData.id]) {
      return res.status(403).json({ message: 'User already logged in' });
    }
    if (userData) {
      let data = {
        "id": userData.id,
        "firstName": userData.firstName,
        "lastName": userData.lastName,
        "role": userData.role,
      }
      const sessionID = crypto.randomBytes(20).toString('hex');
      const token = jwt.sign(data, process.env.JWT_SECRET_KEY, { expiresIn: 1800 });
      activeSessions[userData.id] = sessionID; // Store the session ID as active for this user
      res.cookie('token', token, { httpOnly: true });
      res.cookie('sessionID', sessionID, { httpOnly: true });
      res.send({ token, sessionID });
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

// Logout
app.post("/api/logout", (req, res) => {
  const sessionID = req.body.sessionID;
  const userId = req.body.userId; // Implement a function to extract user ID from token
  if (activeSessions[userId] === sessionID) {
    delete activeSessions[userId];
  }
  res.clearCookie('token');
  res.clearCookie('sessionID');
  res.json({ message: 'Logged out successfully' });
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

app.use((req, res, next) => {
  const sessionID = req.cookies.sessionID;
  const token = req.cookies.token;
  if (!sessionID || !token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const userId = getUserIdFromToken(token); // Implement a function to extract user ID from token
  if (activeSessions[userId] !== sessionID) {
    return res.status(401).json({ message: 'Session expired or invalid' });
  }
  next();
});


app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});