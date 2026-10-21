const {test}=require('node:test');
const assert=require('node:assert/strict');
const {initials,allocateCode}=require('../src/reservations');
test('initials come from customer name',()=>{assert.equal(initials('John Doe'),'JD');assert.equal(initials('Mary Jane'),'MJ')});
test('new codes use global next_number independent of initials',async()=>{
 const queries=[];
 const conn={execute:async(sql,args)=>{
  queries.push(sql);
  if(sql.includes('FROM reservation_code_lock'))return [[{id:1}]];
  if(sql.includes('FROM reservation_released_numbers'))return [[]];
  if(sql.includes('SELECT next_number'))return [[{next_number:2}]];
  return [{affectedRows:1}];
 }};
 assert.equal(await allocateCode(conn,'Mary Jane'),'MJ-002');
 assert.ok(queries.some(sql=>sql.includes('UPDATE reservation_code_state')));
});
test('most recently cancelled number is reused across names',async()=>{
 const queries=[];
 const conn={execute:async(sql,args)=>{
  queries.push({sql,args});
  if(sql.includes('FROM reservation_code_lock'))return [[{id:1}]];
  if(sql.includes('FROM reservation_released_numbers'))return [[{release_id:5,sequence_number:1}]];
  return [{affectedRows:1}];
 }};
 assert.equal(await allocateCode(conn,'Edgardo Jorge'),'EJ-001');
 assert.ok(queries.some(x=>x.sql.includes('DELETE FROM reservation_released_numbers')&&x.args[0]===5));
 assert.ok(!queries.some(x=>x.sql.includes('UPDATE reservation_code_state')));
});
