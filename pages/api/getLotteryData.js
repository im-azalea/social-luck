import { Octokit } from "@octokit/rest";

export default async function handler(req, res) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const filePath = "lottery.json";
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  
  // Default lottery data
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
    // Jika file belum ada, buat file baru dengan data default
    try {
      const initialData = lotteryData;
      const updatedContent = Buffer.from(JSON.stringify(initialData, null, 2)).toString('base64');
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message: "Initialize lottery data",
        content: updatedContent,
      });
    } catch (err) {
      console.error("Error initializing lottery data:", err);
    }
  }
  
  res.status(200).json(lotteryData);
}
