import { Octokit } from "@octokit/rest";

export default async function handler(req, res) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  
  // Ambil file participants.json dari GitHub
  let participantsData = { rounds: [] };
  try {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const { data } = await octokit.repos.getContent({
      owner, repo, path: "participants.json"
    });
    const content = Buffer.from(data.content, 'base64').toString();
    participantsData = JSON.parse(content);
  } catch (error) {
    console.log("Error fetching participants.json", error);
  }
  
  // Ambil file winners.json dari GitHub
  let winnersData = { rounds: [] };
  try {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const { data } = await octokit.repos.getContent({
      owner, repo, path: "winners.json"
    });
    const content = Buffer.from(data.content, 'base64').toString();
    winnersData = JSON.parse(content);
  } catch (error) {
    console.log("Error fetching winners.json", error);
  }
  
  // Tentukan round saat ini dari file participants.json
  let currentRoundEntry = null;
  if (participantsData.rounds && participantsData.rounds.length > 0) {
    currentRoundEntry = participantsData.rounds.reduce((prev, curr) => (curr.round > prev.round ? curr : prev), participantsData.rounds[0]);
  }
  
  // Cari informasi pemenang untuk round saat ini dari winners.json
  let winnerInfo = null;
  if (winnersData.rounds && winnersData.rounds.length > 0 && currentRoundEntry) {
    winnerInfo = winnersData.rounds.find(r => r.round === currentRoundEntry.round);
  }
  
  res.status(200).json({
    currentRound: currentRoundEntry ? currentRoundEntry.round : 1,
    participants: currentRoundEntry ? currentRoundEntry.participants : [],
    totalBet: currentRoundEntry ? currentRoundEntry.totalBet : 0,
    startTime: currentRoundEntry ? currentRoundEntry.startTime : Date.now(),
    winner: winnerInfo ? winnerInfo.winner : null,
    prize: winnerInfo ? winnerInfo.prize : null,
  });
}
