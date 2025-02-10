import { Octokit } from "@octokit/rest";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }
  
  const { round, participant, totalBet } = req.body;
  
  // Informasi repository GitHub dari environment variables
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const filePath = "participants.json";
  
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });
  
  try {
    // Ambil isi file jika sudah ada, atau buat data baru
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
      console.log("participants.json does not exist, creating new file.");
    }
    
    // Update data untuk round saat ini
    let roundData = currentData.rounds.find(r => r.round === round);
    if (!roundData) {
      roundData = { round, participants: [], totalBet: 0 };
      currentData.rounds.push(roundData);
    }
    roundData.participants.push(participant);
    roundData.totalBet = totalBet;
    
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
