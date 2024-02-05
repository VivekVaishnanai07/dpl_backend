const mysql = require('mysql2')

const db = mysql.createConnection({
host: "localhost",
user: "root",
password: "root",
database:"dpl_11" 
})

module.exports = db;
