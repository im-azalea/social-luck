// pages/index.js
import { useState, useEffect } from 'react'

export default function Home() {
  const [joined, setJoined] = useState(false)
  const [totalBet, setTotalBet] = useState(0)
  const [currentRound, setCurrentRound] = useState(1)
  const [timer, setTimer] = useState('00:00:00')
  const [winnerInfo, setWinnerInfo] = useState({ address: '', amount: 0 })

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

  // Fungsi untuk tombol "Play" (Beli tiket)
  const handlePlay = () => {
    if (!joined) {
      // Di sini nanti akan diintegrasikan logika pembelian token via WalletConnect
      // Untuk sementara, kita simulasikan pemain sudah join round dengan menambah total taruhan 10 token (uji coba)
      setJoined(true)
      setTotalBet(prev => prev + 10)
    }
  }

  // Fungsi untuk tombol "Claim"
  const handleClaim = () => {
    // Simulasi: jika pemain merupakan pemenang, proses claim berhasil,
    // jika tidak, tampilkan alert "You did not win in this round."
    // Untuk simulasi, asumsikan jika winnerInfo.address berisi "YOU", maka pemain adalah pemenang.
    if (joined && winnerInfo.address === 'YOU') {
      alert('Claim successful! Congratulations!')
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
        .round-info,
        .winner-info {
          margin: 1rem 0;
          text-align: center;
        }
        .timer {
          color: #00f; /* blue menyala */
          font-weight: bold;
        }
        .buttons {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .play-button {
          background-color: #ff69b4; /* pink */
          border: none;
          padding: 1rem 2rem;
          color: #fff;
          font-size: 1rem;
          cursor: pointer;
          border-radius: 8px;
        }
        .joined-button {
          background-color: #32cd32; /* hijau */
          border: none;
          padding: 1rem 2rem;
          color: #fff;
          font-size: 1rem;
          border-radius: 8px;
        }
        .claim-button {
          background-color: #32cd32; /* hijau */
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
