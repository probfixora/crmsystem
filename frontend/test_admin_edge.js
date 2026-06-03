const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Nikhil/Downloads/crmsystem-main/supabase/.env.secrets' });
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
// Use access token directly for the user we created 'probfixora@gmail.com'
// Wait, we can just use the ANON key but we need a valid JWT token.
// Let's sign in first.

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

  console.log("Logged in. Token:", authData.session.access_token.substring(0, 20) + '...');

  const response = await fetch(`${supabaseUrl}/functions/v1/admin`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authData.session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action: 'list_users' })
  });

  const text = await response.text();
  console.log("Status:", response.status);
  console.log("Response:", text);
}

run();
