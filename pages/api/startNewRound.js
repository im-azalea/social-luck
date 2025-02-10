import { Octokit } from "@octokit/rest";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const filePath = "lottery.json";
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  
  let lotteryData = {
    currentRound: 1,
    participants: [],
    totalBet: 0,
    startTime: Date.now(),
    winner: null
  };
  
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
    });
    const content = Buffer.from(data.content, 'base64').toString();
    lotteryData = JSON.parse(content);
  } catch (error) {
    console.log("lottery.json tidak ditemukan. Inisialisasi data baru.");
  }
  
  // Mulai round baru: increment round, reset peserta, totalBet, winner, dan perbarui startTime
  lotteryData.currentRound = lotteryData.currentRound + 1;
  lotteryData.participants = [];
  lotteryData.totalBet = 0;
  lotteryData.winner = null;
  lotteryData.startTime = Date.now();
  
  const updatedContent = Buffer.from(JSON.stringify(lotteryData, null, 2)).toString('base64');
  
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
  
  try {
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `Start new round ${lotteryData.currentRound}`,
      content: updatedContent,
      sha,
    });
    res.status(200).json(lotteryData);
  } catch (error) {
    console.error("GitHub API error:", error);
    res.status(500).json({ error: "Failed to start new round." });
  }
}
