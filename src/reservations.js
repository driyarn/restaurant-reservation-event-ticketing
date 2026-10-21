const {reservationSchema,idSchema,formatIssues}=require('./validation');
const fields='id,display_code,customer_name,email,phone,table_id,party_size,reserved_at,duration_minutes,status,notes,created_at,updated_at';
const toDB=d=>({...d,email:d.email.trim().toLowerCase(),reserved_at:d.reserved_at.replace('T',' ')+':00'});
const duplicateEmailError={error:'This email is already used by another reservation. Please use a different email address.'};
const isDuplicateEmail=e=>e.code==='ER_DUP_ENTRY'&&(String(e.sqlMessage||'').includes('uq_reservations_email')||String(e.sqlMessage||'').includes('email'));
function initials(name){const parts=name.trim().split(/\s+/);return (parts[0][0]+parts[parts.length-1][0]).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z]/g,'X').slice(0,2)}
async function allocateCode(conn,name){
 await conn.execute('SELECT id FROM reservation_code_lock WHERE id=1 FOR UPDATE');
 const [released]=await conn.execute('SELECT release_id,sequence_number FROM reservation_released_numbers ORDER BY release_id DESC LIMIT 1');
 let n;
 if(released.length){
   n=Number(released[0].sequence_number);
   await conn.execute('DELETE FROM reservation_released_numbers WHERE release_id=?',[released[0].release_id]);
 }else{
   const [[state]]=await conn.execute('SELECT next_number FROM reservation_code_state WHERE id=1 FOR UPDATE');
   if(!state)throw new Error('Reservation ID state not initialized. Run migration 003 and the code backfill.');
   n=Number(state.next_number);
   await conn.execute('UPDATE reservation_code_state SET next_number=? WHERE id=1',[n+1]);
 }
 return initials(name)+'-'+String(n).padStart(3,'0');
}

