import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://wxtmwtbzdsjchynzuokc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dG13dGJ6ZHNqY2h5bnp1b2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwNDg0NTYsImV4cCI6MjA1ODYyNDQ1Nn0.vHh5g_xs0OjtKdPoN48-Jz0gq2SyDSFNoT1v5TMwAak';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdminUser() {
  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'admin@trademaster.com',
      password: 'Admin@123456',  // Change this to a secure password
    });

    if (authError) throw authError;

    // Create user profile with admin privileges
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([
          {
            id: authData.user.id,
            email: 'admin@trademaster.com',
            full_name: 'Admin User',
            subscription_tier: 'admin',
            subscription_status: 'active',
          },
        ]);

      if (profileError) throw profileError;
      console.log('Admin user created successfully!');
      console.log('Email: admin@trademaster.com');
      console.log('Password: Admin@123456');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

// Run the function
createAdminUser(); 