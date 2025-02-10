import { Octokit } from "@octokit/rest";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }
  
  const { participant, totalBet } = req.body;
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
  
  if (lotteryData.participants.includes(participant)) {
    return res.status(400).json({ error: "Participant already joined this round." });
  }
  
  lotteryData.participants.push(participant);
  lotteryData.totalBet = totalBet;
  
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
      message: `Update lottery data for round ${lotteryData.currentRound}`,
      content: updatedContent,
      sha,
    });
    res.status(200).json({ message: "Lottery data updated." });
  } catch (error) {
    console.error("GitHub API error:", error);
    res.status(500).json({ error: "Failed to update lottery data." });
  }
}
