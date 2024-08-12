const mysql = require('mysql2')

const db = mysql.createConnection({
  host: "bxfyzxawyspkusfujgy1-mysql.services.clever-cloud.com",
  user: "u6i9cjns8adyuu7r",
  password: "f1nlUJTkJ5bIbpzZXLaE",
  database: "bxfyzxawyspkusfujgy1"
})

module.exports = db;
