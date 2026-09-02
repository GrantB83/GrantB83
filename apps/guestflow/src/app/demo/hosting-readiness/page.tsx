import Link from 'next/link'
import { CheckCircle, AlertTriangle, Server, Globe, Shield, CreditCard, Mail, Zap, ExternalLink } from 'lucide-react'

export default function HostingReadinessPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium mb-4">
          🚀 Phase 6
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Hosting & Deployment Readiness
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Checklist for Grant/CoS before moving GuestFlow from local demo to Origin hosting.
          All hard gates remain in place—no live payments, no auto-send, no public signup.
        </p>
      </div>

      {/* Hard Gates Warning */}
      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-xl font-bold text-red-900 mb-3">Hard Gates (UNCHANGED)</h2>
            <ul className="space-y-2 text-red-800">
              <li className="flex items-start gap-2">
                <span className="font-bold">❌</span>
                <span><strong>NO live payments</strong> — No Stripe, no card charges, no payment processing</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">❌</span>
                <span><strong>NO paid ads</strong> — No Google Ads pixels, no Meta conversion tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">❌</span>
                <span><strong>NO public signup</strong> — Waitlist only, demo auth is NOT production-ready</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">❌</span>
                <span><strong>NO WhatsApp/email auto-send</strong> — All messaging is draft-only with approval banners</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Readiness Checklist */}
      <div className="space-y-6 mb-8">
        <ChecklistSection
          title="Origin Namespace Required"
          icon={<Globe className="w-6 h-6" />}
          status="action-required"
          items={[
            {
              text: 'Create Origin namespace for GuestFlow (e.g., guestflow-demo.origin.cloud)',
              status: 'pending',
              note: 'Grant must request namespace via Origin dashboard or support ticket'
            },
            {
              text: 'Confirm namespace ownership and DNS delegation',
              status: 'pending',
              note: 'Origin provides nameservers to point custom domain'
            },
            {
              text: 'Decide: Use Origin-provided subdomain or custom domain (e.g., demo.guestflow.co.za)',
              status: 'pending',
              note: 'Custom domain requires additional DNS setup'
            }
          ]}
        />

        <ChecklistSection
          title="Deployment Prerequisites"
          icon={<Server className="w-6 h-6" />}
          status="ready"
          items={[
            {
              text: 'Build passes: npm run build',
              status: 'ready',
              note: 'Verified in local development'
            },
            {
              text: 'Lint passes: npm run lint',
              status: 'ready',
              note: 'Next.js ESLint config enforced'
            },
            {
              text: 'Smoke test passes: npm run smoke',
              status: 'ready',
              note: 'Phase 6 smoke script validates all routes and database'
            },
            {
              text: 'Database initialization script: npm run db:init',
              status: 'ready',
              note: 'SQLite schema with sample properties and multi-tenant support'
            },
            {
              text: 'All dependencies in package.json (no local modules)',
              status: 'ready',
              note: 'Self-contained under apps/guestflow/'
            }
          ]}
        />

        <ChecklistSection
          title="Vercel ↔ Origin Integration"
          icon={<Zap className="w-6 h-6" />}
          status="info"
          items={[
            {
              text: 'Vercel is recommended Next.js hosting platform (automatic builds, zero config)',
              status: 'info',
              note: 'Alternative: Self-host on Origin VM with Node.js'
            },
            {
              text: 'If using Vercel: Connect GitHub repo, auto-deploy on push to main',
              status: 'info',
              note: 'Vercel dashboard → Import Project → GrantB83/GrantB83 → apps/guestflow'
            },
            {
              text: 'If using Origin VM: Manual deployment via SSH, pm2 for process management',
              status: 'info',
              note: 'Requires Node.js 18+, pm2, and reverse proxy (nginx/caddy)'
            },
            {
              text: 'Database: SQLite works for demo, consider PostgreSQL for production scale',
              status: 'info',
              note: 'Current SQLite is file-based, fine for low traffic, not horizontally scalable'
            }
          ]}
        />

        <ChecklistSection
          title="Security & Auth"
          icon={<Shield className="w-6 h-6" />}
          status="warning"
          items={[
            {
              text: 'Demo auth stub (password: demo2026) is NOT production-ready',
              status: 'warning',
              note: 'Replace with NextAuth.js + OAuth providers before real operator accounts'
            },
            {
              text: 'No secrets in git (.env.local for local dev only)',
              status: 'ready',
              note: '.gitignore excludes .env.local, *.db, node_modules'
            },
            {
              text: 'HTTPS required (Origin provides TLS certificates automatically)',
              status: 'info',
              note: 'Never serve production app over plain HTTP'
            },
            {
              text: 'Rate limiting and CSRF protection not implemented',
              status: 'warning',
              note: 'Add middleware for production (Next.js middleware + rate-limit-redis)'
            }
          ]}
        />

        <ChecklistSection
          title="Payment & Messaging Gates"
          icon={<CreditCard className="w-6 h-6" />}
          status="blocked"
          items={[
            {
              text: 'NO Stripe keys or payment processing code in app',
              status: 'ready',
              note: 'Pricing page shows COMING SOON, no checkout flow'
            },
            {
              text: 'NO email sending (Resend/Postmark/SendGrid) configured',
              status: 'ready',
              note: 'All drafts are local-only, no SMTP credentials'
            },
            {
              text: 'NO WhatsApp API integration beyond draft generation',
              status: 'ready',
              note: 'PR #2 WhatsApp agent exists but is not connected to GuestFlow'
            },
            {
              text: 'Waitlist submissions stored in SQLite (no email notifications sent)',
              status: 'ready',
              note: 'CRM view only, no automated follow-up sequences'
            }
          ]}
        />

        <ChecklistSection
          title="Public Launch Gates"
          icon={<Mail className="w-6 h-6" />}
          status="blocked"
          items={[
            {
              text: 'NO public launch until Grant approval via Origin dashboard or CoS',
              status: 'blocked',
              note: 'This is a DEMO environment—not ready for public SaaS launch'
            },
            {
              text: 'Origin namespace must be restricted to invite-only or IP whitelist',
              status: 'pending',
              note: 'Origin can limit access to specific email domains or IP ranges'
            },
            {
              text: 'SEO/indexing: Add noindex meta tag until ready for public discovery',
              status: 'pending',
              note: '<meta name="robots" content="noindex,nofollow" /> in layout.tsx'
            },
            {
              text: 'Legal: Terms of Service, Privacy Policy, GDPR/POPIA compliance not implemented',
              status: 'blocked',
              note: 'Required before collecting real operator data beyond waitlist'
            }
          ]}
        />
      </div>

      {/* Deployment Workflow */}
      <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Recommended Deployment Workflow</h2>
        <ol className="space-y-4">
          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Request Origin Namespace</h3>
              <p className="text-gray-600 text-sm">
                Grant submits namespace request via Origin dashboard (e.g., guestflow-demo.origin.cloud).
                Origin team provisions namespace and provides access credentials.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Choose Hosting Platform</h3>
              <p className="text-gray-600 text-sm">
                <strong>Option A (Recommended):</strong> Vercel for automatic builds and serverless deployment.<br/>
                <strong>Option B:</strong> Self-host on Origin VM with pm2 and nginx.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Run Quality Gates</h3>
              <p className="text-gray-600 text-sm">
                Before first deploy: <code className="bg-gray-100 px-2 py-1 rounded text-xs">npm run build && npm run lint && npm run smoke</code>
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              4
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Deploy to Staging</h3>
              <p className="text-gray-600 text-sm">
                Deploy to Origin-provided subdomain first (e.g., guestflow-demo-staging.origin.cloud).
                Grant and CoS test all demo pages and smoke test remotely.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              5
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Production Deploy (Grant Approval Only)</h3>
              <p className="text-gray-600 text-sm">
                After staging validation, Grant approves production deploy to custom domain (if configured).
                Add noindex meta tag until public launch decision is made.
              </p>
            </div>
          </li>
        </ol>
      </div>

      {/* Resources */}
      <div className="bg-gray-50 rounded-xl p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Helpful Resources</h2>
        <div className="space-y-3">
          <ResourceLink
            title="Vercel Documentation"
            url="https://vercel.com/docs"
            description="Deploy Next.js apps with zero configuration"
          />
          <ResourceLink
            title="Next.js Deployment Guide"
            url="https://nextjs.org/docs/deployment"
            description="Self-hosting and platform deployment options"
          />
          <ResourceLink
            title="Origin Platform Docs"
            url="https://docs.origin.cloud"
            description="Namespace management, DNS, and TLS certificates (update URL when available)"
          />
          <ResourceLink
            title="GuestFlow README"
            url="/apps/guestflow/README.md"
            description="Local development setup and quality gates"
          />
        </div>
      </div>

      {/* Back to Demo Hub */}
      <div className="text-center">
        <Link
          href="/demo"
          className="inline-block px-8 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
        >
          ← Back to Demo Hub
        </Link>
      </div>
    </div>
  )
}

