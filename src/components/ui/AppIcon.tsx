import React from 'react';
import {
  Home,
  Map,
  PlusCircle,
  Clock,
  User,
  Bell,
  MapPin,
  Camera,
  Upload,
  Download,
  Settings,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Search,
  Trash2,
  Car,
  Lightbulb,
  Droplets,
  TriangleAlert,
  Wrench,
  Building2,
  Snowflake,
  PawPrint,
  Leaf,
  MoreHorizontal,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  LogOut,
  FileText,
  Users,
  BarChart3,
  Layers,
  Shield,
  Navigation,
  Briefcase,
  CircleDot,
  X,
  Check,
  LayoutGrid,
  List,
  Menu,
  Zap,
  Gauge,
  Radio,
  Plus,
  Pencil,
  CircleHelp,
  Sparkles,
  Trophy,
  Flame,
  Timer,
  Mic,
  Square,
  ArrowUp,
  Volume2,
  VolumeX,
  type LucideIcon,
} from 'lucide-react-native';

export type IconName =
  | 'home'
  | 'map'
  | 'plus-circle'
  | 'plus'
  | 'clock'
  | 'user'
  | 'bell'
  | 'map-pin'
  | 'camera'
  | 'upload'
  | 'download'
  | 'settings'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'check-circle'
  | 'alert-triangle'
  | 'search'
  | 'trash'
  | 'car'
  | 'lightbulb'
  | 'droplets'
  | 'triangle-alert'
  | 'wrench'
  | 'building'
  | 'snowflake'
  | 'paw'
  | 'leaf'
  | 'more'
  | 'mail'
  | 'lock'
  | 'phone'
  | 'eye'
  | 'eye-off'
  | 'logout'
  | 'file-text'
  | 'users'
  | 'bar-chart'
  | 'layers'
  | 'shield'
  | 'navigation'
  | 'briefcase'
  | 'circle'
  | 'x'
  | 'check'
  | 'grid'
  | 'list'
  | 'menu'
  | 'zap'
  | 'gauge'
  | 'radio'
  | 'pencil'
  | 'circle-help'
  | 'sparkles'
  | 'trophy'
  | 'flame'
  | 'timer'
  | 'mic'
  | 'square'
  | 'arrow-up'
  | 'volume'
  | 'volume-off';

const ICONS: Record<IconName, LucideIcon> = {
  home: Home,
  map: Map,
  'plus-circle': PlusCircle,
  plus: Plus,
  clock: Clock,
  user: User,
  bell: Bell,
  'map-pin': MapPin,
  camera: Camera,
  upload: Upload,
  download: Download,
  settings: Settings,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  'chevron-down': ChevronDown,
  'check-circle': CheckCircle2,
  'alert-triangle': AlertTriangle,
  search: Search,
  trash: Trash2,
  car: Car,
  lightbulb: Lightbulb,
  droplets: Droplets,
  'triangle-alert': TriangleAlert,
  wrench: Wrench,
  building: Building2,
  snowflake: Snowflake,
  paw: PawPrint,
  leaf: Leaf,
  more: MoreHorizontal,
  mail: Mail,
  lock: Lock,
  phone: Phone,
  eye: Eye,
  'eye-off': EyeOff,
  logout: LogOut,
  'file-text': FileText,
  users: Users,
  'bar-chart': BarChart3,
  layers: Layers,
  shield: Shield,
  navigation: Navigation,
  briefcase: Briefcase,
  circle: CircleDot,
  x: X,
  check: Check,
  grid: LayoutGrid,
  list: List,
  menu: Menu,
  zap: Zap,
  gauge: Gauge,
  radio: Radio,
  pencil: Pencil,
  'circle-help': CircleHelp,
  sparkles: Sparkles,
  trophy: Trophy,
  flame: Flame,
  timer: Timer,
  mic: Mic,
  square: Square,
  'arrow-up': ArrowUp,
  volume: Volume2,
  'volume-off': VolumeX,
};

interface AppIconProps {
  name: IconName;
  size?: 20 | 22 | 24 | 28 | number;
  color?: string;
  strokeWidth?: number;
}

export function AppIcon({
  name,
  size = 24,
  color = '#0F172A',
  strokeWidth = 2,
}: AppIconProps) {
  const Comp = ICONS[name] ?? CircleDot;
  return <Comp size={size} color={color} strokeWidth={strokeWidth} />;
}

export default AppIcon;
