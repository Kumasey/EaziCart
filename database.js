const mysql = require('mysql2');

const dbConnection = mysql.createPool({
    host : 'localhost',
    user : 'root',
    password : 'Bolaji93,',
    database : 'eazicart'
}).promise();



module.exports = dbConnection;