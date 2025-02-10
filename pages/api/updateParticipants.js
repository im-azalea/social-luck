import { Octokit } from "@octokit/rest";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }
  
  const { round, participant, totalBet } = req.body;
  
  // Informasi repository GitHub (atur melalui environment variables di Vercel)
  const owner = process.env.GITHUB_OWNER; // misal: username GitHub kamu
  const repo = process.env.GITHUB_REPO;   // misal: nama repo, contoh: social-luck-data
  const filePath = "participants.json";   // nama file penyimpanan data peserta
  
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN, // Personal Access Token GitHub (atur di env Vercel)
  });
  
  try {
    // Ambil isi file saat ini (jika sudah ada)
    let currentData = { rounds: [] };
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
      });
      const content = Buffer.from(data.content, 'base64').toString();
      currentData = JSON.parse(content);
    } catch (error) {
      console.log("File does not exist, creating a new one.");
    }
    
    // Update data untuk round saat ini
    let roundData = currentData.rounds.find(r => r.round === round);
    if (!roundData) {
      roundData = { round, participants: [], totalBet: 0 };
      currentData.rounds.push(roundData);
    }
    roundData.participants.push(participant);
    roundData.totalBet = totalBet;
    
    // Siapkan konten file yang diperbarui (dalam base64)
    const updatedContent = Buffer.from(JSON.stringify(currentData, null, 2)).toString('base64');
    
    // Dapatkan SHA file jika sudah ada
    let sha;
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
      });
      sha = data.sha;
    } catch (error) {
      sha = undefined;
    }
    
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `Update participants for round ${round}`,
      content: updatedContent,
      sha,
    });
    
    res.status(200).json({ message: "Participants updated." });
  } catch (error) {
    console.error("GitHub API error:", error);
    res.status(500).json({ error: "Failed to update participants." });
  }
}
