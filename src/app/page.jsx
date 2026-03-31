'use client'

import { useState } from 'react'
import { Instrument_Serif } from 'next/font/google'
import { MapPin, Globe, Briefcase } from 'lucide-react'
import DragToEditField from './components/DragToEditField'

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
})

const INITIAL = {
  fullName: 'Jordan Reeves',
  username: 'jordanreeves',
  email: 'jordan@meridian.dev',
  location: 'San Francisco, CA',
  website: 'meridian.dev',
  bio: 'Building tools for people who build tools. Obsessed with creative constraints, emergent systems, and coffee that actually tastes like something.',
  jobTitle: 'Principal Engineer',
  company: 'Meridian',
}

function Avatar({ name }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')

  return (
    <div style={{
      width: 80,
      height: 80,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #c8a020 0%, #7a4e10 60%, #3a2008 100%)',
      border: '3px solid #ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.625rem',
      color: '#fdf6e3',
      letterSpacing: '-0.02em',
      flexShrink: 0,
      boxShadow: '0 0 0 1px rgba(146,96,10,0.15), 0 4px 16px rgba(0,0,0,0.12)',
    }}>
      <span className={instrumentSerif.className}>{initials}</span>
    </div>
  )
}

function MetaBadge({ icon: Icon, children }) {
  if (!children) return null
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      fontSize: '12px',
      color: 'var(--text-secondary)',
      fontFamily: 'var(--font-geist-mono, monospace)',
    }}>
      <Icon size={11} strokeWidth={1.5} />
      {children}
    </span>
  )
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(INITIAL)
  const update = (key) => (val) => setProfile(p => ({ ...p, [key]: val }))

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: '4rem 1.25rem 8rem',
    }}>
      <div style={{ width: '100%', maxWidth: '500px' }}>

        {/* ── Card ──────────────────────────────────────────────────────────── */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)',
        }}>

          {/* Identity section */}
          <div style={{ padding: '28px 28px 0' }}>
            <Avatar name={profile.fullName} />

            <div style={{ marginTop: '14px' }}>
              <h1
                className={instrumentSerif.className}
                style={{
                  margin: 0,
                  fontSize: '1.875rem',
                  lineHeight: 1.1,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em',
                }}
              >
                {profile.fullName}
              </h1>
              <p style={{
                margin: '4px 0 0',
                fontSize: '13px',
                fontFamily: 'var(--font-geist-mono, monospace)',
                color: 'var(--text-secondary)',
                letterSpacing: '0.02em',
              }}>
                @{profile.username}
              </p>
            </div>

            {/* Meta badges */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              marginTop: '12px',
              paddingBottom: '20px',
            }}>
              <MetaBadge icon={Briefcase}>
                {profile.jobTitle}{profile.company ? ` · ${profile.company}` : ''}
              </MetaBadge>
              <MetaBadge icon={MapPin}>{profile.location}</MetaBadge>
              <MetaBadge icon={Globe}>{profile.website}</MetaBadge>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--border)', margin: '0 28px' }} />

          {/* Editable fields */}
          <div style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <DragToEditField label="Full Name"  value={profile.fullName}  onSave={update('fullName')} />
            <DragToEditField label="Username"   value={profile.username}  onSave={update('username')} />
            <DragToEditField label="Email"      value={profile.email}     onSave={update('email')}    type="email" />
            <DragToEditField label="Location"   value={profile.location}  onSave={update('location')} />
            <DragToEditField label="Website"    value={profile.website}   onSave={update('website')}  type="url" />
            <DragToEditField label="Bio"        value={profile.bio}       onSave={update('bio')}      multiline />
            <DragToEditField label="Job Title"  value={profile.jobTitle}  onSave={update('jobTitle')} />
            <DragToEditField label="Company"    value={profile.company}   onSave={update('company')} />
          </div>
        </div>

        {/* ── Hint pill ─────────────────────────────────────────────────────── */}
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            background: 'rgba(255,255,255,0.8)',
            border: '1px solid var(--border)',
            borderRadius: '100px',
            backdropFilter: 'blur(12px)',
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--accent)',
              opacity: 0.6,
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: '11px',
              fontFamily: 'var(--font-geist-mono, monospace)',
              color: 'var(--text-secondary)',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
            }}>
              drag <span style={{ color: 'var(--accent)' }}>✏</span> right to edit &nbsp;·&nbsp; left to save &nbsp;·&nbsp; esc to cancel
            </span>
          </div>
        </div>

      </div>
    </main>
  )
}
