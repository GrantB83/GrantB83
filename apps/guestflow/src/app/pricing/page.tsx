import Link from 'next/link'
import { Check } from 'lucide-react'

export default function PricingPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-6">
          COMING SOON
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          Simple Pricing for Multi-Property Operators
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          One platform for all your guesthouses. Currently in private beta—join our waitlist 
          to be notified when we launch with early-access pricing.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
        <PricingCard
          name="Starter"
          price="COMING SOON"
          description="Perfect for single-property owners"
          features={[
            'Up to 5 rooms',
            'Inquiry intake & quotes',
            'Guest welcome packs',
            'Daily ops briefs',
            'Email support',
          ]}
          cta="Join Waitlist"
          highlighted={false}
        />
        <PricingCard
          name="Professional"
          price="COMING SOON"
          description="For growing guesthouse operations"
          features={[
            'Up to 15 rooms',
            'Everything in Starter',
            'Multi-property support',
            'OTA rate worksheets',
            'Priority support',
            'Custom rate cards',
          ]}
          cta="Join Waitlist"
          highlighted={true}
        />
        <PricingCard
          name="Enterprise"
          price="Custom"
          description="For hospitality groups"
          features={[
            'Unlimited rooms',
            'Everything in Professional',
            'Dedicated account manager',
            'Custom integrations',
            'SLA guarantees',
            'White-label options',
          ]}
          cta="Contact Sales"
          highlighted={false}
        />
      </div>

      <div className="bg-gray-50 rounded-2xl p-12 mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          What's Included in Every Plan
        </h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <FeatureItem text="No live payments (link your own payment provider)" />
          <FeatureItem text="Draft-only mode with approval gates" />
          <FeatureItem text="Never invents rates or guest data" />
          <FeatureItem text="SQLite or JSON file persistence" />
          <FeatureItem text="NightsBridge CSV compatibility" />
          <FeatureItem text="Self-hosted option available" />
        </div>
      </div>

      <div className="bg-primary-50 border border-primary-200 rounded-xl p-8 mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          Beta Access Program
        </h2>
        <p className="text-gray-700 text-center max-w-2xl mx-auto mb-6">
          We're currently working with select guesthouse owners to refine GuestFlow. 
          Early adopters get lifetime discounts and priority feature requests.
        </p>
        <div className="text-center">
          <Link
            href="/waitlist"
            className="inline-block px-8 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
          >
            Apply for Beta Access
          </Link>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Frequently Asked Questions
        </h2>
        <div className="max-w-3xl mx-auto space-y-6 text-left">
          <FAQItem
            question="When will GuestFlow launch?"
            answer="We're targeting Q1 2027 for public launch. Beta access will begin in late 2026 for waitlist members."
          />
          <FAQItem
            question="Do you charge per booking or per room?"
            answer="Pricing will be based on room count per property, not per booking. This keeps costs predictable during high and low seasons."
          />
          <FAQItem
            question="Can I try GuestFlow before committing?"
            answer="Yes! Our interactive demo is available now, and we'll offer a 30-day trial period when we launch."
          />
          <FAQItem
            question="Do you integrate with my existing systems?"
            answer="We're building integrations for NightsBridge, Google Calendar, and major OTAs. CSV export/import will be available for any system."
          />
          <FAQItem
            question="Is my guest data secure?"
            answer="Yes. All data is encrypted at rest and in transit. We never sell or share guest data. Self-hosted option available for full control."
          />
        </div>
      </div>
    </div>
  )
}

function PricingCard({ 
  name, 
  price, 
  description, 
  features, 
  cta, 
  highlighted 
}: { 
  name: string
  price: string
  description: string
  features: string[]
  cta: string
  highlighted: boolean
}) {
  return (
    <div className={`bg-white rounded-xl p-8 ${highlighted ? 'border-4 border-primary-600 shadow-xl' : 'border-2 border-gray-200'}`}>
      {highlighted && (
        <div className="bg-primary-600 text-white text-sm font-semibold px-3 py-1 rounded-full inline-block mb-4">
          MOST POPULAR
        </div>
      )}
      <h3 className="text-2xl font-bold text-gray-900 mb-2">{name}</h3>
      <div className="text-3xl font-bold text-gray-900 mb-2">
        {price}
      </div>
      <p className="text-gray-600 mb-6">{description}</p>
      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <span className="text-gray-700 text-sm">{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/waitlist"
        className={`block w-full px-6 py-3 rounded-lg font-semibold text-center transition ${
          highlighted
            ? 'bg-primary-600 text-white hover:bg-primary-700'
            : 'bg-white border-2 border-gray-300 text-gray-900 hover:border-primary-600'
        }`}
      >
        {cta}
      </Link>
    </div>
  )
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <Check className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
      <span className="text-gray-700">{text}</span>
    </div>
  )
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="font-semibold text-gray-900 mb-2">{question}</h3>
      <p className="text-gray-600">{answer}</p>
    </div>
  )
}
