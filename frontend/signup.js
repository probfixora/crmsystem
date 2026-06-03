const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function signUp() {
  const { data, error } = await supabase.auth.signUp({
    email: 'testuser3@rbscsolar.com',
    password: 'password123'
  });
  
  if (error) {
    console.error("Signup failed:", error);
  } else {
    console.log("Signup success:", data);
  }
}

signUp();
