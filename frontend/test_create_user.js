const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Nikhil/Downloads/crmsystem-main/supabase/.env.secrets' });
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function run() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'probfixora@gmail.com',
    password: 'probfixora.1$'
  });

  if (authError) {
    console.error("Auth error:", authError);
    return;
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/admin`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authData.session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      action: 'create_user', 
      name: 'Nikhil Tiwari 2', 
      email: 'nikhiltiwari0356@gmail.com', 
      role: 'banking' 
    })
  });

  const text = await response.text();
  console.log("Status:", response.status);
  console.log("Response:", text);
}

run();
