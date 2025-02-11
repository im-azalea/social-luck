import { Octokit } from "@octokit/rest";

export default async function handler(req, res) {
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
    console.log("lotteryData fetched:", lotteryData);
  } catch (error) {
    console.error("Error fetching lotteryData:", error);
  }
  
  res.status(200).json(lotteryData);
}
