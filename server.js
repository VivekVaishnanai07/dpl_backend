const express = require('express');
const cors = require('cors')
const userRoutes = require('./routes/userRoutes');
const teamRoutes = require('./routes/teamRoutes');
const matchRoutes = require('./routes/matchRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const statusRoute = require('./routes/statusRoute');
const playerLeaderboardRoute = require('./routes/player-leaderboard');

const app = express();

const PORT = 3300;
app.use(cors());
app.use(express.json())


app.use("/api/user", userRoutes);

app.use("/api/team", teamRoutes)

app.use("/api/match", matchRoutes)

app.use("/api/prediction", predictionRoutes)

app.use("/api/status", statusRoute)

app.use("/api/player-leaderboard", playerLeaderboardRoute)

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`)
})