const {z}=require('zod');
const reservationSchema=z.object({
 customer_name:z.string().trim().min(3).max(100).refine(name=>{const parts=name.split(/\s+/).filter(Boolean);return parts.length>=2&&parts.every(p=>/^[\p{L}\p{M}][\p{L}\p{M}'’.-]*$/u.test(p));},'Enter both your first name and surname (at least two names).'),
 email:z.string().trim().email().max(254),
 phone:z.string().trim().regex(/^\+639\d{9}$/, 'Use +639XXXXXXXXX (13 characters), a valid Philippine mobile number.'),
 table_id:z.coerce.number().int().positive(),
 party_size:z.coerce.number().int().min(1).max(20),
 reserved_at:z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).refine(s=>{const d=new Date(s+':00+08:00');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,16)!=='NaN'&&d.getTime()>Date.now();},'Reservation must be in the future (Philippine time)'),
 duration_minutes:z.coerce.number().int().min(30).max(240).default(90),
 notes:z.string().trim().max(500).optional().nullable()
}).strict();
const registrationSchema=z.object({event_id:z.coerce.number().int().positive(),guest_name:z.string().trim().min(2).max(100),guest_email:z.string().trim().email().max(254),quantity:z.coerce.number().int().min(1).max(10)}).strict();
const idSchema=z.coerce.number().int().positive().safe();
function formatIssues(err){return err.issues.map(e=>({field:e.path.join('.'),message:e.message}));}
module.exports={reservationSchema,registrationSchema,idSchema,formatIssues};
