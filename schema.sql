-- انسخ الملف كله في Supabase > SQL Editor > Run
create extension if not exists pgcrypto;
create table telecom_lines(id uuid primary key default gen_random_uuid(),created_at timestamptz default now(),
 name text not null,kind text,number text,service text,provider text,plan text,cycle text,amount numeric check(amount>=0),due_date date,notes text);
create table domains(id uuid primary key default gen_random_uuid(),created_at timestamptz default now(),
 name text not null,kind text,provider text,start_date date,cycle text,amount numeric check(amount>=0),due_date date,auto_renew boolean default false,notes text);
create table wanted_domains(id uuid primary key default gen_random_uuid(),created_at timestamptz default now(),
 name text not null,ext text,provider text,price numeric check(price>=0),priority text,status text default 'فكرة',project text,notes text);
create table providers(id uuid primary key default gen_random_uuid(),created_at timestamptz default now(),
 name text not null,category text,site text,login_url text,username text,pwd_type text check(pwd_type in('برايفت (الماستر)','بابليك','جوجل لوجن')),
 start_date date,funding text,amount numeric check(amount>=0),cycle text,due_date date,owner text,notes text);
create table api_keys(id uuid primary key default gen_random_uuid(),created_at timestamptz default now(),
 provider text not null,service text,site text,env text,key_label text,secret_location text,created_on date,expires_on date,billing text,alert_limit numeric,notes text);
create table sites(id uuid primary key default gen_random_uuid(),created_at timestamptz default now(),
 name text not null,url text,purpose text,providers text,pwd_type text check(pwd_type in('برايفت (الماستر)','بابليك','جوجل لوجن')),it_owner text,handover_date date,notes text);
create table payments(id uuid primary key default gen_random_uuid(),created_at timestamptz default now(),
 paid_on date not null,item text not null,amount numeric not null check(amount>=0),method text,ref text,notes text);
create table apps(id uuid primary key default gen_random_uuid(),created_at timestamptz default now(),
 name text not null,description text,platforms text,start_date date,launch_date date,status text default 'لم يبدأ');
create table deliverables(id uuid primary key default gen_random_uuid(),created_at timestamptz default now(),
 app_id uuid not null references apps(id) on delete cascade,stage text,item text not null,owner text,start_date date,end_date date,received_on date,
 status text default 'لم يبدأ',acceptance text default 'لم يُختبر',notes text);
create table team(id uuid primary key default gen_random_uuid(),created_at timestamptz default now(),
 app_id uuid not null references apps(id) on delete cascade,level text,title text not null,person text,party text,job_status text default 'شاغر',reports_to text,contact text,duties text);

-- أمان: الدخول للمسجلين فقط (أنشئ مستخدمك من Authentication > Users وأوقف التسجيل العام)
do $$ declare t text; begin
 foreach t in array array['telecom_lines','domains','wanted_domains','providers','api_keys','sites','payments','apps','deliverables','team'] loop
  execute format('alter table %I enable row level security',t);
  execute format('create policy "auth_all" on %I for all to authenticated using(true) with check(true)',t);
 end loop; end $$;

create or replace view v_due with(security_invoker=true) as
 select 'الاتصالات' cat,name item,amount,due_date,(due_date-current_date) days_left from telecom_lines where due_date is not null
 union all select 'الدومينات والاستضافة',name,amount,due_date,(due_date-current_date) from domains where due_date is not null
 union all select 'مزودو الخدمات',name,amount,due_date,(due_date-current_date) from providers where due_date is not null;

-- بيانات أولية
insert into telecom_lines(name,kind,service,cycle) values('خط أرضي 1','أرضي','مكالمات + إنترنت','شهري'),('خط أرضي 2','أرضي','مكالمات + إنترنت','شهري'),
 ('محمول 1','محمول','داتا','شهري'),('محمول 2','محمول','داتا','شهري'),('محمول 3','محمول','داتا','شهري');
insert into domains(name,kind,provider,cycle) values('mashawer.com.eg','دومين','المصرية للاتصالات','سنوي');
insert into providers(name,category) values('Google','سحابة / متاجر'),('Apple','متاجر تطبيقات'),('Cloudinary','وسائط'),('Agora','فيديو / صوت');
insert into apps(name,description,platforms) values('4B (فوربي)',null,null),('DARO (دارو)',null,null),
 ('WIKALA (وكالة)','منصة سوق إلكتروني تخدم العملاء والتجار','أندرويد');
insert into deliverables(app_id,stage,item)
 select a.id,v.s,v.i from apps a,(values
 ('التخطيط والمتطلبات','وثيقة متطلبات المنتج (PRD)'),('التخطيط والمتطلبات','دراسة السوق المصري والمنافسين'),('التخطيط والمتطلبات','خريطة رحلة المستخدم والميزات'),
 ('التصميم','تصميم تجربة المستخدم UX'),('التصميم','نظام التصميم والهوية البصرية'),('التصميم','تصميم واجهات المستخدم UI'),('التصميم','النموذج التفاعلي Prototype'),('التصميم','اعتماد التصميم النهائي'),
 ('التطوير','قاعدة البيانات والخلفية وواجهات API'),('التطوير','تطبيق الأندرويد'),('التطوير','تطبيق iOS / نسخة الويب'),('التطوير','لوحة تحكم الإدارة'),('التطوير','ربط الدفع الإلكتروني'),('التطوير','الإشعارات والرسائل'),
 ('الاختبار والجودة','الاختبار الوظيفي'),('الاختبار والجودة','اختبار الأداء والأمان'),('الاختبار والجودة','اختبار قبول المستخدم UAT'),('الاختبار والجودة','الفترة التجريبية Beta'),
 ('الإطلاق والتشغيل','سياسة الخصوصية والشروط'),('الإطلاق والتشغيل','النشر على Google Play / App Store'),('الإطلاق والتشغيل','الإطلاق التسويقي'),('الإطلاق والتشغيل','خطة الدعم بعد الإطلاق')) v(s,i);