function ChecklistSection({ 
  title, 
  icon, 
  status, 
  items 
}: { 
  title: string
  icon: React.ReactNode
  status: 'ready' | 'pending' | 'warning' | 'blocked' | 'info' | 'action-required'
  items: Array<{ text: string; status: 'ready' | 'pending' | 'warning' | 'blocked' | 'info'; note: string }>
}) {
  const statusColors = {
    ready: 'bg-green-50 border-green-200',
    pending: 'bg-yellow-50 border-yellow-200',
    warning: 'bg-orange-50 border-orange-200',
    blocked: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    'action-required': 'bg-purple-50 border-purple-200'
  };

  const statusIcons = {
    ready: '✅',
    pending: '⏳',
    warning: '⚠️',
    blocked: '🚫',
    info: 'ℹ️'
  };

  return (
    <div className={`border-2 rounded-xl p-6 ${statusColors[status]}`}>
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
      </div>
      <ul className="space-y-4">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span className="text-xl flex-shrink-0">{statusIcons[item.status]}</span>
            <div className="flex-1">
              <p className="text-gray-900 font-medium">{item.text}</p>
              <p className="text-sm text-gray-600 mt-1">{item.note}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResourceLink({ title, url, description }: { title: string; url: string; description: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition group"
    >
      <ExternalLink className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5 group-hover:text-primary-700" />
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900 group-hover:text-primary-700">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </a>
  );
}
