const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../supabase/.env.secrets' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  console.log("Checking customer_uploaded_docs...");
  const { data: docs, error: docsErr } = await supabase.from('customer_uploaded_docs').select('*').order('uploaded_at', { ascending: false }).limit(5);
  if (docsErr) console.error("Error fetching docs:", docsErr);
  else console.log(docs);

  console.log("Checking cases select *...");
  const { data: casesAll, error: casesAllErr } = await supabase.from('cases').select('*').order('created_at', { ascending: false }).limit(1);
  if (casesAllErr) console.error("Error fetching cases *:", casesAllErr);
  else console.log("First case:", casesAll[0]);
}

checkDb();
