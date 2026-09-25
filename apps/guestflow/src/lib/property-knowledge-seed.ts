export type KnowledgeProperty = 'shared' | 'cottage' | 'main-house'
export type KnowledgeSection =
  | 'local_recommendations'
  | 'amenities'
  | 'house_rules'
  | 'checkin_checkout'
  | 'contact_escalation'

export interface PropertyKnowledgeSeed {
  property: KnowledgeProperty
  section: KnowledgeSection
  key: string
  value: string
  source: string
}

const ASK = 'ask staff'

export const PROPERTY_KNOWLEDGE_SEEDS: PropertyKnowledgeSeed[] = [
  {
    property: 'shared',
    section: 'checkin_checkout',
    key: 'check_in_from',
    value: 'From 14:00',
    source: 'specs/012-guestflow-cottage-falcon-v1/template-source.txt; guest-portal stayPacket.checkIn.from',
  },
  {
    property: 'shared',
    section: 'checkin_checkout',
    key: 'check_out_by',
    value: '10:00',
    source: 'apps/guestflow/src/app/api/guest-portal/[code]/route.ts stayPacket.checkOut.by',
  },
  {
    property: 'shared',
    section: 'house_rules',
    key: 'quiet_hours',
    value: '22:00–07:00',
    source: 'apps/guestflow/src/app/api/guest-portal/[code]/route.ts houseRules',
  },
  {
    property: 'shared',
    section: 'house_rules',
    key: 'no_smoking_inside',
    value: 'No smoking inside the suites',
    source: 'apps/guestflow/src/app/api/guest-portal/[code]/route.ts houseRules',
  },
  {
    property: 'shared',
    section: 'house_rules',
    key: 'respect_property',
    value: 'Please respect the property and fellow guests',
    source: 'apps/guestflow/src/app/api/guest-portal/[code]/route.ts houseRules',
  },
  {
    property: 'shared',
    section: 'house_rules',
    key: 'housekeepers_until',
    value: 'Housekeepers available at 279 Blue Crane Drive until 5 PM',
    source: 'specs/012-guestflow-cottage-falcon-v1/template-source.txt; guest-portal houseRules',
  },
  {
    property: 'shared',
    section: 'house_rules',
    key: 'gate_drive_through',
    value: 'Once the gate has opened please drive through. Do not wait in the gate.',
    source: 'specs/012-guestflow-cottage-falcon-v1/template-source.txt',
  },
  {
    property: 'shared',
    section: 'contact_escalation',
    key: 'guest_email',
    value: 'stay@thebrowns.co.za',
    source: 'apps/guestflow/.env.example PROPERTY_EMAIL / PROPERTY_CONTACT_EMAIL',
  },
  {
    property: 'shared',
    section: 'contact_escalation',
    key: 'ops_whatsapp',
    value: '+27600200825',
    source: 'apps/guestflow/.env.example PROPERTY_OPS_WHATSAPP; constitution IV',
  },
  {
    property: 'shared',
    section: 'contact_escalation',
    key: 'property_label',
    value: 'The Browns Luxury Guest Suites, Dullstroom, South Africa',
    source: 'apps/guestflow/prompts/DRAFT_PROMPT.md; ticket-playbooks BROWNS_KNOWN_FACTS',
  },
  {
    property: 'shared',
    section: 'local_recommendations',
    key: 'restaurants',
    value: ASK,
    source: 'no trusted in-repo list',
  },
  {
    property: 'shared',
    section: 'local_recommendations',
    key: 'activities',
    value: ASK,
    source: 'no trusted in-repo list',
  },
  {
    property: 'shared',
    section: 'local_recommendations',
    key: 'fly_fishing',
    value: ASK,
    source: 'demo fixtures discarded',
  },
  {
    property: 'shared',
    section: 'local_recommendations',
    key: 'shops',
    value: ASK,
    source: 'no trusted in-repo list',
  },
  {
    property: 'shared',
    section: 'local_recommendations',
    key: 'distances',
    value: ASK,
    source: 'demo fixtures discarded',
  },
  {
    property: 'cottage',
    section: 'checkin_checkout',
    key: 'display_name',
    value: "The Browns' Cottage Suites",
    source: 'apps/guestflow/.env.example PROPERTY_NAME_COTTAGE',
  },
  {
    property: 'cottage',
    section: 'checkin_checkout',
    key: 'address',
    value: '278 Blue Crane Drive, Dullstroom',
    source: 'specs/012-guestflow-cottage-falcon-v1/template-source.txt; .env.example PROPERTY_ADDRESS_COTTAGE',
  },
  {
    property: 'cottage',
    section: 'checkin_checkout',
    key: 'maps_url',
    value: 'https://maps.app.goo.gl/m8WeQe56Fd9AKqpa8',
    source: 'specs/012-guestflow-cottage-falcon-v1/template-source.txt; .env.example PROPERTY_MAPS_URL_COTTAGE',
  },
  {
    property: 'cottage',
    section: 'amenities',
    key: 'parking',
    value: 'Park left of the entrance gate or further into the garden on the lawn. Do not obstruct other guests.',
    source: 'specs/012-guestflow-cottage-falcon-v1/template-source.txt; .env.example PROPERTY_PARKING_COTTAGE',
  },
  {
    property: 'cottage',
    section: 'amenities',
    key: 'wifi',
    value: ASK,
    source: 'access-codes SoR only — do not hardcode',
  },
  {
    property: 'cottage',
    section: 'amenities',
    key: 'fireplace_wood',
    value: ASK,
    source: 'no verified in-repo source',
  },
  {
    property: 'cottage',
    section: 'amenities',
    key: 'braai',
    value: ASK,
    source: 'no verified in-repo source',
  },
  {
    property: 'cottage',
    section: 'amenities',
    key: 'heating',
    value: ASK,
    source: 'no verified in-repo source',
  },
  {
    property: 'cottage',
    section: 'amenities',
    key: 'kitchen_items',
    value: ASK,
    source: 'no verified in-repo source',
  },
  {
    property: 'cottage',
    section: 'amenities',
    key: 'towels_linen',
    value: ASK,
    source: 'no verified in-repo source',
  },
  {
    property: 'main-house',
    section: 'checkin_checkout',
    key: 'display_name',
    value: "The Browns' Luxury Suites",
    source: 'apps/guestflow/.env.example PROPERTY_NAME_MAIN',
  },
  {
    property: 'main-house',
    section: 'checkin_checkout',
    key: 'address',
    value: '279 Blue Crane Drive, Dullstroom',
    source: 'apps/guestflow/.env.example PROPERTY_ADDRESS_MAIN',
  },
  {
    property: 'main-house',
    section: 'checkin_checkout',
    key: 'maps_url',
    value: ASK,
    source: 'apps/guestflow/.env.example PROPERTY_MAPS_URL_MAIN empty',
  },
  {
    property: 'main-house',
    section: 'amenities',
    key: 'parking',
    value: ASK,
    source: 'apps/guestflow/.env.example PROPERTY_PARKING_MAIN empty',
  },
  {
    property: 'main-house',
    section: 'amenities',
    key: 'wifi',
    value: ASK,
    source: 'access-codes SoR only — do not hardcode',
  },
  {
    property: 'main-house',
    section: 'amenities',
    key: 'fireplace_wood',
    value: ASK,
    source: 'no verified in-repo source',
  },
  {
    property: 'main-house',
    section: 'amenities',
    key: 'braai',
    value: ASK,
    source: 'no verified in-repo source',
  },
  {
    property: 'main-house',
    section: 'amenities',
    key: 'heating',
    value: ASK,
    source: 'no verified in-repo source',
  },
  {
    property: 'main-house',
    section: 'amenities',
    key: 'kitchen_items',
    value: ASK,
    source: 'no verified in-repo source',
  },
  {
    property: 'main-house',
    section: 'amenities',
    key: 'towels_linen',
    value: ASK,
    source: 'no verified in-repo source',
  },
]