function createReservationRouter(express,pool){
 const router=express.Router();
 async function checkAvailability(conn,r,exceptId=0){
   const [[table]]=await conn.execute('SELECT id,seats,active FROM dining_tables WHERE id=?',[r.table_id]);
   if(!table||!table.active)return {code:422,message:'Selected table does not exist or is inactive'};
   if(r.party_size>table.seats)return {code:422,message:'Party size exceeds table capacity'};
   const [conflicts]=await conn.execute("SELECT id FROM reservations WHERE table_id=? AND status='confirmed' AND id<>? AND reserved_at < DATE_ADD(?, INTERVAL ? MINUTE) AND DATE_ADD(reserved_at, INTERVAL duration_minutes MINUTE)>? LIMIT 1",[r.table_id,exceptId,r.reserved_at,r.duration_minutes,r.reserved_at]);
   if(conflicts.length)return {code:409,message:'This table is already reserved during the selected time'};
   return null;
 }
 router.get('/',async(req,res,next)=>{try{const [rows]=await pool.execute(`SELECT ${fields} FROM reservations ORDER BY reserved_at DESC LIMIT 100`);res.json({data:rows})}catch(e){next(e)}});
 router.get('/:id',async(req,res,next)=>{const id=idSchema.safeParse(req.params.id);if(!id.success)return res.status(400).json({error:'Invalid reservation ID'});try{const [rows]=await pool.execute(`SELECT ${fields} FROM reservations WHERE id=?`,[id.data]);if(!rows.length)return res.status(404).json({error:'Reservation not found'});res.json({data:rows[0]})}catch(e){next(e)}});
 router.post('/',async(req,res,next)=>{const p=reservationSchema.safeParse(req.body);if(!p.success)return res.status(400).json({error:'Validation failed',details:formatIssues(p.error)});const r=toDB(p.data);const conn=await pool.getConnection().catch(next);if(!conn)return;try{await conn.beginTransaction();await conn.execute('SELECT id FROM dining_tables WHERE id=? FOR UPDATE',[r.table_id]);const conflict=await checkAvailability(conn,r);if(conflict){await conn.rollback();return res.status(conflict.code).json({error:conflict.message})}const [[duplicate]]=await conn.execute('SELECT id FROM reservations WHERE LOWER(email)=? LIMIT 1',[r.email]);if(duplicate){await conn.rollback();return res.status(409).json(duplicateEmailError)}const displayCode=await allocateCode(conn,r.customer_name);const [result]=await conn.execute('INSERT INTO reservations (display_code,customer_name,email,phone,table_id,party_size,reserved_at,duration_minutes,notes) VALUES (?,?,?,?,?,?,?,?,?)',[displayCode,r.customer_name,r.email,r.phone,r.table_id,r.party_size,r.reserved_at,r.duration_minutes,r.notes??null]);await conn.commit();res.status(201).json({message:'Reservation created',id:result.insertId,display_code:displayCode})}catch(e){await conn.rollback();if(isDuplicateEmail(e))return res.status(409).json(duplicateEmailError);next(e)}finally{conn.release()}});
 router.put('/:id',async(req,res,next)=>{const id=idSchema.safeParse(req.params.id);if(!id.success)return res.status(400).json({error:'Invalid reservation ID'});const p=reservationSchema.safeParse(req.body);if(!p.success)return res.status(400).json({error:'Validation failed',details:formatIssues(p.error)});const r=toDB(p.data);const conn=await pool.getConnection().catch(next);if(!conn)return;try{await conn.beginTransaction();await conn.execute('SELECT id FROM dining_tables WHERE id=? FOR UPDATE',[r.table_id]);const [old]=await conn.execute('SELECT id,status FROM reservations WHERE id=? FOR UPDATE',[id.data]);if(!old.length){await conn.rollback();return res.status(404).json({error:'Reservation not found'})}if(old[0].status==='cancelled'){await conn.rollback();return res.status(409).json({error:'Cancelled reservations cannot be edited'})}const conflict=await checkAvailability(conn,r,id.data);if(conflict){await conn.rollback();return res.status(conflict.code).json({error:conflict.message})}const [[duplicate]]=await conn.execute('SELECT id FROM reservations WHERE LOWER(email)=? AND id<>? LIMIT 1',[r.email,id.data]);if(duplicate){await conn.rollback();return res.status(409).json(duplicateEmailError)}await conn.execute('UPDATE reservations SET customer_name=?,email=?,phone=?,table_id=?,party_size=?,reserved_at=?,duration_minutes=?,notes=? WHERE id=?',[r.customer_name,r.email,r.phone,r.table_id,r.party_size,r.reserved_at,r.duration_minutes,r.notes??null,id.data]);await conn.commit();res.json({message:'Reservation updated',id:id.data})}catch(e){await conn.rollback();if(isDuplicateEmail(e))return res.status(409).json(duplicateEmailError);next(e)}finally{conn.release()}});
 router.delete('/:id',async(req,res,next)=>{const id=idSchema.safeParse(req.params.id);if(!id.success)return res.status(400).json({error:'Invalid reservation ID'});const conn=await pool.getConnection().catch(next);if(!conn)return;try{await conn.beginTransaction();await conn.execute('SELECT id FROM reservation_code_lock WHERE id=1 FOR UPDATE');const [records]=await conn.execute("SELECT display_code FROM reservations WHERE id=? AND status='confirmed' FOR UPDATE",[id.data]);if(!records.length){await conn.rollback();return res.status(404).json({error:'Active reservation not found'})}const oldCode=records[0].display_code;const [result]=await conn.execute("UPDATE reservations SET status='cancelled',display_code=NULL WHERE id=? AND status='confirmed'",[id.data]);if(oldCode){const n=Number(oldCode.slice(oldCode.lastIndexOf('-')+1));await conn.execute('INSERT INTO reservation_released_numbers(sequence_number) VALUES(?)',[n])}if(!result.affectedRows){await conn.rollback();return res.status(404).json({error:'Active reservation not found'})}await conn.commit();res.json({message:'Reservation cancelled and display code released',id:id.data})}catch(e){await conn.rollback();next(e)}finally{conn.release()}});
 return router;
}
module.exports={createReservationRouter,initials,allocateCode};
