import { Octokit } from "@octokit/rest";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }
  
  const { round, winner, prize } = req.body;
  
  // Informasi repository GitHub
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const filePath = "winners.json";   // nama file penyimpanan data pemenang
  
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });
  
  try {
    // Ambil isi file saat ini (jika ada)
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
    
    // Tambahkan data round baru
    currentData.rounds.push({ round, winner, prize });
    
    const updatedContent = Buffer.from(JSON.stringify(currentData, null, 2)).toString('base64');
    
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
      message: `Update winner for round ${round}`,
      content: updatedContent,
      sha,
    });
    
    res.status(200).json({ message: "Winner updated." });
  } catch (error) {
    console.error("GitHub API error:", error);
    res.status(500).json({ error: "Failed to update winner." });
  }
}
