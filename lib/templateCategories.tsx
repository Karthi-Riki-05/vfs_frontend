// Shared template category definitions — import from here everywhere

export const TEMPLATE_CATEGORIES = [
  {
    id: 'flowchart',
    label: 'Flowchart',
    category: 'Flowcharts',
    color: '#dcfce7',
    iconColor: '#16a34a',
    icon: (color: string) => (
      <svg viewBox="0 0 40 40" fill="none" style={{width:'100%',height:'100%'}}>
        <rect x="12" y="2" width="16" height="10" rx="2" fill={color}/>
        <polygon points="6,18 20,28 34,18 20,14" fill={color} opacity="0.75"/>
        <rect x="12" y="32" width="16" height="7" rx="2" fill={color} opacity="0.5"/>
        <line x1="20" y1="12" x2="20" y2="14" stroke={color} strokeWidth="2"/>
        <line x1="20" y1="28" x2="20" y2="32" stroke={color} strokeWidth="2"/>
      </svg>
    ),
  },
  {
    id: 'mindmap',
    label: 'Mind Map',
    category: 'Mind Maps',
    color: '#f3e8ff',
    iconColor: '#7c3aed',
    icon: (color: string) => (
      <svg viewBox="0 0 40 40" fill="none" style={{width:'100%',height:'100%'}}>
        <circle cx="20" cy="20" r="5" fill={color}/>
        <circle cx="6"  cy="10" r="3.5" fill={color} opacity="0.65"/>
        <circle cx="6"  cy="30" r="3.5" fill={color} opacity="0.65"/>
        <circle cx="34" cy="10" r="3.5" fill={color} opacity="0.65"/>
        <circle cx="34" cy="30" r="3.5" fill={color} opacity="0.65"/>
        <line x1="15" y1="16" x2="9"  y2="12" stroke={color} strokeWidth="1.8"/>
        <line x1="15" y1="24" x2="9"  y2="28" stroke={color} strokeWidth="1.8"/>
        <line x1="25" y1="16" x2="31" y2="12" stroke={color} strokeWidth="1.8"/>
        <line x1="25" y1="24" x2="31" y2="28" stroke={color} strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    id: 'charts',
    label: 'Charts',
    category: 'Charts',
    color: '#fef3c7',
    iconColor: '#d97706',
    icon: (color: string) => (
      <svg viewBox="0 0 40 40" fill="none" style={{width:'100%',height:'100%'}}>
        <rect x="13" y="2"  width="14" height="9" rx="2" fill={color}/>
        <rect x="2"  y="22" width="12" height="9" rx="2" fill={color} opacity="0.7"/>
        <rect x="14" y="22" width="12" height="9" rx="2" fill={color} opacity="0.7"/>
        <rect x="26" y="22" width="12" height="9" rx="2" fill={color} opacity="0.7"/>
        <line x1="20" y1="11" x2="20" y2="17" stroke={color} strokeWidth="1.8"/>
        <line x1="8"  y1="17" x2="32" y2="17" stroke={color} strokeWidth="1.8"/>
        <line x1="8"  y1="17" x2="8"  y2="22" stroke={color} strokeWidth="1.8"/>
        <line x1="20" y1="17" x2="20" y2="22" stroke={color} strokeWidth="1.8"/>
        <line x1="32" y1="17" x2="32" y2="22" stroke={color} strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    id: 'business',
    label: 'Business',
    category: 'Business',
    color: '#dbeafe',
    iconColor: '#1d4ed8',
    icon: (color: string) => (
      <svg viewBox="0 0 40 40" fill="none" style={{width:'100%',height:'100%'}}>
        <rect x="5" y="14" width="30" height="20" rx="3" fill={color} opacity="0.8"/>
        <path d="M14 14v-3a2 2 0 012-2h8a2 2 0 012 2v3" stroke={color} strokeWidth="2" fill="none"/>
        <line x1="5" y1="23" x2="35" y2="23" stroke={color} strokeWidth="1.8" opacity="0.6"/>
        <rect x="17" y="21" width="6" height="4" rx="1" fill={color}/>
      </svg>
    ),
  },
  {
    id: 'software',
    label: 'Software',
    category: 'Software',
    color: '#fee2e2',
    iconColor: '#dc2626',
    icon: (color: string) => (
      <svg viewBox="0 0 40 40" fill="none" style={{width:'100%',height:'100%'}}>
        <rect x="4" y="8" width="32" height="22" rx="3" fill={color} opacity="0.5"/>
        <rect x="4" y="8" width="32" height="7"  rx="3" fill={color}/>
        <circle cx="10" cy="11.5" r="1.5" fill="white" opacity="0.9"/>
        <circle cx="15" cy="11.5" r="1.5" fill="white" opacity="0.9"/>
        <circle cx="20" cy="11.5" r="1.5" fill="white" opacity="0.9"/>
        <path d="M10 22 L14 26 L10 30" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/>
        <line x1="17" y1="30" x2="26" y2="30" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'wireframe',
    label: 'Wireframe',
    category: 'Wireframes',
    color: '#f1f5f9',
    iconColor: '#475569',
    icon: (color: string) => (
      <svg viewBox="0 0 40 40" fill="none" style={{width:'100%',height:'100%'}}>
        <rect x="3"  y="3"  width="34" height="7"  rx="2" fill={color} opacity="0.5" stroke={color} strokeWidth="1.2"/>
        <rect x="3"  y="13" width="10" height="24" rx="2" fill={color} opacity="0.3" stroke={color} strokeWidth="1.2"/>
        <rect x="16" y="13" width="21" height="10" rx="2" fill={color} opacity="0.4" stroke={color} strokeWidth="1.2"/>
        <rect x="16" y="27" width="21" height="10" rx="2" fill={color} opacity="0.3" stroke={color} strokeWidth="1.2"/>
      </svg>
    ),
  },
];
