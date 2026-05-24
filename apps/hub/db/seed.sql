-- Maranasi Hub — seed data (mirrors lib/seed fixtures).
-- Timestamps: created/updated use a fixed base; event_date and lead received_at
-- are computed relative to seed time so the demo narrative (countdowns, "2h
-- ago") reads correctly when this is applied.

-- profiles ------------------------------------------------------------
INSERT INTO profiles (user_id,email,full_name,role,avatar_color,phone,language_preference,created_at,updated_at) VALUES
('staff-hadeel','hadeel@maranasi.com','Hadeel Al-Masri','owner','#0B3D2E','+962 7 9000 0001','ar',1747900000000,1747900000000),
('staff-tareq','tareq@maranasi.com','Tareq Nashawati','producer','#14543f','+962 7 9000 0002','en',1747900000000,1747900000000),
('staff-lina','lina@maranasi.com','Lina Khoury','coordinator','#1f6b63','+962 7 9000 0003','ar',1747900000000,1747900000000),
('staff-rana','rana@maranasi.com','Rana Saleh','assistant','#3a4a40','+962 7 9000 0004','en',1747900000000,1747900000000);

-- clients -------------------------------------------------------------
INSERT INTO clients (id,full_name,email,phone,notes,language_preference,is_corporate,created_at,updated_at) VALUES
('client-reem','Reem Al-Khoury','reem.alkhoury@gmail.com','+962 7 9123 4567',NULL,'ar',0,1747900000000,1747900000000),
('client-tabbaa','Dana Tabbaa','dana.tabbaa@gmail.com',NULL,NULL,'ar',0,1747900000000,1747900000000),
('client-daoudi','Yousef Daoudi','yousef.daoudi@outlook.com',NULL,NULL,'en',0,1747900000000,1747900000000),
('client-husseini','Layla Husseini','layla.husseini@gmail.com',NULL,NULL,'ar',0,1747900000000,1747900000000),
('client-bisharat','Maha Bisharat','maha.bisharat@gmail.com',NULL,NULL,'ar',0,1747900000000,1747900000000),
('client-shomali','Khalid Shomali','k.shomali@shomaligroup.jo',NULL,NULL,'en',0,1747900000000,1747900000000),
('client-aramex','Aramex','events@aramex.com',NULL,'Contact: Nadia Haddad, Brand and Events','en',1,1747900000000,1747900000000),
('client-rj','Royal Jordanian','corporate@rj.com',NULL,'Contact: Omar Qasem, Corporate Affairs','en',1,1747900000000,1747900000000),
('client-capitalbank','Capital Bank','comms@capitalbank.jo',NULL,'Contact: Rania Faouri, Communications','en',1,1747900000000,1747900000000),
('client-cpf','Crown Prince Foundation','events@cpf.jo',NULL,'Contact: Yara Tell, Programs','ar',1,1747900000000,1747900000000),
('client-mansour','Ali Mansour','ali.mansour@gmail.com',NULL,NULL,'ar',0,1747900000000,1747900000000),
('client-tarawneh','Daoud Tarawneh','d.tarawneh@tarawnehco.jo',NULL,NULL,'en',0,1747900000000,1747900000000);

-- vendors -------------------------------------------------------------
INSERT INTO vendors (id,name,category,contact_name,phone,whatsapp_number,rating,times_used,last_used_date,average_cost_jod,is_preferred,created_at,updated_at) VALUES
('v-talet','Talet Al-Jabal','catering','Samir Haddad','+962 6 462 1100','+962 7 9555 1100',4.8,31,'2026-02-08',14500,1,1747900000000,1747900000000),
('v-sufra','Sufra by Tawaheen','catering','Lubna Tawaheen',NULL,NULL,4.6,22,'2025-12-11',11200,1,1747900000000,1747900000000),
('v-levant','Levant Caterers','catering',NULL,NULL,NULL,4.2,14,'2025-11-20',9800,0,1747900000000,1747900000000),
('v-beitsitti','Beit Sitti Events','catering',NULL,NULL,NULL,4.4,9,'2025-10-04',8600,0,1747900000000,1747900000000),
('v-rosesco','Roses and Co.','floral','Carine Najjar',NULL,NULL,4.9,27,'2026-02-08',6200,1,1747900000000,1747900000000),
('v-bloom','Bloom Amman','floral',NULL,NULL,NULL,4.3,16,'2025-12-11',4800,0,1747900000000,1747900000000),
('v-thestem','The Stem','floral',NULL,NULL,NULL,4.5,11,'2026-01-22',5100,0,1747900000000,1747900000000),
('v-studiovert','Studio Vert','photography','Khaled Rifai',NULL,NULL,4.9,24,'2026-02-08',3800,1,1747900000000,1747900000000),
('v-mkphoto','Mohammad Al-Khateeb Photography','photography',NULL,NULL,NULL,4.7,19,'2025-12-11',3200,1,1747900000000,1747900000000),
('v-lenslight','Lens and Light','photography',NULL,NULL,NULL,4.1,8,'2025-10-04',2600,0,1747900000000,1747900000000),
('v-cinematicjo','Cinematic Jordan','videography',NULL,NULL,NULL,4.8,18,'2026-01-22',5400,1,1747900000000,1747900000000),
('v-storyfilms','Story Films','videography',NULL,NULL,NULL,4.4,12,'2025-11-20',4700,0,1747900000000,1747900000000),
('v-glow','Glow Jordan','lighting',NULL,NULL,NULL,4.6,21,'2026-02-08',4300,1,1747900000000,1747900000000),
('v-lumiere','Lumiere Events','lighting',NULL,NULL,NULL,4.2,10,'2025-12-11',3900,0,1747900000000,1747900000000),
('v-echo','Echo Productions','sound',NULL,NULL,NULL,4.5,17,'2026-01-22',3600,1,1747900000000,1747900000000),
('v-soundwave','SoundWave Amman','sound',NULL,NULL,NULL,3.9,7,'2025-09-27',3100,0,1747900000000,1747900000000),
('v-kempinski-deadsea','Kempinski Ishtar Dead Sea','venue',NULL,NULL,NULL,4.9,12,'2025-06-14',22000,1,1747900000000,1747900000000),
('v-movenpick','Movenpick Resort','venue',NULL,NULL,NULL,4.5,15,'2026-01-22',14000,1,1747900000000,1747900000000),
('v-stregis','St. Regis Amman','venue',NULL,NULL,NULL,4.8,9,'2026-02-08',19000,1,1747900000000,1747900000000),
('v-fourseasons','Four Seasons Amman','venue',NULL,NULL,NULL,4.8,11,'2025-11-20',18500,1,1747900000000,1747900000000),
('v-rcc','The Royal Cultural Center','venue',NULL,NULL,NULL,4.0,6,'2025-09-27',7000,0,1747900000000,1747900000000),
('v-jordanmuseum','Jordan Museum','venue',NULL,NULL,NULL,4.3,5,'2025-12-11',9000,0,1747900000000,1747900000000),
('v-maison','Maison Atelier','decor','Nour Khalil',NULL,NULL,4.7,20,'2026-02-08',12000,1,1747900000000,1747900000000),
('v-dare','Dare Designs','decor',NULL,NULL,NULL,4.4,13,'2025-10-04',9500,0,1747900000000,1747900000000),
('v-trio','The Trio Amman','entertainment',NULL,NULL,NULL,4.6,14,'2025-12-11',2800,1,1747900000000,1747900000000),
('v-djkarim','DJ Karim','entertainment',NULL,NULL,NULL,4.5,26,'2026-02-08',2200,1,1747900000000,1747900000000),
('v-tarab','Tarab Ensemble','entertainment',NULL,NULL,NULL,4.8,8,'2025-10-04',4100,0,1747900000000,1747900000000);

-- leads (received_at relative to seed time) ---------------------------
INSERT INTO leads (id,client_id,client_name,event_type,estimated_guest_count,preferred_venue,preferred_date,tier,source,raw_message,status,note_key,received_at,assigned_to,created_at,updated_at) VALUES
('lead-reem','client-reem','Reem Al-Khoury','wedding',250,'Kempinski Ishtar, Dead Sea','2026-10-17','bespoke','instagram','Forwarded from Instagram - @reem.alkhoury: A friend whose Four Seasons wedding you produced gave us your name. We are planning ours for next October, thinking the Dead Sea, probably Kempinski. Around 250 guests. Intimate but grand, lots of candlelight, a long reception dinner by the water. Budget is open for the right team.','new',NULL,(CAST(strftime('%s','now') AS INTEGER)-2*3600)*1000,'staff-hadeel',1747900000000,1747900000000),
('lead-bisharat','client-bisharat','Maha Bisharat','private',60,'Private estate','2027-03-06','signature','referral','Referral from the Husseini family. 30th anniversary dinner, around 60 guests, March 2027. Something quiet and beautiful - a garden, a small ensemble, a long table. Asked for a proposal.','proposal_sent','awaiting_reply',(CAST(strftime('%s','now') AS INTEGER)-72*3600)*1000,'staff-tareq',1747900000000,1747900000000),
('lead-tarawneh','client-tarawneh','Daoud Tarawneh','corporate',80,'TBD - Amman','2027-01-20','signature','direct','Product launch for Tarawneh and Co., around 80 guests, January 2027. Wants a press-friendly evening with a stage moment and a tasting menu. Draft scope ready for review.','contacted','draft_ready',(CAST(strftime('%s','now') AS INTEGER)-26*3600)*1000,'staff-tareq',1747900000000,1747900000000),
('lead-mansour','client-mansour','Ali Mansour','wedding',300,'Undecided','2027-05-01','bespoke','website','Website inquiry. Wedding for around 300, venue undecided, exploring spring 2027. Call scheduled for Wednesday 4pm to walk through options.','new','scheduled_call',(CAST(strftime('%s','now') AS INTEGER)-120*3600)*1000,'staff-lina',1747900000000,1747900000000);

-- events: active (event_date relative) --------------------------------
INSERT INTO events (id,lead_id,client_id,name,event_type,event_date,venue,venue_address,guest_count,tier,status,total_budget_jod,gradient_from,gradient_to,producer_id,tasks_total,tasks_complete,created_at,updated_at) VALUES
('evt-tabbaa',NULL,'client-tabbaa','Tabbaa Wedding','wedding',(CAST(strftime('%s','now') AS INTEGER)+6*86400)*1000,'St. Regis Amman','Al-Hashmi St, Amman',180,'signature','in_production',29000,'#14543f','#9c7f3f','staff-lina',24,22,1747900000000,1747900000000),
('evt-aramex',NULL,'client-aramex','Aramex Annual Conference','conference',(CAST(strftime('%s','now') AS INTEGER)+45*86400)*1000,'The Royal Cultural Center','Al Hussein Sports City, Amman',500,'signature','in_production',40000,'#07291f','#0B3D2E','staff-tareq',26,14,1747900000000,1747900000000),
('evt-bisharat',NULL,'client-bisharat','Bisharat Corporate Evening','corporate',(CAST(strftime('%s','now') AS INTEGER)+58*86400)*1000,'Four Seasons Amman','Al-Kindi St, 5th Circle, Amman',140,'signature','in_production',30000,'#1A2E2A','#3a4a40','staff-tareq',18,9,1747900000000,1747900000000),
('evt-husseini',NULL,'client-husseini','Husseini 50th Anniversary','private',(CAST(strftime('%s','now') AS INTEGER)+120*86400)*1000,'Le Royal Amman','3rd Circle, Jabal Amman',220,'signature','planning',27000,'#221d2e','#0B3D2E','staff-lina',20,4,1747900000000,1747900000000),
('evt-khoury','lead-reem','client-reem','Khoury Wedding','wedding',(CAST(strftime('%s','now') AS INTEGER)+146*86400)*1000,'Kempinski Ishtar, Dead Sea','Sweimeh, Dead Sea Rd',250,'bespoke','planning',52000,'#0B3D2E','#1f6b63','staff-hadeel',16,3,1747900000000,1747900000000),
('evt-capitalbank',NULL,'client-capitalbank','Capital Bank Retreat','corporate',(CAST(strftime('%s','now') AS INTEGER)-1*86400)*1000,'Movenpick Resort','Dead Sea',120,'essentials','completed',16500,'#0B3D2E','#14543f','staff-rana',20,20,1747900000000,1747900000000);

-- events: past / Library (absolute dates) -----------------------------
INSERT INTO events (id,lead_id,client_id,name,event_type,event_date,venue,venue_address,guest_count,tier,status,total_budget_jod,gradient_from,gradient_to,producer_id,tasks_total,tasks_complete,created_at,updated_at) VALUES
('past-reem-faris',NULL,NULL,'Reem and Faris Wedding','wedding',CAST(strftime('%s','2025-06-14') AS INTEGER)*1000,'Kempinski Ishtar, Dead Sea',NULL,280,'bespoke','completed',42000,'#0B3D2E','#1f6b63',NULL,0,0,1747900000000,1747900000000),
('past-aramex-gala',NULL,NULL,'Aramex 40th Anniversary Gala','gala',CAST(strftime('%s','2025-11-20') AS INTEGER)*1000,'Four Seasons Amman',NULL,450,'bespoke','completed',68000,'#07291f','#0B3D2E',NULL,0,0,1747900000000,1747900000000),
('past-tedx',NULL,NULL,'TEDxAmman 2025','conference',CAST(strftime('%s','2025-09-27') AS INTEGER)*1000,'The Royal Cultural Center',NULL,600,'signature','completed',35000,'#1A2E2A','#3a4a40',NULL,0,0,1747900000000,1747900000000),
('past-tabbaa-eng',NULL,NULL,'Tabbaa Family Engagement','private',CAST(strftime('%s','2026-02-08') AS INTEGER)*1000,'St. Regis Amman',NULL,180,'signature','completed',28000,'#14543f','#9c7f3f',NULL,0,0,1747900000000,1747900000000),
('past-capitalbank-summit',NULL,NULL,'Capital Bank Q4 Leadership Summit','corporate',CAST(strftime('%s','2026-01-22') AS INTEGER)*1000,'Movenpick Resort',NULL,120,'essentials','completed',16000,'#0B3D2E','#14543f',NULL,0,0,1747900000000,1747900000000),
('past-cpf',NULL,NULL,'Crown Prince Foundation Year-End','gala',CAST(strftime('%s','2025-12-11') AS INTEGER)*1000,'Jordan Museum',NULL,220,'signature','completed',31000,'#221d2e','#0B3D2E',NULL,0,0,1747900000000,1747900000000),
('past-layla-sami',NULL,NULL,'Layla and Sami Wedding','wedding',CAST(strftime('%s','2025-10-04') AS INTEGER)*1000,'Private estate, Naour',NULL,320,'bespoke','completed',55000,'#14543f','#9c7f3f',NULL,0,0,1747900000000,1747900000000),
('past-rj-pilots',NULL,NULL,'Royal Jordanian Pilots Reunion','corporate',CAST(strftime('%s','2026-03-15') AS INTEGER)*1000,'Kempinski Amman',NULL,200,'signature','completed',24000,'#0B3D2E','#14543f',NULL,0,0,1747900000000,1747900000000),
('past-daoudi',NULL,NULL,'Daoudi Wedding','wedding',CAST(strftime('%s','2026-04-19') AS INTEGER)*1000,'Dead Sea private villa',NULL,150,'bespoke','completed',47000,'#0B3D2E','#1f6b63',NULL,0,0,1747900000000,1747900000000),
('past-husseini-eng',NULL,NULL,'Husseini Engagement','private',CAST(strftime('%s','2025-05-30') AS INTEGER)*1000,'Le Royal Amman',NULL,220,'signature','completed',26000,'#221d2e','#0B3D2E',NULL,0,0,1747900000000,1747900000000),
('past-bisharat-50',NULL,NULL,'Bisharat 50th Birthday','private',CAST(strftime('%s','2025-08-16') AS INTEGER)*1000,'Private estate',NULL,80,'bespoke','completed',33000,'#1A2E2A','#3a4a40',NULL,0,0,1747900000000,1747900000000),
('past-shomali',NULL,NULL,'Shomali Corporate Retreat','corporate',CAST(strftime('%s','2025-07-09') AS INTEGER)*1000,'Movenpick Petra',NULL,60,'signature','completed',19000,'#07291f','#0B3D2E',NULL,0,0,1747900000000,1747900000000);

-- mark the historical portfolio so it surfaces in the Library, not the pipeline
UPDATE events SET is_library = 1 WHERE id LIKE 'past-%';

-- client portal sessions ----------------------------------------------
INSERT INTO client_sessions (token,client_id,event_id,expires_at,last_accessed_at,created_at) VALUES
('reem-deadsea-2026','client-reem','evt-khoury',NULL,NULL,1747900000000),
('tabbaa-stregis','client-tabbaa','evt-tabbaa',NULL,NULL,1747900000000),
('husseini-leroyal','client-husseini','evt-husseini',NULL,NULL,1747900000000);
