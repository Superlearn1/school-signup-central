import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.0.0';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16'
    });
    // Initialize Supabase client
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'Missing authorization header'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    // Verify the token and get the user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Get user profile to find school
    const { data: profile, error: profileError } = await supabaseClient.from('profiles').select('school_id').eq('id', user.id).single();
    if (profileError || !profile?.school_id) {
      return new Response(JSON.stringify({
        error: 'User profile or school not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Get school information
    const { data: school, error: schoolError } = await supabaseClient.from('schools').select('name').eq('id', profile.school_id).single();
    if (schoolError || !school) {
      return new Response(JSON.stringify({
        error: 'School not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Get or create Stripe customer
    let customerId;
    const { data: subscription } = await supabaseClient.from('subscriptions').select('stripe_customer_id').eq('school_id', profile.school_id).single();
    if (subscription?.stripe_customer_id) {
      customerId = subscription.stripe_customer_id;
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: school.name,
        metadata: {
          school_id: profile.school_id,
          user_id: user.id
        }
      });
      customerId = customer.id;
      // Update subscription record with customer ID
      await supabaseClient.from('subscriptions').update({
        stripe_customer_id: customerId
      }).eq('school_id', profile.school_id);
    }
    // Create a checkout session
    const { seats = 1 } = await req.json();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: 'Superlearn Teacher Seat',
              description: 'Monthly subscription for teacher access'
            },
            unit_amount: 200,
            recurring: {
              interval: 'month'
            }
          },
          quantity: seats
        }
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin') || 'http://localhost:3000'}/subscription-success`,
      cancel_url: `${req.headers.get('origin') || 'http://localhost:3000'}/subscribe`
    });
    return new Response(JSON.stringify({
      url: session.url
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Subscription creation error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to create subscription'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
