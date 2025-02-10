import { useEffect, useState, useRef } from 'react';
import { ethers } from 'ethers';
import WalletConnectProvider from "@walletconnect/ethereum-provider";

// KONSTANTA
const SOCIAL_TOKEN_ADDRESS = "0x2ED49c7CfD45018a80651C0D5637a5D42a6948cb";
const DEVELOPER_WALLET = "0x09afd8049c4a0eE208105f806195A5b52F1EC950";
const TICKET_COST = 10; // Untuk uji coba; ubah ke 500 untuk produksi
const ROUND_DURATION = 3600; // dalam detik (1 jam)

// ABI minimal ERC-20
const SOCIAL_TOKEN_ABI = [
  "function transfer(address to, uint amount) public returns (bool)",
  "function decimals() view returns (uint8)"
];

export default function Home() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [joined, setJoined] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [totalBet, setTotalBet] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [startTime, setStartTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [winner, setWinner] = useState(null);
  
  const timerRef = useRef(null);
  
  // Ambil data lottery dari GitHub (data persistent)
  const fetchLotteryData = async () => {
    try {
      const res = await fetch('/api/getLotteryData');
      const data = await res.json();
      setCurrentRound(data.currentRound);
      setParticipants(data.participants);
      setTotalBet(data.totalBet);
      setStartTime(data.startTime);
      setWinner(data.winner);
      
      // Jika wallet sudah terhubung, periksa apakah sudah ikut
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

  // Update timer setiap detik berdasarkan startTime yang tersimpan
  useEffect(() => {
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = ROUND_DURATION - elapsed;
      setTimeLeft(remaining > 0 ? remaining : 0);
      if (remaining <= 0 && !winner) {
        // Jika round sudah habis dan belum ada pemenang, lakukan draw
        drawWinner();
      }
    };
    
    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
    
    return () => clearInterval(timerRef.current);
  }, [startTime, winner]);

  // Fungsi untuk koneksi wallet via WalletConnect
  const connectWallet = async () => {
    try {
      console.log("Connect wallet clicked");
      const wcProvider = await WalletConnectProvider.init({
        projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID,
        chains: [8453], // Pastikan chain ID ini sesuai
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

  // Fungsi untuk join lottery (beli tiket)
  const joinLottery = async () => {
    if (!provider || !signer) {
      alert("Please connect your wallet first.");
      return;
    }
    if (participants.includes(account)) {
      alert("You have already joined this round.");
      return;
    }
    try {
      const tokenContract = new ethers.Contract(SOCIAL_TOKEN_ADDRESS, SOCIAL_TOKEN_ABI, signer);
      const decimals = await tokenContract.decimals();
      const amount = ethers.parseUnits(TICKET_COST.toString(), decimals);
      const tx = await tokenContract.transfer(DEVELOPER_WALLET, amount);
      await tx.wait();
      
      const newTotalBet = totalBet + TICKET_COST;
      setTotalBet(newTotalBet);
      const newParticipants = [...participants, account];
      setParticipants(newParticipants);
      setJoined(true);
      alert("Ticket purchased successfully!");
      
      // Update data peserta secara persistent via API
      await fetch('/api/updateParticipants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round: currentRound,
          participant: account,
          totalBet: newTotalBet
        })
      });
    } catch (error) {
      console.error("Error joining lottery:", error);
      alert("Transaction failed: " + error.message);
    }
  };

  // Fungsi draw pemenang secara acak
  const drawWinner = async () => {
    if (participants.length === 0) {
      alert("No participants in this round.");
      return;
    }
    const randomIndex = Math.floor(Math.random() * participants.length);
    const selectedWinner = participants[randomIndex];
    setWinner(selectedWinner);
    // Update data pemenang secara persistent via API
    await fetch('/api/updateWinner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        round: currentRound,
        winner: selectedWinner,
        prize: totalBet * 0.95
      })
    });
    alert("Round " + currentRound + " draw complete. Winner: " + selectedWinner);
  };

  // Fungsi klaim hadiah (simulasi)
  const claimPrize = () => {
    if (account !== winner) {
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

  // Fungsi untuk memulai round baru secara persistent
  const startNewRound = async () => {
    try {
      const res = await fetch('/api/startNewRound', { method: 'POST' });
      const data = await res.json();
      setCurrentRound(data.round);
      setParticipants([]);
      setTotalBet(0);
      setJoined(false);
      setWinner(null);
      setStartTime(data.startTime);
      setTimeLeft(ROUND_DURATION);
    } catch (error) {
      console.error("Error starting new round:", error);
    }
  };

  // Ketika waktu habis dan pemenang sudah ada, mulai round baru setelah delay
  useEffect(() => {
    if (timeLeft <= 0 && winner) {
      setTimeout(() => {
        startNewRound();
      }, 10000);
    }
  }, [timeLeft, winner]);

  // Fungsi format waktu ke hh:mm:ss
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

      <h2>Round: {currentRound}</h2>
      <p>Total Bet: {totalBet} tokens</p>
      <p className="blue-text">Time Left: {formatTime(timeLeft)}</p>

      { !participants.includes(account) ? (
        <button className="pink-button" onClick={joinLottery}>Play (Join Lottery)</button>
      ) : (
        <button className="green-button" disabled>You have joined</button>
      )}

      {winner && (
        <div>
          <h3>Winner of Round {currentRound}: {winner}</h3>
          <p>Prize: {totalBet * 0.95} tokens</p>
        </div>
      )}

      <button onClick={claimPrize}>Claim Prize</button>
      <button onClick={shareLink}>Share</button>
    </div>
  );
}
