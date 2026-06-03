const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '../supabase/.env.secrets' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

// We need a client with ANON key to sign in and get a JWT
const supabase = createClient(supabaseUrl, anonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function testEdge() {
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: 'testuser2@rbscsolar.com',
    password: 'password123',
    email_confirm: true
  });

  if (createError && createError.code !== 'email_exists') {
    console.error("Create user failed:", createError);
  }

  const { data: profile } = await supabaseAdmin.from('profiles').upsert({
    id: newUser?.user?.id,
    full_name: 'Test Admin 2',
    email: 'testuser2@rbscsolar.com',
    employee_id: 'TEST-0002',
    role: 'admin',
    is_active: true
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'testuser2@rbscsolar.com',
    password: 'password123',
  });

  if (error) {
    console.error("Login failed:", error);
    return;
  }

  const token = data.session.access_token;
  console.log("Logged in! Calling edge function...");

  const res = await fetch(`${supabaseUrl}/functions/v1/workflow`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ action: 'get_all' })
  });

  const text = await res.text();
  console.log("Edge function status:", res.status);
  console.log("Edge function response:", text);
}

testEdge();
