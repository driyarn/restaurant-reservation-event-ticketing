const {test}=require('node:test');const assert=require('node:assert/strict');const {reservationSchema,registrationSchema}=require('../src/validation');
const valid={customer_name:'Maria Santos',email:'maria@example.com',phone:'+639171234567',table_id:2,party_size:3,reserved_at:'2027-12-18T19:00',duration_minutes:90,notes:''};
test('valid reservation accepted',()=>assert.equal(reservationSchema.safeParse(valid).success,true));
test('invalid email rejected',()=>assert.equal(reservationSchema.safeParse({...valid,email:'bad'}).success,false));
test('invalid party size rejected',()=>assert.equal(reservationSchema.safeParse({...valid,party_size:0}).success,false));
test('past reservations rejected',()=>assert.equal(reservationSchema.safeParse({...valid,reserved_at:'2020-01-01T12:00'}).success,false));
test('unexpected fields rejected',()=>assert.equal(reservationSchema.safeParse({...valid,is_admin:true}).success,false));
test('invalid event ticket quantity rejected',()=>assert.equal(registrationSchema.safeParse({event_id:1,guest_name:'Maria Santos',guest_email:'maria@example.com',quantity:11}).success,false));

for(const phone of ['09171234567','639171234567','+63917123456','+6391712345678','+638171234567','+63917abc4567','+63 9171234567','+1 (917) 123-4567','+639','+6391712-4567']){
 test('reject invalid PH number '+phone,()=>assert.equal(reservationSchema.safeParse({...valid,phone}).success,false));
}
test('accept valid Philippine mobile number',()=>assert.equal(reservationSchema.safeParse({...valid,phone:'+639171234567'}).success,true));
