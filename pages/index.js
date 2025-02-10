import { useEffect, useState, useRef } from 'react';
import { ethers } from 'ethers';
import WalletConnectProvider from "@walletconnect/ethereum-provider";

// KONSTANTA
const SOCIAL_TOKEN_ADDRESS = "0x2ED49c7CfD45018a80651C0D5637a5D42a6948cb";
const DEVELOPER_WALLET = "0x09afd8049c4a0eE208105f806195A5b52F1EC950";
const TICKET_COST = 10; // Uji coba: 10 token; ubah ke 500 untuk produksi
const ROUND_DURATION = 3600; // durasi round: 3600 detik (1 jam)

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
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [winner, setWinner] = useState(null);
  const timerRef = useRef(null);

  // Fungsi untuk connect wallet menggunakan WalletConnect
  const connectWallet = async () => {
    try {
      console.log("Connect wallet clicked");
      const wcProvider = await WalletConnectProvider.init({
        projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "YOUR_PROJECT_ID", // Ganti dengan Project ID kamu
        chains: [8453],
        showQrModal: true,
      });
      await wcProvider.connect();
      const ethersProvider = new ethers.BrowserProvider(wcProvider);
      setProvider(ethersProvider);
      const signer = await ethersProvider.getSigner();
      setSigner(signer);
      const address = await signer.getAddress();
      setAccount(address);
      console.log("Wallet connected:", address);
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  };

  // Timer countdown dan draw otomatis
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          drawWinner();
          // Reset round setelah delay 10 detik
          setTimeout(() => {
            setCurrentRound(prevRound => prevRound + 1);
            setParticipants([]);
            setTotalBet(0);
            setJoined(false);
            setWinner(null);
            setTimeLeft(ROUND_DURATION);
            timerRef.current = setInterval(() => {
              setTimeLeft(prev => prev - 1);
            }, 1000);
          }, 10000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [currentRound]);

  // Fungsi untuk join lottery (beli tiket)
  const joinLottery = async () => {
    if (!provider || !signer) {
      alert("Please connect your wallet first.");
      return;
    }
    if (joined) {
      alert("You have already joined this round.");
      return;
    }
    try {
      const tokenContract = new ethers.Contract(SOCIAL_TOKEN_ADDRESS, SOCIAL_TOKEN_ABI, signer);
      const decimals = await tokenContract.decimals();
      const amount = ethers.parseUnits(TICKET_COST.toString(), decimals);
      // Transfer token dari wallet pemain ke wallet developer
      const tx = await tokenContract.transfer(DEVELOPER_WALLET, amount);
      await tx.wait();
      setJoined(true);
      setParticipants(prev => [...prev, account]);
      setTotalBet(prev => prev + TICKET_COST);
      alert("Ticket purchased successfully!");
      updateParticipantsOnGitHub(account);
    } catch (error) {
      console.error("Error joining lottery:", error);
      alert("Transaction failed: " + error.message);
    }
  };

  // Fungsi untuk draw pemenang secara acak
  const drawWinner = () => {
    if (participants.length === 0) {
      alert("No participants in this round.");
      return;
    }
    const randomIndex = Math.floor(Math.random() * participants.length);
    const selectedWinner = participants[randomIndex];
    setWinner(selectedWinner);
    updateWinnerOnGitHub(selectedWinner, totalBet * 0.95, currentRound);
    alert("Round " + currentRound + " draw complete. Winner: " + selectedWinner);
  };

  // Fungsi untuk claim prize
  const claimPrize = () => {
    if (account !== winner) {
      alert("You did not win this round.");
      return;
    }
    // Untuk demo, claim dilakukan secara simulasi
    alert("Prize claimed! (Simulated)");
  };

  // Fungsi share
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

  // Fungsi untuk update peserta ke GitHub melalui API
  const updateParticipantsOnGitHub = async (participantAddress) => {
    try {
      await fetch("/api/updateParticipants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          round: currentRound,
          participant: participantAddress,
          totalBet: totalBet + TICKET_COST
        })
      });
    } catch (error) {
      console.error("Error updating participants on GitHub:", error);
    }
  };

  // Fungsi untuk update pemenang ke GitHub melalui API
  const updateWinnerOnGitHub = async (winnerAddress, prizeAmount, round) => {
    try {
      await fetch("/api/updateWinner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          round,
          winner: winnerAddress,
          prize: prizeAmount
        })
      });
    } catch (error) {
      console.error("Error updating winner on GitHub:", error);
    }
  };

  // Fungsi untuk format sisa waktu menjadi hh:mm:ss
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

      {!joined ? (
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
