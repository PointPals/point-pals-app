// Check vault secrets and cron jobs via Supabase Management API
const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = "tcpbvcgvtwrqsrzerwwr";

async function main() {
  // 1. Check what secrets exist
  const secretsRes = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/secrets`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!secretsRes.ok) {
    console.log("Secrets API:", secretsRes.status, secretsRes.statusText);
    const body = await secretsRes.text();
    console.log(body);
    return;
  }
  const secrets = await secretsRes.json();
  console.log("=== Secrets in Supabase ===");
  for (const s of secrets) {
    console.log(`  ${s.name}: ${s.value.substring(0, Math.min(12, s.value.length))}...`);
  }
  
  // Check if CRON_SECRET exists
  const cronSecret = secrets.find(s => s.name === "CRON_SECRET");
  console.log(`\nCRON_SECRET present: ${!!cronSecret}`);
  
  // Check if RESEND_API_KEY exists  
  const resendKey = secrets.find(s => s.name === "RESEND_API_KEY");
  console.log(`RESEND_API_KEY present: ${!!resendKey}\n`);

  // 2. Now try to get the service_role key via the Management API
  console.log("=== Trying to get service_role key ===");
  // The management API moved; try the platform endpoint
  const keysRes = await fetch(
    `https://api.supabase.com/platform/projects/${ref}/secrets`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (keysRes.ok) {
    const keys = await keysRes.json();
    for (const k of keys) {
      if (k.name === "service_role" || k.name === "service_role_key") {
        console.log(`Found service_role key: ${k.value.substring(0, 15)}...`);
      }
    }
  } else {
    console.log("Platform API:", keysRes.status);
  }
}

main().catch(e => console.error(e));
