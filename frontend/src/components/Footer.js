import React from 'react';
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import { BRANDING } from '../config/branding';

const Footer = () => (
  <footer style={{
    marginTop: '40px', background: 'var(--surface)', borderRadius: '14px', padding: '36px',
    border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
  }}>
    <div className="footer-grid" style={{ display: 'grid', gap: '40px' }}>

      {/* Brand */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <img src="/logo.png" alt={BRANDING.name} style={{ width: '160px', height: 'auto', maxHeight: '56px', objectFit: 'contain' }} />
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.7, maxWidth: '240px' }}>
          Building sustainable energy infrastructure across India with smart solar solutions.
        </p>
      </div>

      {/* Contact */}
      <div>
        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>Contact</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { href: 'mailto:info@probfixora.co.in', Icon: Mail, label: 'info@probfixora.co.in' },
            { href: 'https://wa.me/919278142266', Icon: MessageCircle, label: '+91 92781 42266', ext: true },
            { href: 'tel:+919278142266', Icon: Phone, label: '+91 92781 42266' },
          ].map(({ href, Icon, label, ext }) => (
            <a
              key={href}
              href={href}
              {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'var(--text-3)', fontSize: '13px', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
            >
              <Icon style={{ width: '14px', height: '14px', flexShrink: 0 }} />
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Office */}
      <div>
        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>Office</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <MapPin style={{ width: '14px', height: '14px', color: 'var(--text-4)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>Lucknow Headquarters</p>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.7 }}>
              K1/45 smriti vihar colony<br />
              Ashiyana, Lucknow – 226012 <br />
              Uttar Pradesh
            </p>
          </div>
        </div>
      </div>
    </div>

    <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <p style={{ fontSize: '12px', color: 'var(--text-4)' }}>© {new Date().getFullYear()} {BRANDING.name}. All rights reserved.</p>
      <p style={{ fontSize: '12px', color: 'var(--text-5)' }}>Internal CRM</p>
    </div>
  </footer>
);

export default Footer;
