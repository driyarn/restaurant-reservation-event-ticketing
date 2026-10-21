require('dotenv').config();
const {createPool}=require('../src/db');
const pool=createPool();
function initials(name){const p=name.trim().split(/\s+/);return (p[0][0]+p[p.length-1][0]).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z]/g,'X').slice(0,2)}
(async()=>{
 const c=await pool.getConnection();
 try{
  await c.beginTransaction();
  await c.execute('SELECT id FROM reservation_code_lock WHERE id=1 FOR UPDATE');
  const [rows]=await c.execute("SELECT id,customer_name,display_code FROM reservations WHERE status='confirmed' ORDER BY id FOR UPDATE");
  await c.execute("UPDATE reservations SET display_code=NULL WHERE status='confirmed'");
  await c.execute('DELETE FROM reservation_released_numbers');
  let n=1;
  for(const row of rows){
   const code=initials(row.customer_name)+'-'+String(n).padStart(3,'0');
   await c.execute('UPDATE reservations SET display_code=? WHERE id=?',[code,row.id]);
   console.log('Reservation',row.id,row.display_code||'(none)','=>',code);
   n++;
  }
  await c.execute('UPDATE reservation_code_state SET next_number=? WHERE id=1',[n]);
  await c.commit();
  console.log('Renumbered',rows.length,'active reservations; next number:',n);
 }catch(err){await c.rollback();console.error(err.message);process.exitCode=1}
 finally{c.release();await pool.end()}
})();
