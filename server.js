const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/db.config');
const jwt = require('jsonwebtoken');

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
app.use(express.json());

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const tokenWithBearer = req.headers['authorization'];
  const token = tokenWithBearer.substring(7);

  if (!token) {
    return res.status(401).json({ message: 'Token not provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      console.log(err)
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Invalid token' });
      } else {
        return res.status(401).json({ message: 'Token expired' });
      }
    }

    req.user = decoded;
    next();
  });
};

// Apply token verification middleware to protected routes
app.use("/api/user", verifyToken, userRoutes);
app.use("/api/team", verifyToken, teamRoutes);
app.use("/api/match", verifyToken, matchRoutes);
app.use("/api/prediction", verifyToken, predictionRoutes);
app.use("/api/prediction-analysis", verifyToken, predictionAnalysisRoute);
app.use("/api/player-leaderboard", verifyToken, playerLeaderboardRoute);

// Generating JWT
app.post("/api/login", (req, res) => {
  const loginData = req.body;
  db.query(`SELECT id, first_name as firstName, last_name as lastName, role FROM users WHERE email = '${loginData.email}' AND password = '${loginData.password}';`, (err, result) => {
    const userData = result[0];
    if (userData) {
      let data = {
        "id": userData.id,
        "firstName": userData.firstName,
        "lastName": userData.lastName,
        "role": userData.role,
      }
      const token = jwt.sign(data, process.env.JWT_SECRET_KEY, { expiresIn: 1800 });
      res.json({ token });
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

// Change password
app.post("/api/change-password", verifyToken, (req, res) => {
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


app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
