const mysql = require('mysql2')

const db = mysql.createConnection({
host: "dpg-cngnoef109ks7380e0hg-a",
user: "root",
password: "YsBOwaX7tSurCbOcSYrqfOwZARHeQmQU",
database:"dpl_11" 
})

module.exports = db;
