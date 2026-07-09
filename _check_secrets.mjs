// Check Supabase project secrets via Management API
const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = "tcpbvcgvtwrqsrzerwwr";

async function main() {
  // Try the management API for secrets (edge function secrets)
  const endpoints = [
    `https://api.supabase.com/v1/projects/${ref}/secrets`,
    `https://api.supabase.com/platform/projects/${ref}/secrets`,
    `https://api.supabase.com/v1/projects/${ref}/edge-functions/secrets`,
  ];
  
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`${url}\n  → ${res.status} ${res.statusText}`);
      if (res.ok) {
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
      }
    } catch(e) {
      console.log(`${url}\n  → Error: ${e.message}`);
    }
  }
}

main();
