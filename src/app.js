const express=require('express');
const helmet=require('helmet');
const rateLimit=require('express-rate-limit');
const {createReservationRouter}=require('./reservations');
const {registrationSchema,formatIssues}=require('./validation');
const path=require('node:path');
const crypto=require('node:crypto');
function buildApp(pool,{adminKey=process.env.ADMIN_API_KEY}={}){
 const app=express();app.disable('x-powered-by');app.use(helmet({contentSecurityPolicy:false}));app.use(express.json({limit:'16kb'}));app.use('/api',rateLimit({windowMs:60000,limit:100,standardHeaders:'draft-7',legacyHeaders:false}));
 function requireAdmin(req,res,next){const key=req.get('x-admin-key')||'';if(!adminKey||adminKey.length<32)return res.status(503).json({error:'ADMIN_API_KEY is not configured securely'});if(key.length!==adminKey.length||!crypto.timingSafeEqual(Buffer.from(key),Buffer.from(adminKey)))return res.status(401).json({error:'Admin API key required'});next()}
 app.get('/api/health',async(req,res,next)=>{try{await pool.query('SELECT 1');res.json({status:'ok',database:'connected'})}catch(e){next(e)}});
 app.get('/api/tables',async(req,res,next)=>{try{const [data]=await pool.execute('SELECT id,label,seats FROM dining_tables WHERE active=1 ORDER BY seats,id');res.json({data})}catch(e){next(e)}});
 app.get('/api/events',async(req,res,next)=>{try{const [data]=await pool.execute("SELECT e.id,e.title,e.description,e.starts_at,e.venue,e.ticket_capacity,e.ticket_price_centavos,(e.ticket_capacity-COALESCE(SUM(CASE WHEN r.status='reserved' THEN r.quantity ELSE 0 END),0)) AS tickets_left FROM events e LEFT JOIN event_registrations r ON r.event_id=e.id WHERE e.active=1 GROUP BY e.id ORDER BY e.starts_at");res.json({data})}catch(e){next(e)}});
 app.post('/api/event-registrations',async(req,res,next)=>{const p=registrationSchema.safeParse(req.body);if(!p.success)return res.status(400).json({error:'Validation failed',details:formatIssues(p.error)});const conn=await pool.getConnection().catch(next);if(!conn)return;try{await conn.beginTransaction();const [[event]]=await conn.execute('SELECT id,ticket_capacity,starts_at,active FROM events WHERE id=? FOR UPDATE',[p.data.event_id]);if(!event||!event.active){await conn.rollback();return res.status(404).json({error:'Event not found'})}const [[booked]]=await conn.execute("SELECT COALESCE(SUM(quantity),0) AS n FROM event_registrations WHERE event_id=? AND status='reserved'",[p.data.event_id]);if(Number(booked.n)+p.data.quantity>event.ticket_capacity){await conn.rollback();return res.status(409).json({error:'Not enough tickets left'})}const [created]=await conn.execute('INSERT INTO event_registrations (event_id,guest_name,guest_email,quantity) VALUES (?,?,?,?)',[p.data.event_id,p.data.guest_name,p.data.guest_email,p.data.quantity]);await conn.commit();res.status(201).json({id:created.insertId,message:'Tickets reserved — payment not collected'});}catch(e){await conn.rollback();next(e)}finally{conn.release()}});
 app.use('/api/reservations',requireAdmin,createReservationRouter(express,pool));
 app.use(express.static(path.join(__dirname,'../public')));
 app.use((err,req,res,next)=>{console.error('Request failed:',err.code||err.message);res.status(500).json({error:'Internal server error'})});
 return app;
}
module.exports={buildApp};
