const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://tqtbkjejsdagjypolrbd.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxdGJramVqc2RhZ2p5cG9scmJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMyNTQ4NiwiZXhwIjoyMDk1OTAxNDg2fQ.uQeC7gAutukV3XZ244adpl30ZTOvpfGPDSSk5gshZIg';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function updatePasswords() {
  console.log("Fetching all users...");
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error("Failed to list users:", error);
    return;
  }

  // Also fetch profiles to check the role safely
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, email");

  if (profileError) {
    console.error("Failed to list profiles:", profileError);
    return;
  }

  const profileMap = new Map(profiles.map(p => [p.id, p]));

  let updatedCount = 0;
  for (const user of users) {
    const profile = profileMap.get(user.id);
    const role = profile ? profile.role : (user.user_metadata?.role || "sales");
    
    console.log(`User: ${user.email}, Role: ${role}`);
    
    if (role.toLowerCase() === "admin") {
      console.log(`Skipping admin user: ${user.email}`);
      continue;
    }

    console.log(`Updating password for ${user.email} (Role: ${role})...`);
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: "probfixora@123"
    });

    if (updateError) {
      console.error(`Failed to update ${user.email}:`, updateError.message);
    } else {
      updatedCount++;
    }
  }

  console.log(`Successfully updated passwords for ${updatedCount} users.`);
}

updatePasswords();
