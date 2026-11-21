begin;
insert into public.alerts(state,district,title,area,severity,issued_at,instructions,source,publication,demo) values
('Assam','Kamrup Metropolitan','Urban flood advisory','Low-lying areas of Guwahati','High',now()-interval '2 hours','Practice scenario: move to higher ground if advised. Avoid flooded roads and underpasses.','Demo district bulletin','Published',true),
('Assam','Dhemaji','Rising river levels','Riverbank villages in Dhemaji','Moderate',now()-interval '4 hours','Practice scenario: follow local advisories and identify your route to higher ground.','Demo district bulletin','Published',true),
('Assam','Cachar','Slope movement advisory','Hill roads near Silchar','Advisory',now()-interval '6 hours','Practice scenario: stay away from unstable slopes and report signs of movement to local authorities.','Demo district bulletin','Published',true);
insert into public.resources(state,district,name,type,address,contact,availability,verified_at,demo) values
('Assam','Kamrup Metropolitan','Guwahati practice relief centre','Relief shelter','Guwahati, Assam (simulated location)','Demo only','Open',now(),true),
('Assam','Dhemaji','Dhemaji practice medical post','Medical facility','Dhemaji, Assam (simulated location)','Demo only','Limited',now(),true),
('Assam','Cachar','Cachar practice control room','Emergency contact','Silchar, Assam (simulated location)','Demo only','Unknown',now(),true);
insert into public.requests(state,district,landmark,type,people,status,public_update,demo) values
('Assam','Dhemaji','Demo village near the river','Evacuation',4,'Acknowledged','Practice request received.',true),
('Assam','Kamrup Metropolitan','Demo community hall','Food and water',8,'Submitted','',true);
commit;
