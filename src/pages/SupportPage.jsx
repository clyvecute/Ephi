import { useState } from 'react';
import { UiIcon } from '../components/EphiIcons';

export default function SupportPage() {
  const [activeMethod, setActiveMethod] = useState('info');
  const [copiedText, setCopiedText] = useState('');

  const handleCopyAddress = (address) => {
    navigator.clipboard.writeText(address);
    setCopiedText(address);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const cryptoWallets = [
    { token: 'USDT', network: 'TRC-20 / Tron Network', address: import.meta.env.VITE_WALLET_USDT_TRC20, color: '#26A17B', symbol: '🟢' },
    { token: 'ETH / USDT', network: 'ERC-20 / Ethereum Network', address: import.meta.env.VITE_WALLET_ETH, color: '#627EEA', symbol: '🔷' },
    { token: 'BTC', network: 'Bitcoin Network', address: import.meta.env.VITE_WALLET_BTC, color: '#F7931A', symbol: '🟠' }
  ].filter(w => w.address);

  const methods = [
    {
      id: 'paypal',
      name: 'PayPal',
      icon: 'sparkle',
      desc: 'International support via PayPal.',
      instruction: 'Supports international transfers and secure payments via PayPal.',
      link: import.meta.env.VITE_PAYPAL_URL || 'https://paypal.me/jellyephi'
    },
    {
      id: 'kofi',
      name: 'Ko-fi / Buy Me a Coffee',
      icon: 'star',
      desc: 'The best way to stay anonymous.',
      instruction: 'Platforms like Ko-fi act as a buffer. You can use a username and your donors will not see your bank details or legal name.',
      link: import.meta.env.VITE_KOFI_URL || 'https://ko-fi.com/cheshire_catt'
    },
    {
      id: 'paymongo',
      name: 'PayMongo (Card / Local Payments)',
      icon: 'sparkle',
      desc: 'Local card and e-wallet payments.',
      instruction: 'PayMongo supports Credit Cards, GrabPay, and other local e-wallets. You can set up a "Payment Link" to receive support securely.',
      link: 'https://paymongo.page/l/example'
    },
    ...(cryptoWallets.length > 0 ? [{
      id: 'crypto',
      name: 'Cryptocurrency',
      icon: 'sparkle',
      desc: 'USDT, ETH, and BTC support.',
      instruction: 'Make sure to send the correct token on the correct network. Sending tokens to the wrong network will result in permanent loss of funds.'
    }] : [])
  ];

  return (
    <div className="page-wrap">
      
      {/* Divine Credit Bundles */}
      <div style={{ maxWidth: '900px', margin: '0 auto 3rem' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', textAlign: 'center', marginBottom: '2rem' }}>✦ Divine Credits ✦</h2>
        <div className="responsive-grid-3">
          {[
            { id: 'tier_1', amount: 10,  price: '$3',    name: 'Neophyte', desc: '10 High-Precision Readings' },
            { id: 'tier_2', amount: 50,  price: '$10',   name: 'Adept', desc: '50 Readings + Priority Support' },
            { id: 'tier_3', amount: 200, price: '$30',   name: 'Master', desc: 'Unlimited Depth Archive' }
          ].map(bundle => (
            <div key={bundle.id} className="ephi-card" style={{ 
              padding: '2rem', 
              textAlign: 'center', 
              border: bundle.id === 'tier_2' ? '1px solid var(--accent)' : '1px solid var(--border)',
              transform: bundle.id === 'tier_2' ? 'scale(1.05)' : 'none',
              zIndex: bundle.id === 'tier_2' ? 2 : 1
            }}>
              <div style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>{bundle.name}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.5rem 0' }}>{bundle.amount}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Divine Credits</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>{bundle.price}</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', height: '2.5rem' }}>{bundle.desc}</p>
              <button className={`btn ${bundle.id === 'tier_2' ? 'btn-primary' : 'btn-ghost'}`} style={{ width: '100%' }}>
                Acquire
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', margin: 0 }}>Alternative Support</h2>
        <p className="page-subtitle">Direct contributions to keep the servers running.</p>
      </div>

      <div className="responsive-grid-2" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {methods.map((m) => (
            <div 
              key={m.id}
              className={`ephi-card ${activeMethod === m.id ? 'active' : ''}`}
              style={{ 
                padding: '1.5rem', 
                cursor: 'pointer',
                borderColor: activeMethod === m.id ? 'var(--accent)' : 'var(--border)',
                background: activeMethod === m.id ? 'rgba(187, 166, 255, 0.05)' : 'var(--bg-card)'
              }}
              onClick={() => setActiveMethod(m.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <UiIcon name={m.icon} size={20} color={activeMethod === m.id ? 'var(--accent)' : 'var(--text-muted)'} />
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, color: activeMethod === m.id ? 'var(--accent)' : 'var(--text-primary)' }}>{m.name}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>{m.desc}</p>
                </div>
              </div>
            </div>
          ))}
          
          <div 
            className="ephi-card"
            style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.02)', borderStyle: 'dashed' }}
          >
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
              <strong>Privacy Note:</strong> For maximum anonymity, we recommend using Ko-fi or a PayPal Business account. 
              Direct bank transfers will typically reveal your legal name to the sender for security purposes.
            </p>
          </div>
        </div>

        <div className="ephi-card" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
          {activeMethod === 'info' ? (
            <div>
              <UiIcon name="sparkle" size={40} color="var(--accent)" style={{ marginBottom: '1.5rem' }} />
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '1rem' }}>Choose a Method</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Select a support option on the left to view details and instructions on how to contribute anonymously.
              </p>
            </div>
          ) : (
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--accent)', marginBottom: '1.5rem' }}>
                {methods.find(m => m.id === activeMethod).name}
              </h3>
              <p style={{ color: 'var(--text-primary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                {methods.find(m => m.id === activeMethod).instruction}
              </p>
              
              {activeMethod === 'crypto' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', textAlign: 'left' }}>
                  {cryptoWallets.map((wallet, idx) => (
                    <div key={idx} style={{ 
                      background: 'var(--bg-deep)', 
                      padding: '1.25rem', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '1rem' }}>{wallet.symbol}</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: wallet.color }}>{wallet.token}</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', background: 'var(--border)', padding: '2px 6px', borderRadius: '4px' }}>{wallet.network}</span>
                        </div>
                        <button 
                          onClick={() => handleCopyAddress(wallet.address)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: copiedText === wallet.address ? 'var(--harmonic)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <UiIcon name={copiedText === wallet.address ? 'sparkle' : 'gear'} size={12} />
                          {copiedText === wallet.address ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.85rem', 
                        wordBreak: 'break-all', 
                        color: 'var(--text-primary)' 
                      }}>
                        {wallet.address}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeMethod !== 'crypto' && methods.find(m => m.id === activeMethod).details && (
                <div style={{ 
                  background: 'var(--bg-deep)', 
                  padding: '1.5rem', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border)',
                  marginBottom: '2rem',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)'
                }}>
                  {methods.find(m => m.id === activeMethod).details}
                </div>
              )}

              {methods.find(m => m.id === activeMethod).qrUrl && (
                <div style={{ 
                  margin: '0 auto 2rem', 
                  padding: '1rem', 
                  background: '#fff', 
                  borderRadius: 'var(--radius-md)', 
                  width: '200px', 
                  height: '200px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                }}>
                  {/* In a real scenario, you'd put the actual QR image here */}
                  <div style={{ color: '#000', fontSize: '0.7rem', fontWeight: 'bold' }}>
                    [QR CODE PLACEHOLDER]<br/>
                    {methods.find(m => m.id === activeMethod).name}
                  </div>
                </div>
              )}

              {methods.find(m => m.id === activeMethod).link && (
                <a 
                  href={methods.find(m => m.id === activeMethod).link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ display: 'inline-block', width: '100%' }}
                >
                  Go to {methods.find(m => m.id === activeMethod).name}
                </a>
              )}
              
              <button 
                onClick={() => setActiveMethod('info')}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'var(--text-muted)', 
                  marginTop: '1.5rem', 
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}
              >
                ← Back to options
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
