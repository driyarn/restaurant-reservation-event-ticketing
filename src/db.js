const mysql = require('mysql2/promise');
function createPool(env=process.env) {
 return mysql.createPool({host:env.DB_HOST||'127.0.0.1',port:Number(env.DB_PORT||3306),user:env.DB_USER||'restaurant_app',password:env.DB_PASSWORD,database:env.DB_NAME||'restaurant_reservation',waitForConnections:true,connectionLimit:10,timezone:'+08:00',dateStrings:true,multipleStatements:false});
}
module.exports={createPool};
