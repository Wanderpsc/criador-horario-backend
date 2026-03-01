require('dotenv').config();
const mongoose = require('mongoose');

const weekDays = ['Segunda','Terça','Quarta','Quinta','Sexta'];
const periods = [1,2,3,4,5,6,7,8];

function availableByStructured(teacher, day, period){
  const availability = teacher?.availability;
  if(!availability || Object.keys(availability).length===0) return true;
  const d = day.toLowerCase();
  const dayData = availability[d];
  if(!dayData || Object.keys(dayData).length===0) return true;
  const val = dayData[String(period)] ?? dayData[period];
  if(val===undefined) return true;
  return !!val;
}

(async()=>{
 await mongoose.connect(process.env.MONGODB_URI);
 const db = mongoose.connection.db;
 const latest = await db.collection('generatedtimetables').find({title:'HORÁRIO 005'}).sort({createdAt:-1}).limit(1).toArray();
 const base=latest[0];
 const setDocs = await db.collection('generatedtimetables').find({title:base.title,scheduleId:base.scheduleId,school:base.school}).toArray();
 const allSlots=setDocs.flatMap(d=>d.slots||[]);
 const teacher=await db.collection('teachers').findOne({name:/vitanilce/i});
 const teacherId=String(teacher._id);
 const classGeo='69481428a3fd5c6752dbab9b';
 const class9b='695b163463ff96d19338df86';
 const subjGeo='695b181c63ff96d19338e01c';
 const subjMus='695b185763ff96d19338e032';
 
 function candidates(classId){
  const classBusy=new Set(allSlots.filter(s=>s.classId===classId).map(s=>`${s.day}#${s.period}`));
  const teacherBusy=new Set(allSlots.filter(s=>s.teacherId===teacherId).map(s=>`${s.day}#${s.period}`));
  const out=[];
  for(const day of weekDays){
   for(const p of periods){
    const k=`${day}#${p}`;
    if(classBusy.has(k)) continue;
    if(teacherBusy.has(k)) continue;
    if(!availableByStructured(teacher,day,p)) continue;
    out.push({day,period:p});
   }
  }
  return out;
 }
 
 console.log('geo integral generated', allSlots.filter(s=>s.classId===classGeo&&s.subjectId===subjGeo&&s.teacherId===teacherId).length);
 console.log('mus 9b generated', allSlots.filter(s=>s.classId===class9b&&s.subjectId===subjMus&&s.teacherId===teacherId).length);
 console.log('candidates classGeo', candidates(classGeo).slice(0,20), 'count', candidates(classGeo).length);
 console.log('candidates class9b', candidates(class9b).slice(0,20), 'count', candidates(class9b).length);
 
 await mongoose.disconnect();
})();
