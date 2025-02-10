import { Octokit } from "@octokit/rest";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const filePath = "participants.json";
  
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
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
  
  let currentRound = 0;
  if (currentData.rounds && currentData.rounds.length > 0) {
    currentRound = Math.max(...currentData.rounds.map(r => r.round));
  }
  
  const newRound = currentRound + 1;
  const newRoundEntry = {
    round: newRound,
    participants: [],
    totalBet: 0,
    startTime: Date.now()
  };
  currentData.rounds.push(newRoundEntry);
  
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
  
  try {
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `Start new round ${newRound}`,
      content: updatedContent,
      sha,
    });
    res.status(200).json({ message: "New round started", round: newRound, startTime: newRoundEntry.startTime });
  } catch (error) {
    console.error("GitHub API error:", error);
    res.status(500).json({ error: "Failed to start new round." });
  }
}
