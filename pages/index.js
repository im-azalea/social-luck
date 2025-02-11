// pages/index.js
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import WalletConnectProvider from "@walletconnect/ethereum-provider"

// Minimal ERC20 ABI untuk interaksi dengan token $SOCIAL
const tokenABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
]

// Dummy Lottery Contract ABI untuk klaim hadiah (ganti dengan ABI asli saat sudah ada smart contract-nya)
const lotteryABI = [
  "function claimPrize() public"
]

export default function Home() {
  // State untuk manajemen peserta dan round
  const [joined, setJoined] = useState(false)
  const [totalBet, setTotalBet] = useState(0)
  const [currentRound, setCurrentRound] = useState(1)
  const [timer, setTimer] = useState('00:00')
  const [winnerInfo, setWinnerInfo] = useState({ address: '', amount: 0 })
  const [walletAddress, setWalletAddress] = useState('')
  const [provider, setProvider] = useState(null)
  const [participants, setParticipants] = useState([]) // Array peserta round saat ini
  const [lastDrawnRound, setLastDrawnRound] = useState(0) // Round terakhir yang sudah di-draw

  // Fungsi untuk menghubungkan wallet menggunakan WalletConnect v2
  const connectWallet = async () => {
    try {
      const wcProvider = await WalletConnectProvider.init({
        projectId: "ec3a4a130bfbfcd23c9e540a8e99e718", // Ganti dengan WalletConnect Project ID milikmu
        chains: [8453], // Gunakan chain ID Base network (8453 untuk Base mainnet; sesuaikan jika memakai testnet)
        rpcMap: {
          8453: "https://mainnet.base.org" // RPC URL untuk Base network; sesuaikan jika perlu
        },
        showQrModal: true,
      })
      await wcProvider.connect()
      const ethersProvider = new ethers.providers.Web3Provider(wcProvider)
      const signer = ethersProvider.getSigner()
      const address = await signer.getAddress()
      setWalletAddress(address)
      setProvider(ethersProvider)
    } catch (error) {
      console.error("Wallet connection failed:", error)
      alert("Failed to connect wallet. Please try again.")
    }
  }

  // Fungsi untuk pembelian tiket (Play)
  const handlePlay = async () => {
    if (!walletAddress) {
      alert("Please connect your wallet first.")
      return
    }
    if (!joined) {
      // Untuk uji coba, tiket dihargai 10 token. Nantinya ubah ke 500 token.
      const ticketAmount = ethers.utils.parseUnits("10", 18) // asumsikan token menggunakan 18 decimals
      try {
        const signer = provider.getSigner()
        const tokenContract = new ethers.Contract(
          "0x2ED49c7CfD45018a80651C0D5637a5D42a6948cb", // Alamat token $SOCIAL
          tokenABI,
          signer
        )
        // Transaksi transfer token dari wallet pemain ke wallet owner
        const tx = await tokenContract.transfer("0x09afd8049c4a0eE208105f806195A5b52F1EC950", ticketAmount)
        await tx.wait()
        alert("Ticket purchased successfully!")
        setJoined(true)
        // Tambahkan peserta jika belum ada
        setParticipants(prev => {
          if (!prev.includes(walletAddress)) {
            return [...prev, walletAddress]
          }
          return prev
        })
        setTotalBet(prev => prev + 10)
      } catch (error) {
        console.error("Ticket purchase failed:", error)
        alert("Ticket purchase failed. Check console for details.")
      }
    }
  }

  // Fungsi untuk klaim hadiah (Claim Prize)
  const handleClaim = async () => {
    if (!walletAddress) {
      alert("Please connect your wallet first.")
      return
    }
    // Simulasi: jika wallet yang terhubung adalah pemenang
    if (joined && winnerInfo.address && winnerInfo.address.toLowerCase() === walletAddress.toLowerCase()) {
      try {
        const signer = provider.getSigner()
        // Ganti dengan alamat Lottery Contract yang sesungguhnya jika sudah ada
        const lotteryContractAddress = "0xYourLotteryContractAddress"
        const lotteryContract = new ethers.Contract(lotteryContractAddress, lotteryABI, signer)
        const tx = await lotteryContract.claimPrize()
        await tx.wait()
        alert("Claim successful! Congratulations!")
      } catch (error) {
        console.error("Claim failed:", error)
        alert("Claim failed. Check console for details.")
      }
    } else {
      alert("You did not win in this round.")
    }
  }

  // Fungsi untuk tombol Share
  const handleShare = () => {
    const shareData = {
      title: 'SOCIAL Lottery',
      text: 'Join the SOCIAL lottery! Check it out!',
      url: window.location.href,
    }
    if (navigator.share) {
      navigator.share(shareData)
        .then(() => console.log('Shared successfully'))
        .catch(console.error)
    } else {
      // Fallback: salin link ke clipboard
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url} (Nick: @azalea)`)
      alert('Link copied to clipboard!')
    }
  }

  // Effect untuk mengelola timer round dan draw otomatis
  useEffect(() => {
    // Tetapkan waktu deploy secara tetap. Di produksi, sebaiknya gunakan nilai terpusat (misalnya, dari server).
    const DEPLOY_TIME = new Date("2025-02-11T00:00:00Z").getTime()
    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = Math.floor((now - DEPLOY_TIME) / 1000) // total detik sejak deploy
      const computedRound = Math.floor(elapsed / 3600) + 1 // tiap 3600 detik = 1 round
      const roundElapsed = elapsed % 3600
      const roundTimeLeft = 3600 - roundElapsed
      setCurrentRound(computedRound)
      // Format timer sebagai mm:ss
      const minutes = String(Math.floor(roundTimeLeft / 60)).padStart(2, '0')
      const seconds = String(roundTimeLeft % 60).padStart(2, '0')
      setTimer(`${minutes}:${seconds}`)

      // Jika round baru saja dimulai (roundElapsed === 0) dan round sebelumnya belum di-draw
      if (roundElapsed === 0 && computedRound - 1 > lastDrawnRound) {
        // Lakukan draw untuk round sebelumnya (computedRound - 1)
        if (participants.length > 0) {
          const randomIndex = Math.floor(Math.random() * participants.length)
          const winner = participants[randomIndex]
          const prizeAmount = totalBet * 0.95 // 95% dari total taruhan
          setWinnerInfo({ address: winner, amount: prizeAmount })
        } else {
          setWinnerInfo({ address: 'No participants', amount: 0 })
        }
        // Reset data untuk round baru
        setParticipants([])
        setTotalBet(0)
        setJoined(false)
        setLastDrawnRound(computedRound - 1)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lastDrawnRound, participants, totalBet])

  return (
    <div className="container">
      <h1>SOCIAL Lottery</h1>
      {/* Tombol untuk menghubungkan wallet */}
      {!walletAddress && (
        <button className="connect-button" onClick={connectWallet}>
          Connect Wallet
        </button>
      )}
      {walletAddress && (
        <p className="wallet-address">Connected: {walletAddress}</p>
      )}
      <div className="round-info">
        <p>Current Round: {currentRound}</p>
        <p>Total Bet: {totalBet} Tokens</p>
        <p className="timer">Time Left: {timer}</p>
      </div>
      <div className="winner-info">
        <p>Previous Winner: {winnerInfo.address || 'N/A'}</p>
        <p>Won Amount: {winnerInfo.amount} Tokens</p>
      </div>
      <div className="buttons">
        {!joined ? (
          <button className="play-button" onClick={handlePlay}>
            Play (Buy Ticket)
          </button>
        ) : (
          <button className="joined-button" disabled>
            You have joined this round
          </button>
        )}
        <button 
          className={
            walletAddress &&
            winnerInfo.address &&
            winnerInfo.address.toLowerCase() === walletAddress.toLowerCase()
              ? "claim-button-winner"
              : "claim-button-non-winner"
          }
          onClick={handleClaim}
        >
          Claim Prize
        </button>
        <button className="share-button" onClick={handleShare}>
          Share
        </button>
      </div>
      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #000;
        }
        h1 {
          color: #fff;
        }
        .wallet-address {
          margin: 1rem 0;
          color: #fff;
        }
        .round-info,
        .winner-info {
          margin: 1rem 0;
          text-align: center;
        }
        .timer {
          color: #00f; /* Blue menyala */
          font-weight: bold;
        }
        .buttons {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .connect-button {
          background-color: #ffa500; /* Orange */
          border: none;
          padding: 0.8rem 1.2rem;
          color: #fff;
          font-size: 1rem;
          cursor: pointer;
          border-radius: 8px;
          margin-bottom: 1rem;
        }
        .play-button {
          background-color: #ff69b4; /* Pink */
          border: none;
          padding: 1rem 2rem;
          color: #fff;
          font-size: 1rem;
          cursor: pointer;
          border-radius: 8px;
        }
        .joined-button {
          background-color: #32cd32; /* Hijau */
          border: none;
          padding: 1rem 2rem;
          color: #fff;
          font-size: 1rem;
          border-radius: 8px;
        }
        .claim-button-winner {
          background-color: #32cd32; /* Hijau untuk pemenang */
          border: none;
          padding: 1rem 2rem;
          color: #fff;
          font-size: 1rem;
          cursor: pointer;
          border-radius: 8px;
        }
        .claim-button-non-winner {
          background-color: #ff0000; /* Merah untuk non-pemenang */
          border: none;
          padding: 1rem 2rem;
          color: #fff;
          font-size: 1rem;
          cursor: pointer;
          border-radius: 8px;
        }
        .share-button {
          background-color: #555;
          border: none;
          padding: 1rem 2rem;
          color: #fff;
          font-size: 1rem;
          cursor: pointer;
          border-radius: 8px;
        }
      `}</style>
    </div>
  )
}
