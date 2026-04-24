const token = "YOUR_TOKEN"; 
const repoOwner = "YOUR_USERNAME";
const repoName = "YOUR_REPO";

document.getElementById("uploadBtn").onclick = async () => {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return alert("Kies een bestand!");

  const status = document.getElementById("status");
  status.textContent = "Uploaden...";

  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result.split(",")[1];

    const issueBody = `
**Bestandsnaam:** ${file.name}

**Base64:**
\`\`\`
${base64}
\`\`\`
`;

    const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues`, {
      method: "POST",
      headers: {
        "Authorization": `token ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: `Upload: ${file.name}`,
        body: issueBody
      })
    });

    if (res.ok) {
      status.textContent = "Bestand verzonden! GitHub Action verwerkt het...";
    } else {
      status.textContent = "Fout bij upload!";
    }
  };

  reader.readAsDataURL(file);
};
