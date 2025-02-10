import { useEffect, useState, useRef } from 'react';
import { ethers } from 'ethers';
import WalletConnectProvider from "@walletconnect/ethereum-provider";

// KONSTANTA
const SOCIAL_TOKEN_ADDRESS = "0x2ED49c7CfD45018a80651C0D5637a5D42a6948cb";
const DEVELOPER_WALLET = "0x09afd8049c4a0eE208105f806195A5b52F1EC950";
const TICKET_COST = 10; // Untuk uji coba; ubah ke 500 untuk produksi
const ROUND_DURATION = 3600; // 1 jam dalam detik

const SOCIAL_TOKEN_ABI = [
  "function transfer(address to, uint amount) public returns (bool)",
  "function decimals() view returns (uint8)"
];

export default function Home() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  // lotteryData menyimpan data round secara persistent
  const [lotteryData, setLotteryData] = useState({
    currentRound: 1,
    participants: [],
    totalBet: 0,
    startTime: Date.now(),
    winner: null,
  });
  const [joined, setJoined] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const timerRef = useRef(null);

  // Mengambil data lottery dari API (/api/getLotteryData)
  const fetchLotteryData = async () => {
    try {
      const res = await fetch('/api/getLotteryData');
      const data = await res.json();
      setLotteryData(data);
      const now = Date.now();
      const elapsed = Math.floor((now - data.startTime) / 1000);
      const remaining = ROUND_DURATION - elapsed;
      setTimeLeft(remaining > 0 ? remaining : 0);
      if (account && data.participants.includes(account)) {
        setJoined(true);
      }
    } catch (error) {
      console.error("Error fetching lottery data:", error);
    }
  };

  useEffect(() => {
    fetchLotteryData();
  }, [account]);

  // Timer: hitung sisa waktu berdasarkan startTime yang tersimpan
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - lotteryData.startTime) / 1000);
      const remaining = ROUND_DURATION - elapsed;
      setTimeLeft(remaining > 0 ? remaining : 0);
      if (remaining <= 0 && !lotteryData.winner) {
        // Jika waktu habis dan belum ada pemenang, lakukan draw
        drawWinner();
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
    return () => clearInterval(timerRef.current);
  }, [lotteryData]);

  // Fungsi connect wallet via WalletConnect
  const connectWallet = async () => {
    try {
      console.log("Connect wallet clicked");
      const wcProvider = await WalletConnectProvider.init({
        projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID,
        chains: [8453],
        showQrModal: true,
      });
      await wcProvider.connect();
      const ethersProvider = new ethers.BrowserProvider(wcProvider);
      setProvider(ethersProvider);
      const signer = await ethersProvider.getSigner();
      setSigner(signer);
      const addr = await signer.getAddress();
      setAccount(addr);
      console.log("Wallet connected:", addr);
      fetchLotteryData();
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  };

  // Fungsi join lottery (beli tiket)
  const joinLottery = async () => {
    if (!provider || !signer) {
      alert("Please connect your wallet first.");
      return;
    }
    if (lotteryData.participants.includes(account)) {
      alert("You have already joined this round.");
      return;
    }
    try {
      const tokenContract = new ethers.Contract(SOCIAL_TOKEN_ADDRESS, SOCIAL_TOKEN_ABI, signer);
      const decimals = await tokenContract.decimals();
      const amount = ethers.parseUnits(TICKET_COST.toString(), decimals);
      const tx = await tokenContract.transfer(DEVELOPER_WALLET, amount);
      await tx.wait();
      
      const newTotalBet = lotteryData.totalBet + TICKET_COST;
      // Update peserta dan totalBet secara persistent melalui API
      await fetch('/api/updateParticipants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant: account,
          totalBet: newTotalBet
        })
      });
      fetchLotteryData();
      setJoined(true);
      alert("Ticket purchased successfully!");
    } catch (error) {
      console.error("Error joining lottery:", error);
      alert("Transaction failed: " + error.message);
    }
  };

  // Fungsi draw pemenang secara acak
  const drawWinner = async () => {
    if (lotteryData.participants.length === 0) {
      alert("No participants in this round.");
      return;
    }
    const randomIndex = Math.floor(Math.random() * lotteryData.participants.length);
    const selectedWinner = lotteryData.participants[randomIndex];
    // Update winner secara persistent melalui API
    await fetch('/api/updateWinner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        winner: selectedWinner,
        prize: lotteryData.totalBet * 0.95
      })
    });
    fetchLotteryData();
    alert("Round " + lotteryData.currentRound + " draw complete. Winner: " + selectedWinner);
  };

  // Fungsi claim hadiah (simulasi)
  const claimPrize = () => {
    if (account !== lotteryData.winner) {
      alert("You did not win this round.");
      return;
    }
    alert("Prize claimed! (Simulated)");
  };

  // Fungsi share link
  const shareLink = () => {
    const shareData = {
      title: "SOCIAL LUCK Lottery",
      text: "Join the SOCIAL LUCK lottery! My Warpcast: @azalea",
      url: window.location.href,
    };
    if (navigator.share) {
      navigator.share(shareData)
        .then(() => console.log("Shared successfully"))
        .catch((error) => console.error("Error sharing:", error));
    } else {
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      alert("Link copied to clipboard!");
    }
  };

  // Fungsi untuk memulai round baru (dijalankan setelah round selesai)
  const startNewRound = async () => {
    await fetch('/api/startNewRound', { method: 'POST' });
    fetchLotteryData();
    setJoined(false);
  };

  // Jika waktu habis dan winner sudah ada, setelah 10 detik mulai round baru
  useEffect(() => {
    if (timeLeft <= 0 && lotteryData.winner) {
      setTimeout(() => {
        startNewRound();
      }, 10000);
    }
  }, [timeLeft, lotteryData.winner]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>SOCIAL LUCK Lottery</h1>
      {!account ? (
        <button className="pink-button" onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <p>Connected: {account}</p>
      )}

      <h2>Round: {lotteryData.currentRound}</h2>
      <p>Total Bet: {lotteryData.totalBet} tokens</p>
      <p className="blue-text">Time Left: {formatTime(timeLeft)}</p>

      {!lotteryData.participants.includes(account) ? (
        <button className="pink-button" onClick={joinLottery}>Play (Join Lottery)</button>
      ) : (
        <button className="green-button" disabled>You have joined</button>
      )}

      {lotteryData.winner && (
        <div>
          <h3>Winner of Round {lotteryData.currentRound}: {lotteryData.winner}</h3>
          <p>Prize: {lotteryData.totalBet * 0.95} tokens</p>
        </div>
      )}

      <button onClick={claimPrize}>Claim Prize</button>
      <button onClick={shareLink}>Share</button>
    </div>
  );
}
