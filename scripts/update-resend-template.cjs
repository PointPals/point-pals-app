// Update a Resend template from an HTML file.
//
// Usage:
//   node scripts/update-resend-template.cjs <template-id> <html-file>
//
// Needs RESEND_API_KEY env var set.
//
// Example:
//   set RESEND_API_KEY=re_xxxx
//   node scripts/update-resend-template.cjs f2ebbe00-23ea-42e6-bb75-be7f6f555ac1 ../email-templates/pointpals-memory-expiry.html

const [,, templateId, htmlFile] = process.argv;

if (!templateId || !htmlFile) {
  console.error("Usage: node scripts/update-resend-template.cjs <template-id> <html-file>");
  console.error("");
  console.error("Reads the template HTML from <html-file> and updates the Resend template via API.");
  console.error("Needs RESEND_API_KEY env var set.");
  process.exit(1);
}

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error("RESEND_API_KEY is not set");
  process.exit(1);
}

const fs = require("fs");
const path = require("path");
const htmlPath = path.resolve(htmlFile);
const html = fs.readFileSync(htmlPath, "utf-8");

// Fetch the current template to preserve name, subject, etc.
async function main() {
  // Get current template
  const getRes = await fetch(`https://api.resend.com/templates/${templateId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!getRes.ok) {
    const text = await getRes.text();
    console.error(`Failed to fetch template: ${getRes.status} ${text}`);
    process.exit(1);
  }
  const current = await getRes.json();
  console.log(`Current template: "${current.name}" (${current.id})`);
  console.log(`Subject: ${current.subject || "(from edge function)"}`);
  console.log(`Updating HTML from: ${htmlPath}`);

  // Update the template
  const updateRes = await fetch(`https://api.resend.com/templates/${templateId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      html,
      // Preserve existing fields
      name: current.name,
      subject: current.subject,
    }),
  });

  if (!updateRes.ok) {
    const text = await updateRes.text();
    console.error(`Failed to update template: ${updateRes.status} ${text}`);
    process.exit(1);
  }

  const updated = await updateRes.json();
  console.log(`✅ Template "${updated.name}" updated successfully`);
  console.log(`ID: ${updated.id}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
