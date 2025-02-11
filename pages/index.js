// pages/index.js
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import WalletConnectProvider from "@walletconnect/ethereum-provider"

export default function Home() {
  const [joined, setJoined] = useState(false)
  const [totalBet, setTotalBet] = useState(0)
  const [currentRound, setCurrentRound] = useState(1)
  const [timer, setTimer] = useState('00:00:00')
  const [winnerInfo, setWinnerInfo] = useState({ address: '', amount: 0 })
  const [walletAddress, setWalletAddress] = useState('')
  const [provider, setProvider] = useState(null)

  // Simulasi timer round: countdown 1 jam (3600 detik)
  useEffect(() => {
    let timeLeft = 3600 // 1 jam = 3600 detik
    const interval = setInterval(() => {
      if (timeLeft >= 0) {
        const hours = String(Math.floor(timeLeft / 3600)).padStart(2, '0')
        const minutes = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0')
        const seconds = String(timeLeft % 60).padStart(2, '0')
        setTimer(`${hours}:${minutes}:${seconds}`)
        timeLeft--
      } else {
        clearInterval(interval)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [currentRound])

  // Fungsi untuk menghubungkan wallet menggunakan WalletConnect v2
  const connectWallet = async () => {
    try {
      // Inisialisasi WalletConnect Provider
      const wcProvider = await WalletConnectProvider.init({
        projectId: "ec3a4a130bfbfcd23c9e540a8e99e718", // Ganti dengan Project ID WalletConnect milikmu
        chains: [8453], // Gunakan chain ID Base network (8453 untuk Base mainnet; sesuaikan jika menggunakan testnet)
        rpcMap: {
          8453: "https://mainnet.base.org" // RPC URL untuk Base network; sesuaikan jika perlu
        },
        showQrModal: true,
      })

      // Memulai koneksi ke wallet
      await wcProvider.connect()

      // Buat instance ethers provider dan dapatkan alamat wallet
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

  // Fungsi untuk tombol "Play" (Beli Tiket)
  const handlePlay = async () => {
    if (!walletAddress) {
      alert("Please connect your wallet first.")
      return
    }
    if (!joined) {
      // Di sini nantinya akan diintegrasikan logika interaksi smart contract
      // Untuk uji coba, kita simulasikan pemain telah bergabung dan menambah total taruhan 10 token
      setJoined(true)
      setTotalBet(prev => prev + 10)

      // Contoh logika transaksi dengan ethers:
      // const signer = provider.getSigner()
      // const tokenContract = new ethers.Contract(
      //   "0x2ED49c7CfD45018a80651C0D5637a5D42a6948cb", // Address token $SOCIAL
      //   tokenABI, // ABI token (harus kamu sediakan)
      //   signer
      // )
      // const tx = await tokenContract.transfer("0x09afd8049c4a0eE208105f806195A5b52F1EC950", ticketAmount)
      // await tx.wait()
    }
  }

  // Fungsi untuk tombol "Claim" hadiah
  const handleClaim = async () => {
    if (!walletAddress) {
      alert("Please connect your wallet first.")
      return
    }
    // Simulasi: jika alamat wallet sama dengan winnerInfo.address, anggap pemain pemenang
    if (joined && winnerInfo.address.toLowerCase() === walletAddress.toLowerCase()) {
      alert('Claim successful! Congratulations!')
      // Di sini nanti integrasikan logika klaim hadiah melalui smart contract
    } else {
      alert('You did not win in this round.')
    }
  }

  // Fungsi untuk tombol "Share"
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

  return (
    <div className="container">
      <h1>SOCIAL Lottery</h1>
      {/* Tampilkan tombol Connect Wallet jika wallet belum terhubung */}
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
        <button className="claim-button" onClick={handleClaim}>
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
          background-color: #ffa500; /* Orange untuk Connect Wallet */
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
        .claim-button {
          background-color: #32cd32; /* Hijau */
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
