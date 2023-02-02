const mysql = require("mysql2");

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "Heraxos_2012",
    database: "autocomplex2",
}).promise();

module.exports = pool;