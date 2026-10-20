require('dotenv').config();
const {createPool}=require('./db');
const {buildApp}=require('./app');
const pool=createPool();
const app=buildApp(pool);
const server=app.listen(Number(process.env.PORT||3000),()=>console.log(`Server running at http://localhost:${process.env.PORT||3000}`));
process.on('SIGTERM',()=>server.close(()=>pool.end()));
